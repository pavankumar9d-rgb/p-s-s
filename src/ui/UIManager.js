/**
 * UIManager.js
 * Controls screen transitions, handles click/touch input events,
 * and updates gameplay statistics, multiplier text, and power-up circles.
 */

import { firebaseMock } from '../game/FirebaseMock.js';
import { CharacterPreview } from '../game/CharacterPreview.js';

// Available skins structure
const SKINS = [
    { id: "neon_bot", name: "PREETHI", rarity: "COMMON", cost: 0, speed: "+1.0x", jump: "Normal", shield: "No Bonus" },
    { id: "synth_raider", name: "RUBY RACER", rarity: "RARE", cost: 2000, speed: "+1.2x", jump: "Normal", shield: "Double Board" },
    { id: "cyber_ninja", name: "OCEAN DASH", rarity: "LEGENDARY", cost: 5000, speed: "+1.5x", jump: "Snappy Jump", shield: "Auto Recharge" }
];

class UIManager {
    constructor(game) {
        this.game = game;
        this.currentSkinIndex = 0;
        this.activeStoreTab = "upgrades";
        this.activeLeaderboardTab = "global";
        
        // Cache DOM elements
        this._bindDOMElements();
        this._setupListeners();
        this._setupInstallPrompt();
        this._initCharacterPreviews();
        this._runSplashLoader();
    }

    _initCharacterPreviews() {
        this.charPreview = new CharacterPreview('char-preview-3d');
        this.homeAvatar = new CharacterPreview('home-avatar-3d', { compact: true });
        window.addEventListener('resize', () => {
            if (this.charPreview) this.charPreview.resize();
            if (this.homeAvatar) this.homeAvatar.resize();
        });
    }

