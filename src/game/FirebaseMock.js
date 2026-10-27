/**
 * FirebaseMock.js
 * Emulates official Firebase Authentication, Firestore Database, Analytics, and Remote Config
 * using browser LocalStorage. Keeps user states, coin count, upgrades, scores, and unlocks persistent.
 */

const STORAGE_KEYS = {
    USER_AUTH: "neon_velocity_auth",
    USER_DATA: "neon_velocity_userdata",
    LEADERBOARD: "neon_velocity_leaderboard",
    CONFIG: "neon_velocity_remoteconfig"
};

const DEFAULT_USER_DATA = {
    uid: null,
    displayName: "RUNNER_001",
    coins: 1000,          // generous starting coins for testing
    gems: 10,
    highScore: 0,
    bestDistance: 0,
    level: 1,
    xp: 0,
    unlockedSkins: ["neon_bot"],
    equippedSkin: "neon_bot",
    upgrades: {
        magnet: 1,   // level 1-5
        jetpack: 1,  // level 1-5
        shield: 1    // level 1-5
    },
    completedMissions: [],
    lastDailyRewardTime: 0,
    loginStreak: 0
};

// Initial mock remote configs
const DEFAULT_REMOTE_CONFIG = {
    base_speed: 15.0,
    speed_ramp: 0.1,
    coin_multiplier: 1.0,
    xp_distance_factor: 0.1, // XP gained per meter run
    xp_coin_factor: 2.0      // XP gained per coin collected
};

// Seed standard leaderboard data if empty
const DEFAULT_LEADERBOARD = [
    { name: "CYBER_NINJA", score: 250000 },
    { name: "SYNTH_WAVER", score: 180000 },
    { name: "LIGHT_RUNNER", score: 140000 },
    { name: "GLITCH_99", score: 95000 },
    { name: "DREAD_LOG", score: 45000 }
];

