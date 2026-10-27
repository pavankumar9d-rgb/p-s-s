/**
 * SaveData.js - LocalStorage persistence for City Dash
 */

export const SaveData = {
  _key: 'citydash_v2',

  defaults() {
    return {
      displayName: 'PREETHI',
      coins: 0,
      gems: 0,
      level: 1,
      xp: 0,
      highScore: 0,
      bestDistance: 0,
      totalCoinsEver: 0,
      totalRuns: 0,
      upgrades: { magnet: 1, jetpack: 1, board: 1, x2: 1 },
      completedMissions: [],
      lastDailyReward: 0,
      dailyStreak: 0,
      sfxEnabled: true,
      musicEnabled: true,
      quality: 'med',
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (!raw) return this.defaults();
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.displayName === 'PRIYA' || !parsed.displayName)) {
        parsed.displayName = 'PREETHI';
        localStorage.setItem(this._key, JSON.stringify(parsed));
      }
      return Object.assign(this.defaults(), parsed);
    } catch { return this.defaults(); }
  },

  save(data) {
    try { localStorage.setItem(this._key, JSON.stringify(data)); } catch {}
  },

  reset() {
    localStorage.removeItem(this._key);
    return this.defaults();
  }
};

export const Leaderboard = {
  _key: 'citydash_lb_v2',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch { return []; }
  },
  submit(name, score) {
    const all = this.getAll();
    all.push({ name, score, ts: Date.now() });
    all.sort((a, b) => b.score - a.score);
    const top = all.slice(0, 20);
    try { localStorage.setItem(this._key, JSON.stringify(top)); } catch {}
    return top;
  },
  getFormatted(playerName) {
    const all = this.getAll();
    // Inject some mock rivals
    const mocks = [
      { name: 'SPEEDSTER', score: 88500 },
      { name: 'DASH_QUEEN', score: 72000 },
      { name: 'RUNNERX', score: 65400 },
      { name: 'BOLT_99', score: 53200 },
      { name: 'CITY_CAT', score: 41800 },
    ];
    const merged = [...all, ...mocks].sort((a,b) => b.score - a.score).slice(0,15);
    return merged;
  }
};