    _setupInstallPrompt() {
        this.deferredInstallPrompt = null;
        const installBtn = document.getElementById('btn-install-app');
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;
            installBtn?.classList.remove('hidden');
        });
        installBtn?.addEventListener('click', async () => {
            if (!this.deferredInstallPrompt) return;
            this.deferredInstallPrompt.prompt();
            await this.deferredInstallPrompt.userChoice;
            this.deferredInstallPrompt = null;
            installBtn.classList.add('hidden');
        });
    }

    _bindDOMElements() {
        // Core menus
        this.screens = {
            splash: document.getElementById("screen-splash"),
            login: document.getElementById("screen-login"),
            home: document.getElementById("screen-home"),
            char: document.getElementById("screen-char-select"),
            hud: document.getElementById("screen-hud"),
            store: document.getElementById("screen-store"),
            missions: document.getElementById("screen-missions"),
            reward: document.getElementById("screen-reward"),
            gameover: document.getElementById("screen-game-over"),
            leaderboard: document.getElementById("screen-leaderboard"),
            settings: document.getElementById("screen-settings"),
            pause: document.getElementById("screen-pause"),
            nameInput: document.getElementById("screen-name-input")
        };
    }

    _runSplashLoader() {
        let pct = 0;
        const bar = document.getElementById("splash-progress-bar");
        const percentText = document.getElementById("splash-loading-percent");
        const loadingText = document.getElementById("splash-loading-text");
        
        const loader = setInterval(() => {
            pct += Math.floor(Math.random() * 8) + 3;
            if (pct >= 100) {
                pct = 100;
                clearInterval(loader);
                bar.style.width = `100%`;
                percentText.innerText = `100%`;
                loadingText.innerText = "GRID SYNAPSE READY";
                
                setTimeout(() => {
                    // Navigate to Auth
                    if (firebaseMock.currentUser) {
                        const profile = firebaseMock.getUserProfile();
                        if (profile && (profile.displayName === "RUNNER_001" || profile.displayName.startsWith("GUEST_") || !profile.displayName)) {
                            this.showScreen("nameInput");
                        } else {
                            this.showScreen("home");
                            this.updateHomeStats();
                        }
                    } else {
                        this.showScreen("login");
                    }
                }, 400);
            } else {
                bar.style.width = `${pct}%`;
                percentText.innerText = `${pct}%`;
                if (pct > 75) loadingText.innerText = "MOUNTING PROCEDURAL SUB-SECTOR...";
                else if (pct > 40) loadingText.innerText = "SYNCHRONIZING GRAVITY DRIVES...";
                else loadingText.innerText = "BOOTING GLOW MATRIX ENGINE...";
            }
        }, 60);
    }

    showScreen(screenId) {
        // Hide all screens
        Object.keys(this.screens).forEach(key => {
            const scr = this.screens[key];
            if (scr) {
                scr.classList.add("hidden");
                scr.classList.remove("active-screen");
                scr.classList.add("hidden-screen");
            }
        });

        // Show targets
        const target = this.screens[screenId];
        if (target) {
            target.classList.remove("hidden");
            target.classList.remove("hidden-screen");
            target.classList.add("active-screen");
        }
    }

    updateHomeStats() {
        const profile = firebaseMock.getUserProfile();
        if (!profile) return;
        
        document.getElementById("home-profile-name").innerText = profile.displayName;
        document.getElementById("home-level-num").innerText = profile.level;
        document.getElementById("home-coins-val").innerText = profile.coins.toLocaleString();
        document.getElementById("home-gems-val").innerText = profile.gems.toLocaleString();
        
        // XP progress (formula: level * 1000)
        const xpNeeded = profile.level * 1000;
        const xpPercent = Math.min(100, (profile.xp / xpNeeded) * 100);
        document.getElementById("home-xp-progress").style.width = `${xpPercent}%`;
        
        // Check if there are unclaimed missions
        this._updateMissionAlertBadge();
    }

    _updateMissionAlertBadge() {
        const profile = firebaseMock.getUserProfile();
        if (!profile) return;
        
        // Simulating checking mission state
        const hasUnclaimed = profile.coins < 2000; // Mock highlight
        const badge = document.getElementById("mission-alert-badge");
        if (badge) {
            badge.style.display = hasUnclaimed ? "block" : "none";
        }
    }

    // LISTENER BINDINGS
    _setupListeners() {
        // Sound toggle local initialization
        this.updateAudioButtonState();

        // 1. Auth Page
        document.getElementById("btn-login-guest").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            firebaseMock.signInAnonymously().then(() => {
                const profile = firebaseMock.getUserProfile();
                if (profile && (profile.displayName === "RUNNER_001" || profile.displayName.startsWith("GUEST_") || !profile.displayName)) {
                    this.showScreen("nameInput");
                } else {
                    this.showScreen("home");
                    this.updateHomeStats();
                }
            });
        });
        
        const oauthBtns = ["btn-login-google", "btn-login-apple"];
        oauthBtns.forEach(id => {
            document.getElementById(id).addEventListener("click", () => {
                this.game.soundManager.playSwipe();
                const provider = id.includes("google") ? "google" : "apple";
                firebaseMock.signInWithOAuth(provider).then(() => {
                    const profile = firebaseMock.getUserProfile();
                    if (profile && (profile.displayName === "RUNNER_001" || profile.displayName.startsWith("GUEST_") || !profile.displayName)) {
                        this.showScreen("nameInput");
                    } else {
                        this.showScreen("home");
                        this.updateHomeStats();
                    }
                });
            });
        });

        // Name input submit button
        const btnSubmitName = document.getElementById("btn-submit-name");
        if (btnSubmitName) {
            btnSubmitName.addEventListener("click", () => {
                const nameInputEl = document.getElementById("input-runner-name");
                const name = nameInputEl.value.trim().toUpperCase();
                if (name.length >= 2) {
                    this.game.soundManager.playSwipe();
                    firebaseMock.updateUserProfile({ displayName: name });
                    this.showScreen("home");
                    this.updateHomeStats();
                } else {
                    alert("RUNNER CODE MUST BE AT LEAST 2 CHARACTERS.");
                }
            });
        }

        // 2. Home Toolbar
        document.getElementById("btn-home-play").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("hud");
            this.game.startRun();
        });

        document.getElementById("btn-home-chars").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("char");
            this.renderCharacterCarousel();
        });

        document.getElementById("btn-home-shop").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("store");
            this.renderStore();
        });

        document.getElementById("btn-home-missions").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("missions");
            this.renderMissionsList();
        });

        document.getElementById("btn-home-leaderboard").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("leaderboard");
            this.renderLeaderboard();
        });

        document.getElementById("btn-home-settings").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("settings");
        });

        // Back Buttons
        const backBtnIds = [
            { btn: "btn-char-back", target: "home" },
            { btn: "btn-store-back", target: "home" },
            { btn: "btn-missions-back", target: "home" },
            { btn: "btn-leaderboard-back", target: "home" },
            { btn: "btn-settings-back", target: "home" }
        ];

        backBtnIds.forEach(map => {
            document.getElementById(map.btn).addEventListener("click", () => {
                this.game.soundManager.playSwipe();
                this.showScreen(map.target);
                this.updateHomeStats();
            });
        });

        // 3. Skins Navigation
        document.getElementById("btn-char-prev").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.currentSkinIndex = (this.currentSkinIndex - 1 + SKINS.length) % SKINS.length;
            this.renderCharacterCarousel();
        });
        document.getElementById("btn-char-next").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.currentSkinIndex = (this.currentSkinIndex + 1) % SKINS.length;
            this.renderCharacterCarousel();
        });

        document.getElementById("btn-char-action").addEventListener("click", () => {
            const skin = SKINS[this.currentSkinIndex];
            const profile = firebaseMock.getUserProfile();
            if (!profile) return;
            
            if (profile.unlockedSkins.includes(skin.id)) {
                // Equip skin
                firebaseMock.equipCharacter(skin.id);
                this.game.soundManager.playSwipe();
                this.renderCharacterCarousel();
            } else {
                // Buy skin
                const success = firebaseMock.unlockCharacter(skin.id, skin.cost);
                if (success) {
                    this.game.soundManager.playCoin();
                    firebaseMock.equipCharacter(skin.id);
                    this.renderCharacterCarousel();
                } else {
                    this.game.soundManager.playCrash(); // buzz error
                }
            }
        });

        // 4. Shop upgrades click handlers
        const upgrades = ["magnet", "jetpack", "shield"];
        upgrades.forEach(type => {
            document.getElementById(`btn-upgrade-${type}`).addEventListener("click", () => {
                const success = firebaseMock.upgradePowerUp(type);
                if (success) {
                    this.game.soundManager.playCoin();
                    this.renderStore();
                } else {
                    this.game.soundManager.playCrash();
                }
            });
        });

        document.getElementById("btn-store-free-coins").addEventListener("click", () => {
            this.game.soundManager.playCoin();
            firebaseMock.addCoins(500);
            this.renderStore();
        });

        // Shop Category Toggles
        document.getElementById("tab-store-upgrades").addEventListener("click", (e) => {
            this.game.soundManager.playSwipe();
            this.activeStoreTab = "upgrades";
            this._toggleStoreTabs();
        });
        document.getElementById("tab-store-currency").addEventListener("click", (e) => {
            this.game.soundManager.playSwipe();
            this.activeStoreTab = "currency";
            this._toggleStoreTabs();
        });

        // 5. Missions Page Actions - Click lists event delegation
        document.getElementById("missions-list-container").addEventListener("click", (e) => {
            if (e.target && e.target.classList.contains("claim-mission-btn")) {
                const missionId = e.target.getAttribute("data-id");
                const reward = parseInt(e.target.getAttribute("data-reward"), 10);
                this.game.soundManager.playCoin();
                firebaseMock.completeMission(missionId, reward);
                this.renderMissionsList();
            }
        });

        // 6. Leaderboard Tab Toggles
        document.getElementById("tab-leaderboard-global").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.activeLeaderboardTab = "global";
            this._toggleLeaderboardTabs();
        });
        document.getElementById("tab-leaderboard-friends").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.activeLeaderboardTab = "friends";
            this._toggleLeaderboardTabs();
        });

        // 7. Settings Actions
        document.getElementById("toggle-audio").addEventListener("click", () => {
            const nextVal = !this.game.soundManager.isEnabled;
            this.game.soundManager.setEnabled(nextVal);
            this.updateAudioButtonState();
            
            if (nextVal) {
                this.game.soundManager.playSwipe();
            }
        });

        // Quality toggles
        const qualityModes = ["low", "med", "high"];
        qualityModes.forEach(mode => {
            document.getElementById(`btn-quality-${mode}`).addEventListener("click", () => {
                this.game.soundManager.playSwipe();
                this.game.setGraphicsQuality(mode);
                this.updateQualityButtons(mode);
            });
        });

        document.getElementById("btn-settings-reset").addEventListener("click", () => {
            this.game.soundManager.playCrash();
            const consent = confirm("FORMAT SYSTEM DATABASE?\nAll coins, skins and progression score vectors will be purged.");
            if (consent) {
                localStorage.clear();
                location.reload();
            }
        });

        // 8. HUD & Pause modals
        document.getElementById("btn-hud-pause").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.screens.pause.classList.remove("hidden");
            this.game.pauseRun();
        });

        document.getElementById("btn-pause-resume").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.screens.pause.classList.add("hidden");
            this.game.resumeRun();
        });

        document.getElementById("btn-pause-restart").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.screens.pause.classList.add("hidden");
            this.showScreen("hud");
            this.game.startRun();
        });

        document.getElementById("btn-pause-home").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.screens.pause.classList.add("hidden");
            this.showScreen("home");
            this.game.exitRunToMenu();
        });

        // 9. Reward chest decrypt reveals
        document.getElementById("reward-chest-icon").addEventListener("click", (e) => {
            // Animates click
            e.target.style.transform = "scale(0.8) rotate(15deg)";
            setTimeout(() => {
                e.target.style.transform = "scale(1.2) rotate(-15deg)";
                this.game.soundManager.playShieldHit();
                
                setTimeout(() => {
                    e.target.style.display = "none";
                    document.getElementById("reward-instruction").style.display = "none";
                    
                    // Reveal reward
                    const rewardType = Math.random() > 0.4 ? "coins" : "gems";
                    const amount = rewardType === "coins" ? 250 : 2;
                    
                    const revealAmt = document.getElementById("reward-reveal-amount");
                    const revealIcon = document.getElementById("reward-reveal-icon");
                    const revealName = document.getElementById("reward-reveal-name");
                    
                    revealAmt.innerText = `+${amount}`;
                    revealName.innerText = rewardType === "coins" ? "ENERGY COINS" : "CORE GEMS";
                    revealIcon.innerText = rewardType === "coins" ? "toll" : "diamond";
                    
                    // Award
                    if (rewardType === "coins") firebaseMock.addCoins(amount);
                    else firebaseMock.addGems(amount);
                    
                    document.getElementById("reward-reveal-container").classList.remove("hidden");
                }, 200);
            }, 100);
        });

        document.getElementById("btn-reward-confirm").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("home");
            this.updateHomeStats();
            
            // Re-render chest for next time
            document.getElementById("reward-chest-icon").style.display = "block";
            document.getElementById("reward-instruction").style.display = "block";
            document.getElementById("reward-reveal-container").classList.add("hidden");
        });

        // 10. Game Over actions
        document.getElementById("btn-gameover-ad").addEventListener("click", (e) => {
            e.target.disabled = true;
            e.target.innerText = "DECRYPTING SIMULATED STREAM (3s)...";
            this.game.soundManager.playSwipe();
            
            setTimeout(() => {
                // Double rewards
                const coinsEarned = this.game.coinsCollected;
                firebaseMock.addCoins(coinsEarned); // add once more
                
                e.target.innerText = "STREAM COMPLETE - REWARDS DOUBLED!";
                this.game.soundManager.playCoin();
                
                // Refresh game over counters
                document.getElementById("gameover-coins-val").innerText = (coinsEarned * 2).toLocaleString();
            }, 3000);
        });

        document.getElementById("btn-gameover-home").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("home");
            this.updateHomeStats();
        });

        document.getElementById("btn-gameover-retry").addEventListener("click", () => {
            this.game.soundManager.playSwipe();
            this.showScreen("hud");
            this.game.startRun();
        });
    }

    // AUDIO SWITCHER UI TOGGLER
    updateAudioButtonState() {
        const toggle = document.getElementById("toggle-audio");
        const knob = document.getElementById("audio-toggle-knob");
        if (this.game.soundManager.isEnabled) {
            toggle.classList.remove("bg-neutral-600");
            toggle.classList.add("bg-primary");
            knob.style.transform = "translateX(24px)";
        } else {
            toggle.classList.remove("bg-primary");
            toggle.classList.add("bg-neutral-600");
            knob.style.transform = "translateX(0px)";
        }
    }

    updateQualityButtons(currentMode) {
        const qualityModes = ["low", "med", "high"];
        qualityModes.forEach(mode => {
            const btn = document.getElementById(`btn-quality-${mode}`);
            if (mode === currentMode) {
                btn.className = "py-2 border border-primary/20 rounded-xl text-xs font-bold uppercase transition-all bg-primary/10 text-primary";
            } else {
                btn.className = "py-2 border border-outline-variant/40 rounded-xl text-xs font-bold uppercase transition-all bg-surface-container-high text-on-surface-variant";
            }
        });
    }

    // SKINS PANEL CAROUSEL RENDERING
    renderCharacterCarousel() {
        const skin = SKINS[this.currentSkinIndex];
        const profile = firebaseMock.getUserProfile();
        if (!profile) return;

        // Render fields
        document.getElementById("char-name").innerText = skin.name;
        
        const rarityBadge = document.getElementById("char-rarity");
        rarityBadge.innerText = skin.rarity;
        if (skin.rarity === "COMMON") rarityBadge.className = "text-[9px] bg-neutral-600/30 border border-neutral-400/40 text-neutral-300 px-2 rounded-full font-bold tracking-wider mb-2";
        else if (skin.rarity === "RARE") rarityBadge.className = "text-[9px] bg-secondary-container/20 border border-secondary/40 text-secondary px-2 rounded-full font-bold tracking-wider mb-2";
        else rarityBadge.className = "text-[9px] bg-primary/20 border border-primary-container/40 text-primary px-2 rounded-full font-bold tracking-wider mb-2";

        document.getElementById("char-stat-speed").innerText = skin.speed;
        document.getElementById("char-stat-jump").innerText = skin.jump;
        document.getElementById("char-stat-shield").innerText = skin.shield;

        const actionBtn = document.getElementById("btn-char-action");
        
        if (profile.equippedSkin === skin.id) {
            actionBtn.innerText = "EQUIPPED";
            actionBtn.disabled = true;
            actionBtn.className = "w-full h-12 rounded-xl bg-neutral-800 text-neutral-400 font-bold text-md tracking-wider border border-neutral-700";
        } else if (profile.unlockedSkins.includes(skin.id)) {
            actionBtn.innerText = "EQUIP RUNNER";
            actionBtn.disabled = false;
            actionBtn.className = "w-full h-12 rounded-xl bg-gradient-to-r from-primary-container to-secondary text-on-primary font-bold text-md tracking-wider transition-all active:scale-95 shadow-[0_0_15px_rgba(0,219,233,0.3)]";
        } else {
            actionBtn.innerText = `UNLOCK FOR ${skin.cost.toLocaleString()} COINS`;
            actionBtn.disabled = false;
            
            // Check if player can afford it
            const canAfford = profile.coins >= skin.cost;
            if (canAfford) {
                actionBtn.className = "w-full h-12 rounded-xl bg-gradient-to-r from-primary-container to-secondary text-on-primary font-bold text-md tracking-wider transition-all active:scale-95 shadow-[0_0_15px_rgba(0,219,233,0.3)]";
            } else {
                actionBtn.className = "w-full h-12 rounded-xl bg-neutral-900 text-neutral-600 font-bold text-md tracking-wider border border-neutral-800 cursor-not-allowed";
            }
        }

        // Inform the 3D player mesh to re-build textures if needed
        this.game.updatePlayerModelSkin(skin.id);
    }

    // STORE UPGRADES RENDERING
    renderStore() {
        const profile = firebaseMock.getUserProfile();
        if (!profile) return;

        document.getElementById("store-coins-val").innerText = profile.coins.toLocaleString();
        
        const upgrades = ["magnet", "jetpack", "shield"];
        upgrades.forEach(type => {
            const level = profile.upgrades[type] || 1;
            const btn = document.getElementById(`btn-upgrade-${type}`);
            const pips = document.getElementById(`store-upgrade-${type}-pips`);
            const costLabel = document.getElementById(`cost-upgrade-${type}`);

            // Draw upgrade pips
            pips.innerHTML = "";
            for (let i = 1; i <= 5; i++) {
                const pip = document.createElement("div");
                pip.className = `w-3 h-1.5 rounded-full ${i <= level ? this._getThemeColorClass(type) : "bg-surface-container-high"}`;
                pips.appendChild(pip);
            }

            if (level >= 5) {
                btn.disabled = true;
                btn.innerText = "MAX LEVEL";
                btn.className = "px-3 py-2 bg-neutral-800 text-neutral-500 rounded-xl font-bold text-xs border border-neutral-700";
            } else {
                const cost = Math.pow(2, level - 1) * 500;
                costLabel.innerText = cost;
                
                const canUpgrade = profile.coins >= cost;
                btn.disabled = !canUpgrade;
                
                const btnColor = this._getThemeColorClass(type, true);
                if (canUpgrade) {
                    btn.className = `px-3 py-2 ${btnColor} rounded-xl font-bold text-xs flex flex-col items-center justify-center border border-white/20 active:scale-95 transition-all`;
                } else {
                    btn.className = `px-3 py-2 bg-neutral-900 text-neutral-600 rounded-xl font-bold text-xs flex flex-col items-center justify-center border border-neutral-800 opacity-60 cursor-not-allowed`;
                }
            }
        });
    }

    _getThemeColorClass(type, isButton = false) {
        if (type === "magnet") return isButton ? "bg-secondary text-on-secondary hover:bg-secondary-container" : "bg-secondary";
        if (type === "jetpack") return isButton ? "bg-primary text-on-primary hover:bg-primary-container" : "bg-primary";
        return isButton ? "bg-tertiary text-on-tertiary hover:bg-tertiary-container" : "bg-tertiary-fixed-dim";
    }

    _toggleStoreTabs() {
        const isUpgrades = this.activeStoreTab === "upgrades";
        const tabUpgrades = document.getElementById("tab-store-upgrades");
        const tabCurrency = document.getElementById("tab-store-currency");
        const listContainer = document.getElementById("store-items-container");

        if (isUpgrades) {
            tabUpgrades.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-primary text-primary tracking-wider transition-all";
            tabCurrency.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-transparent text-on-surface-variant tracking-wider transition-all";
            this.renderStore();
        } else {
            tabUpgrades.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-transparent text-on-surface-variant tracking-wider transition-all";
            tabCurrency.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-secondary text-secondary tracking-wider transition-all";
            
            // Render currency cards
            listContainer.innerHTML = `
                <div class="bg-surface-container-low/70 border border-outline-variant/40 rounded-2xl p-4 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-secondary text-4xl" style="font-variation-settings: 'FILL' 1;">toll</span>
                        <div>
                            <div class="font-bold text-sm text-on-surface">ENERGY RECHARGE PACK</div>
                            <div class="text-xs text-on-surface-variant mt-0.5">Grants +2,000 Energy Credits</div>
                        </div>
                    </div>
                    <button class="px-4 py-2 bg-secondary hover:bg-secondary-container text-on-secondary font-bold text-xs rounded-xl active:scale-95 buy-currency-btn" data-type="coins" data-amount="2000">CLAIM</button>
                </div>
                <div class="bg-surface-container-low/70 border border-outline-variant/40 rounded-2xl p-4 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-primary text-4xl" style="font-variation-settings: 'FILL' 1;">diamond</span>
                        <div>
                            <div class="font-bold text-sm text-on-surface">CORE DATA GEM CLIP</div>
                            <div class="text-xs text-on-surface-variant mt-0.5">Grants +20 Core Crystals</div>
                        </div>
                    </div>
                    <button class="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-xl active:scale-95 buy-currency-btn" data-type="gems" data-amount="20">CLAIM</button>
                </div>
            `;

            // Bind claim click listener dynamically
            const buyButtons = listContainer.querySelectorAll(".buy-currency-btn");
            buyButtons.forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const type = e.target.getAttribute("data-type");
                    const amount = parseInt(e.target.getAttribute("data-amount"), 10);
                    this.game.soundManager.playCoin();
                    if (type === "coins") firebaseMock.addCoins(amount);
                    else firebaseMock.addGems(amount);
                    
                    document.getElementById("store-coins-val").innerText = firebaseMock.getUserProfile().coins.toLocaleString();
                });
            });
        }
    }

    // MISSIONS RENDER
    renderMissionsList() {
        const profile = firebaseMock.getUserProfile();
        if (!profile) return;
        
        const container = document.getElementById("missions-list-container");
        container.innerHTML = "";
        
        // Define static missions
        const missions = [
            { id: "m1", text: "Run 1,500 meters in a single run", target: 1500, value: profile.bestDistance, reward: 300 },
            { id: "m2", text: "Collect 100 credits in a single run", target: 100, value: this.game.coinsCollected || 0, reward: 150 },
            { id: "m3", text: "Earn a high score above 50,000", target: 50000, value: profile.highScore, reward: 500 }
        ];

        missions.forEach(m => {
            const completed = m.value >= m.target;
            const claimed = profile.completedMissions.includes(m.id);
            const progressPercent = Math.min(100, (m.value / m.target) * 100);

            const card = document.createElement("div");
            card.className = "bg-surface-container-low/75 border border-outline-variant/30 rounded-2xl p-4 flex flex-col gap-3 shadow-md";
            
            let btnHTML = "";
            if (claimed) {
                btnHTML = `<span class="text-xs text-on-surface-variant font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-sm text-green-400">check_circle</span> CLAIMED</span>`;
            } else if (completed) {
                btnHTML = `<button class="claim-mission-btn px-4 py-2 bg-gradient-to-r from-secondary-container to-secondary text-white font-bold text-xs rounded-xl active:scale-95" data-id="${m.id}" data-reward="${m.reward}">CLAIM ${m.reward}c</button>`;
            } else {
                btnHTML = `<span class="text-xs text-on-surface-variant font-medium">${Math.floor(m.value)} / ${m.target}</span>`;
            }

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-sm text-on-surface">${m.text}</h4>
                        <div class="text-[10px] text-secondary mt-1">Reward: +${m.reward} Credits</div>
                    </div>
                    <div>${btnHTML}</div>
                </div>
                <div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div class="h-full bg-primary-container" style="width: ${progressPercent}%"></div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // LEADERBOARD RENDER
    renderLeaderboard() {
        const board = firebaseMock.getLeaderboard();
        const container = document.getElementById("leaderboard-list-container");
        container.innerHTML = "";

        const isGlobal = this.activeLeaderboardTab === "global";
        
        // Mock friends leaderboard
        let entries = board;
        if (!isGlobal) {
            entries = [
                { name: "YOU", score: firebaseMock.userData ? firebaseMock.userData.highScore : 0 },
                { name: "PULSE_RIDER", score: 98000 },
                { name: "REPLICANT_4", score: 32000 }
            ].sort((a,b) => b.score - a.score);
        }

        entries.forEach((entry, idx) => {
            const row = document.createElement("div");
            row.className = `flex justify-between items-center p-3 rounded-xl border ${entry.name === "YOU" || entry.name === (firebaseMock.userData && firebaseMock.userData.displayName) ? "bg-primary/10 border-primary/30" : "bg-surface-container-low/80 border-outline-variant/10"}`;
            
            // Rank crown highlights
            let rankBadge = "";
            if (idx === 0) rankBadge = `<span class="material-symbols-outlined text-secondary text-lg">workspace_premium</span>`;
            else rankBadge = `<span class="font-bold text-sm text-on-surface-variant w-5 block text-center">${idx + 1}</span>`;

            row.innerHTML = `
                <div class="flex items-center gap-3">
                    ${rankBadge}
                    <span class="font-bold text-sm tracking-wide">${entry.name}</span>
                </div>
                <span class="font-display-lg text-sm text-primary italic font-bold tracking-tighter">${entry.score.toLocaleString()}</span>
            `;
            container.appendChild(row);
        });
    }

    _toggleLeaderboardTabs() {
        const isGlobal = this.activeLeaderboardTab === "global";
        const tabGlobal = document.getElementById("tab-leaderboard-global");
        const tabFriends = document.getElementById("tab-leaderboard-friends");

        if (isGlobal) {
            tabGlobal.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-primary text-primary tracking-wider transition-all";
            tabFriends.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-transparent text-on-surface-variant tracking-wider transition-all";
        } else {
            tabGlobal.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-transparent text-on-surface-variant tracking-wider transition-all";
            tabFriends.className = "flex-1 text-center py-2 font-bold text-sm border-b-2 border-secondary text-secondary tracking-wider transition-all";
        }
        this.renderLeaderboard();
    }

    // GAMEPLAY HUD STATS REFRESH
    updateHUDScores(score, distance, multiplier, coins) {
        document.getElementById("hud-score-val").innerText = Math.floor(score).toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: true });
        document.getElementById("hud-distance-val").innerText = `${Math.floor(distance)}m`;
        document.getElementById("hud-multiplier-val").innerText = `x${multiplier}`;
        document.getElementById("hud-coins-val").innerText = coins;
    }

    // CIRCULAR TIMER RENDER
    updateHUDPowerUpTimer(type, remainingSecs, totalSecs) {
        const wrapper = document.getElementById(`hud-powerup-${type}`);
        if (!wrapper) return;
        
        if (remainingSecs <= 0) {
            wrapper.classList.add("hidden");
        } else {
            wrapper.classList.remove("hidden");
            const timerEl = document.getElementById(`hud-${type}-timer`);
            if (timerEl) timerEl.innerText = `${Math.ceil(remainingSecs)}s`;
            
            // Circular stroke progress (dasharray = 264)
            const circle = document.getElementById(`hud-${type}-progress`);
            if (circle) {
                const ratio = remainingSecs / totalSecs;
                const offset = 264 * (1 - ratio);
                circle.style.strokeDashoffset = offset;
            }
        }
    }

    // GAME OVER DETAILS POPULATING
    triggerGameOverDisplay(score, distance, coins, best) {
        document.getElementById("gameover-score-val").innerText = Math.floor(score).toLocaleString();
        document.getElementById("gameover-distance-val").innerText = `${Math.floor(distance)}m`;
        document.getElementById("gameover-coins-val").innerText = coins.toLocaleString();
        document.getElementById("gameover-best-val").innerText = Math.floor(best).toLocaleString();
        
        // Re-enable ad button
        const adBtn = document.getElementById("btn-gameover-ad");
        adBtn.disabled = false;
        adBtn.innerText = "DOUBLE REWARDS (SIMULATED AD)";

        this.showScreen("gameover");
    }
}

export { UIManager };
export default UIManager;