class FirebaseMock {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.config = DEFAULT_REMOTE_CONFIG;
        this._initStorage();
    }

    _initStorage() {
        // Init remote configs
        if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_REMOTE_CONFIG));
        } else {
            this.config = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG));
        }

        // Init Leaderboard
        if (!localStorage.getItem(STORAGE_KEYS.LEADERBOARD)) {
            localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(DEFAULT_LEADERBOARD));
        }

        // Check active session
        const activeSession = localStorage.getItem(STORAGE_KEYS.USER_AUTH);
        if (activeSession) {
            this.currentUser = JSON.parse(activeSession);
            this._loadUserData(this.currentUser.uid);
        }
    }

    _loadUserData(uid) {
        let storedData = localStorage.getItem(`${STORAGE_KEYS.USER_DATA}_${uid}`);
        if (!storedData) {
            // Create new record
            this.userData = { ...DEFAULT_USER_DATA, uid: uid };
            // Assign custom name for guest
            if (uid.startsWith("guest_")) {
                this.userData.displayName = `GUEST_${uid.substring(6, 10).toUpperCase()}`;
            }
            this._saveUserData();
        } else {
            this.userData = JSON.parse(storedData);
        }
    }

    _saveUserData() {
        if (this.currentUser && this.userData) {
            localStorage.setItem(`${STORAGE_KEYS.USER_DATA}_${this.currentUser.uid}`, JSON.stringify(this.userData));
            
            // Auto update leaderboard if score beats personal best
            this.updateLeaderboard(this.userData.displayName, this.userData.highScore);
        }
    }

    // AUTH ACTIONS
    signInAnonymously() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const uid = `guest_${Math.random().toString(36).substring(2, 9)}`;
                this.currentUser = { uid: uid, isAnonymous: true };
                localStorage.setItem(STORAGE_KEYS.USER_AUTH, JSON.stringify(this.currentUser));
                this._loadUserData(uid);
                resolve({ user: this.currentUser });
            }, 300);
        });
    }

    signInWithOAuth(provider) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const uid = `${provider}_${Math.random().toString(36).substring(2, 9)}`;
                const names = {
                    google: ["CyberPunk_G", "NeonRacer_G", "VaporGamer"],
                    apple: ["AppRunner", "iOS_Gridder", "AppleSurfer"]
                };
                const nameArray = names[provider] || ["Runner"];
                const displayName = nameArray[Math.floor(Math.random() * nameArray.length)];

                this.currentUser = { uid: uid, displayName: displayName, isAnonymous: false };
                localStorage.setItem(STORAGE_KEYS.USER_AUTH, JSON.stringify(this.currentUser));
                
                this._loadUserData(uid);
                this.userData.displayName = displayName;
                this._saveUserData();
                
                resolve({ user: this.currentUser });
            }, 500);
        });
    }

    signOut() {
        this.currentUser = null;
        this.userData = null;
        localStorage.removeItem(STORAGE_KEYS.USER_AUTH);
        return Promise.resolve();
    }

    // FIRESTORE SIMULATED QUERIES
    getUserProfile() {
        return this.userData ? { ...this.userData } : null;
    }

    updateUserProfile(updates) {
        if (!this.userData) return;
        this.userData = { ...this.userData, ...updates };
        this._saveUserData();
    }

    addCoins(amount) {
        if (!this.userData) return;
        this.userData.coins += amount;
        this._saveUserData();
    }

    addGems(amount) {
        if (!this.userData) return;
        this.userData.gems += amount;
        this._saveUserData();
    }

    deductCoins(amount) {
        if (!this.userData || this.userData.coins < amount) return false;
        this.userData.coins -= amount;
        this._saveUserData();
        return true;
    }

    deductGems(amount) {
        if (!this.userData || this.userData.gems < amount) return false;
        this.userData.gems -= amount;
        this._saveUserData();
        return true;
    }

    saveRunStats(score, distance, coinsEarned) {
        if (!this.userData) return;
        
        let newHighScore = false;
        if (score > this.userData.highScore) {
            this.userData.highScore = score;
            newHighScore = true;
        }

        if (distance > this.userData.bestDistance) {
            this.userData.bestDistance = distance;
        }

        // Add coins
        this.userData.coins += coinsEarned;

        // XP accumulation: score base + distance * multiplier
        const xpGained = Math.floor(distance * this.config.xp_distance_factor + coinsEarned * this.config.xp_coin_factor);
        this.addXP(xpGained);

        this._saveUserData();
        return {
            newHighScore,
            xpGained,
            totalLevel: this.userData.level
        };
    }

    addXP(amount) {
        if (!this.userData) return;
        this.userData.xp += amount;
        
        // XP Formula: level * 1000
        let xpNeeded = this.userData.level * 1000;
        while (this.userData.xp >= xpNeeded) {
            this.userData.xp -= xpNeeded;
            this.userData.level += 1;
            xpNeeded = this.userData.level * 1000;
            console.log(`Congratulations! Leveled up to ${this.userData.level}`);
        }
    }

    upgradePowerUp(type) {
        if (!this.userData) return false;
        const currentLevel = this.userData.upgrades[type] || 1;
        if (currentLevel >= 5) return false; // Max level 5

        // Costs: Level 1->2 (500), 2->3 (1000), 3->4 (2000), 4->5 (4000)
        const cost = Math.pow(2, currentLevel - 1) * 500;
        if (this.deductCoins(cost)) {
            this.userData.upgrades[type] += 1;
            this._saveUserData();
            return true;
        }
        return false;
    }

    unlockCharacter(skinId, costCoins, costGems = 0) {
        if (!this.userData) return false;
        if (this.userData.unlockedSkins.includes(skinId)) return true;

        if (costGems > 0) {
            if (this.deductGems(costGems)) {
                this.userData.unlockedSkins.push(skinId);
                this._saveUserData();
                return true;
            }
        } else {
            if (this.deductCoins(costCoins)) {
                this.userData.unlockedSkins.push(skinId);
                this._saveUserData();
                return true;
            }
        }
        return false;
    }

    equipCharacter(skinId) {
        if (!this.userData) return false;
        if (!this.userData.unlockedSkins.includes(skinId)) return false;
        this.userData.equippedSkin = skinId;
        this._saveUserData();
        return true;
    }

    completeMission(missionId, coinReward) {
        if (!this.userData) return;
        if (!this.userData.completedMissions.includes(missionId)) {
            this.userData.completedMissions.push(missionId);
            this.userData.coins += coinReward;
            this._saveUserData();
        }
    }

    // LEADERBOARD READ / WRITE
    getLeaderboard() {
        const board = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEADERBOARD)) || DEFAULT_LEADERBOARD;
        // Sort descending
        return board.sort((a, b) => b.score - a.score);
    }

    updateLeaderboard(name, score) {
        if (score <= 0) return;
        let board = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEADERBOARD)) || DEFAULT_LEADERBOARD;
        
        // Check if player already on leaderboard
        const idx = board.findIndex(entry => entry.name === name);
        if (idx !== -1) {
            if (score > board[idx].score) {
                board[idx].score = score;
            }
        } else {
            board.push({ name, score });
        }
        
        // Sort & Keep top 10
        board.sort((a, b) => b.score - a.score);
        board = board.slice(0, 10);
        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(board));
    }

    // ANALYTICS EVENTS
    logAnalyticsEvent(eventName, params = {}) {
        console.log(`[Firebase Analytics] Event: ${eventName}`, params);
    }

    // REMOTE CONFIG
    getRemoteConfigValue(key) {
        return this.config[key] !== undefined ? this.config[key] : null;
    }
}

export const firebaseMock = new FirebaseMock();
export default firebaseMock;
