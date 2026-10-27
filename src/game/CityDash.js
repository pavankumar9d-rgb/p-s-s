/**
 * CityDash.js — Complete Canvas 2D Endless Runner Engine
 * Subway Surfers-inspired, using provided background images and character from 1.jpeg
 */

import { SaveData, Leaderboard } from './SaveData.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LANES       = [-110, 0, 110];   // x offsets from center (canvas units)
const LANE_COUNT  = 3;
const GROUND_Y    = 0.72;             // fraction of canvas height
const GRAVITY     = 2800;
const JUMP_VEL    = -920;
const BASE_SPEED  = 420;
const MAX_SPEED   = 1050;
const SPEED_RAMP  = 0.014;

const PU_TYPES    = ['magnet','jetpack','board','x2'];
const PU_BASE_DUR = { magnet: 8, jetpack: 7, board: 12, x2: 10 };
const PU_COLORS   = { magnet:'#4fc3f7', jetpack:'#ffb74d', board:'#ce93d8', x2:'#a5d6a7' };
const PU_ICONS    = { magnet:'🧲', jetpack:'🚀', board:'🛹', x2:'⭐' };

// Obstacle pattern library (lane = 0/1/2, type = 'barrier_low'|'barrier_high'|'train')
const PATTERNS = [
  [ {lane:0, type:'train'},  {lane:2, type:'train'}                ],
  [ {lane:1, type:'train'}                                          ],
  [ {lane:0, type:'barrier_low'},  {lane:1, type:'barrier_high'}  ],
  [ {lane:1, type:'barrier_low'},  {lane:2, type:'barrier_high'}  ],
  [ {lane:0, type:'barrier_high'}, {lane:2, type:'barrier_low'}   ],
  [ {lane:0, type:'train'},  {lane:1, type:'barrier_low'}         ],
  [ {lane:2, type:'train'},  {lane:1, type:'barrier_high'}        ],
  [ {lane:0, type:'barrier_low'},  {lane:2, type:'barrier_low'}   ],
  [ {lane:1, type:'train'}                                          ],
  [ {lane:0, type:'barrier_high'}, {lane:2, type:'barrier_high'}, {lane:1, type:'barrier_low'} ],
];

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxOn  = true;
    this.musicOn= true;
    this.bgmNode= null;
    this.bpm    = 128;
    this.step   = 0;
    this.nextBeat=0;
    this._schedulerTimer = null;
  }
  _init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
  }
  resume() { this._init(); if (this.ctx?.state==='suspended') this.ctx.resume(); }

  _noise() {
    if (!this.ctx) return null;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const s = this.ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s;
  }
  _osc(type, freq, gain, duration, time) {
    if (!this.ctx || !this.sfxOn) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,time);
    g.gain.setValueAtTime(gain,time);
    g.gain.exponentialRampToValueAtTime(0.001,time+duration);
    o.connect(g); g.connect(this.master);
    o.start(time); o.stop(time+duration+0.05);
  }

  playCoin() {
    if (!this.sfxOn) return; this._init();
    const t = this.ctx.currentTime;
    this._osc('sine',1047,0.1,0.08,t);
    this._osc('sine',1319,0.08,0.1,t+0.04);
  }
  playJump() {
    if (!this.sfxOn) return; this._init();
    const t = this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='triangle';
    o.frequency.setValueAtTime(200,t);
    o.frequency.exponentialRampToValueAtTime(600,t+0.12);
    g.gain.setValueAtTime(0.18,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.2);
  }
  playSlide() {
    if (!this.sfxOn) return; this._init();
    const t = this.ctx.currentTime;
    const n=this._noise(), f=this.ctx.createBiquadFilter(), g=this.ctx.createGain();
    if (!n) return;
    f.type='bandpass'; f.frequency.value=400;
    g.gain.setValueAtTime(0.15,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.35);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t+0.38);
  }
  playLaneSwipe() {
    if (!this.sfxOn) return; this._init();
    const t = this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='sawtooth'; o.frequency.setValueAtTime(180,t);
    o.frequency.exponentialRampToValueAtTime(420,t+0.08);
    g.gain.setValueAtTime(0.06,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.12);
  }
  playCrash() {
    if (!this.sfxOn) return; this._init();
    const t = this.ctx.currentTime;
    const n=this._noise(), f=this.ctx.createBiquadFilter(), g=this.ctx.createGain();
    if (!n) return;
    f.type='lowpass'; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(60,t+0.7);
    g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.75);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t+0.8);
    // Bass thud
    const o=this.ctx.createOscillator(), gx=this.ctx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.linearRampToValueAtTime(20,t+0.5);
    gx.gain.setValueAtTime(0.4,t); gx.gain.exponentialRampToValueAtTime(0.001,t+0.55);
    o.connect(gx); gx.connect(this.master);
    o.start(t); o.stop(t+0.6);
  }
  playPowerUp() {
    if (!this.sfxOn) return; this._init();
    const t = this.ctx.currentTime;
    [523,659,784,1047].forEach((f,i) => this._osc('sine',f,0.1,0.12,t+i*0.07));
  }
  playShieldHit() {
    if (!this.sfxOn) return; this._init();
    const t = this.ctx.currentTime;
    this._osc('square',440,0.2,0.1,t);
    this._osc('sine',220,0.15,0.2,t+0.05);
  }

  startBGM() {
    if (!this.musicOn) return; this._init();
    if (this.ctx?.state==='suspended') this.ctx.resume();
    this._bgmPlaying = true;
    this.step = 0;
    this.nextBeat = this.ctx.currentTime;
    this._scheduleBGM();
  }
  stopBGM() {
    this._bgmPlaying = false;
    clearTimeout(this._schedulerTimer);
  }
  _scheduleBGM() {
    if (!this._bgmPlaying || !this.ctx) return;
    const beatLen = 60 / this.bpm;
    while (this.nextBeat < this.ctx.currentTime + 0.15) {
      this._bgmStep(this.step % 16, this.nextBeat, beatLen/2);
      this.step++;
      this.nextBeat += beatLen / 2;
    }
    this._schedulerTimer = setTimeout(() => this._scheduleBGM(), 30);
  }
  _bgmStep(step, time, dur) {
    if (!this.ctx) return;
    // Kick on 0,4,8,12
    if (step%4===0) {
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(160,time); o.frequency.exponentialRampToValueAtTime(0.01,time+0.1);
      g.gain.setValueAtTime(0.3,time); g.gain.exponentialRampToValueAtTime(0.001,time+0.12);
      o.connect(g); g.connect(this.master); o.start(time); o.stop(time+0.15);
    }
    // Snare 4,12
    if (step===4||step===12) {
      const n=this._noise(), f=this.ctx.createBiquadFilter(), g=this.ctx.createGain();
      if (n) {
        f.type='bandpass'; f.frequency.value=1000; f.Q.value=0.8;
        g.gain.setValueAtTime(0.12,time); g.gain.exponentialRampToValueAtTime(0.001,time+0.1);
        n.connect(f); f.connect(g); g.connect(this.master); n.start(time); n.stop(time+0.12);
      }
    }
    // Hi-hat every step
    if (step%2===1) {
      const n=this._noise(), f=this.ctx.createBiquadFilter(), g=this.ctx.createGain();
      if (n) {
        f.type='highpass'; f.frequency.value=8000;
        g.gain.setValueAtTime(0.05,time); g.gain.exponentialRampToValueAtTime(0.001,time+0.05);
        n.connect(f); f.connect(g); g.connect(this.master); n.start(time); n.stop(time+0.07);
      }
    }
    // Bass synth
    const baseNotes=[65,65,78,78,98,98,117,117];
    const freq = baseNotes[Math.floor(step/2)%8];
    const o=this.ctx.createOscillator(), lp=this.ctx.createBiquadFilter(), g=this.ctx.createGain();
    o.type='sawtooth'; o.frequency.setValueAtTime(step%2===0?freq:freq*2,time);
    lp.type='lowpass'; lp.frequency.value=280;
    g.gain.setValueAtTime(0.06,time); g.gain.exponentialRampToValueAtTime(0.001,time+dur*0.9);
    o.connect(lp); lp.connect(g); g.connect(this.master); o.start(time); o.stop(time+dur);
  }
  setMusicTempo(ratio) { this.bpm = Math.min(180, Math.floor(128*(0.85+ratio*0.15))); }
}

// ─── PARTICLE SYSTEM ──────────────────────────────────────────────────────────
class Particle {
  constructor(x,y,vx,vy,size,color,life,gravity=0) {
    Object.assign(this,{x,y,vx,vy,size,color,life,maxLife:life,gravity,alpha:1});
  }
  update(dt) {
    this.x += this.vx*dt; this.y += this.vy*dt;
    this.vy += this.gravity*dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life/this.maxLife);
    return this.life>0;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size*this.alpha, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── MAIN GAME ENGINE ─────────────────────────────────────────────────────────
class CityDash {
  constructor() {
    this.saveData    = SaveData.load();
    this.audio       = new AudioEngine();
    this.particles   = [];
    this.state       = 'splash';     // splash|home|playing|paused|gameover
    this.quality     = this.saveData.quality || 'med';

    // Canvases
    this.bgCanvas    = document.getElementById('bg-canvas');
    this.bgCtx       = this.bgCanvas.getContext('2d');
    this.canvas      = document.getElementById('game-canvas');
    this.ctx         = this.canvas.getContext('2d');

    // Images
    this.imgs        = {};
    this._loadImages().then(() => this._init());

    // Input
    this._setupInput();
  }

  _loadImages() {
    const toLoad = {
      bg1:   'game_background_city.png',
      char:  'preethi.png',
    };
    const promises = Object.entries(toLoad).map(([k,src]) =>
      new Promise(res => {
        const img = new Image();
        img.onload  = () => { this.imgs[k] = img; res(); };
        img.onerror = () => res();
        img.src = src;
      })
    );
    return Promise.all(promises);
  }

  _init() {
    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Start splash
    this._runSplash();
    requestAnimationFrame(t => this._loop(t));
  }

  _resize() {
    const W = this.canvas.parentElement.clientWidth;
    const H = this.canvas.parentElement.clientHeight;
    [this.bgCanvas, this.canvas].forEach(c => { c.width=W; c.height=H; });
    this.W = W; this.H = H;
    this.groundY = H * GROUND_Y;
    this.centerX = W / 2;
    // Lane pixel positions
    this.laneX = LANES.map(l => this.centerX + l * (W/390));
  }

  // ─── SPLASH ─────────────────────────────────────────────────────────────────
  _runSplash() {
    const tips = ['Swipe to dodge trains!','Collect coins to upgrade!','Power-ups boost your run!','Beat your high score!'];
    let pct = 0, tipI = 0;
    const bar = document.getElementById('splash-bar');
    const tip  = document.getElementById('splash-tip');
    const iv   = setInterval(() => {
      pct += Math.random()*7+3;
      if (pct >= 100) {
        pct = 100; clearInterval(iv);
        bar.style.width='100%';
        setTimeout(() => { this.showScreen('home'); this._updateHomeUI(); }, 500);
      }
      bar.style.width = pct+'%';
      tip.textContent = tips[Math.floor(pct/25) % tips.length];
    }, 70);
  }

  // ─── GAME RESET & START ─────────────────────────────────────────────────────
  startRun() {
    this.audio.resume();
    document.getElementById('modal-pause').classList.add('hidden');

    // Player state
    this.lane      = 1;
    this.targetLane= 1;
    this.laneT     = 1;
    this.playerX   = this.laneX[1];
    this.playerY   = this.groundY;
    this.playerVY  = 0;
    this.isGrounded= true;
    this.isSliding = false;
    this.slideTimer= 0;
    this.isDead    = false;
    this.isJetpacking = false;
    this.jetpackY  = 0;

    // Squash-stretch
    this.scaleX = 1; this.scaleY = 1;
    // Run animation
    this.runCycle  = 0;
    this.bodyBob   = 0;

    // Game metrics
    this.score        = 0;
    this.displayScore = 0;
    this.coins        = 0;
    this.distance     = 0;
    this.speed        = BASE_SPEED;
    this.multiplier   = 1;
    this.comboCount   = 0;
    this.isInvincible = false;
    this.invTimer     = 0;

    // Power-ups
    const upg = this.saveData.upgrades;
    this.powerups = {
      magnet:  { active:false, timer:0, duration: PU_BASE_DUR.magnet  + upg.magnet  * 1.5 },
      jetpack: { active:false, timer:0, duration: PU_BASE_DUR.jetpack + upg.jetpack * 1.2 },
      board:   { active:false, timer:0, duration: PU_BASE_DUR.board   + upg.board   * 2.0 },
      x2:      { active:false, timer:0, duration: PU_BASE_DUR.x2      + upg.x2      * 1.5 },
    };

    // Track/obstacles/items
    this.obstacles  = [];
    this.items      = [];
    this.particles  = [];
    this.spawnTimer = 0;
    this.itemTimer  = 0;
    this.bgScrollY  = 0;
    this.bgScrollX  = 0;
    this.bgPhase    = 0; // cycle through backgrounds
    this.cameraShake= 0;
    this.cameraShakeX=0;
    this.cameraShakeY=0;

    // Track tiles (endless railway ground)
    this.trackTiles = [];
    for (let i=0;i<12;i++) this.trackTiles.push({ y: this.groundY - i*(this.H*0.09) });

    this.saveData.totalRuns = (this.saveData.totalRuns||0)+1;
    SaveData.save(this.saveData);

    this.showScreen('hud');
    document.getElementById('swipe-hint').style.display='block';
    this._hideSwipeHintTimer = setTimeout(() => {
      document.getElementById('swipe-hint').style.display='none';
    }, 3500);

    this.state = 'playing';
    this.audio.startBGM();
    this.lastTime = performance.now();
  }

  // ─── MAIN LOOP ──────────────────────────────────────────────────────────────
  _loop(ts) {
    requestAnimationFrame(t => this._loop(t));
    const dt = Math.min(0.05, (ts - (this.lastTime||ts)) / 1000);
    this.lastTime = ts;

    if (this.state === 'playing') {
      this._update(dt);
    }
    this._draw(dt);
  }

  // ─── UPDATE ─────────────────────────────────────────────────────────────────
  _update(dt) {
    // Speed ramp
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.distance * SPEED_RAMP);
    this.distance += this.speed * dt;
    const speedRatio = this.speed / BASE_SPEED;
    this.audio.setMusicTempo(speedRatio);

    // Score
    const mult = this.powerups.x2.active ? 2*this.multiplier : this.multiplier;
    this.score += this.speed * dt * mult * 0.8;
    this.displayScore += (this.score - this.displayScore) * Math.min(1, dt*6);

    // HUD updates
    document.getElementById('hud-score-val').textContent = Math.floor(this.displayScore).toString().padStart(6,'0');
    document.getElementById('hud-dist').textContent = Math.floor(this.distance)+'m';
    document.getElementById('hud-coins-val').textContent = this.coins;
    document.getElementById('hud-mult').textContent = 'x'+mult;

    // Camera shake decay
    this.cameraShake = Math.max(0, this.cameraShake - dt*6);
    if (this.cameraShake>0) {
      this.cameraShakeX = (Math.random()-0.5)*this.cameraShake*14;
      this.cameraShakeY = (Math.random()-0.5)*this.cameraShake*14;
    } else { this.cameraShakeX=0; this.cameraShakeY=0; }

    // Player lane interpolation (smooth cubic ease)
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt * 8.5);
      const ease = 1 - Math.pow(1-this.laneT, 3);
      this.playerX = this._lerp(this.laneX[this.lane], this.laneX[this.targetLane], ease);
    } else {
      this.lane = this.targetLane;
      this.playerX = this.laneX[this.lane];
    }

    // Jetpack
    if (this.isJetpacking) {
      const jY = this.groundY - this.H * 0.28;
      this.playerY += (jY - this.playerY) * dt * 5;
      this._spawnParticles(this.playerX, this.playerY+60, 'jetpack');
    } else {
      // Gravity
      if (!this.isGrounded) {
        this.playerVY += GRAVITY * dt;
        this.playerY  += this.playerVY * dt;
        if (this.playerY >= this.groundY) {
          this.playerY  = this.groundY;
          this.playerVY = 0;
          this.isGrounded = true;
          this._onLand();
        }
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
      if (this.slideTimer <= 0) this.isSliding = false;
      this._spawnParticles(this.playerX, this.playerY-4, 'slide');
    }

    // Squash-stretch spring
    this.scaleX += (1 - this.scaleX) * dt * 10;
    this.scaleY += (1 - this.scaleY) * dt * 10;

    // Run cycle
    this.runCycle += dt * speedRatio * 10;
    this.bodyBob = Math.sin(this.runCycle) * 5;

    // Invincibility
    if (this.isInvincible) {
      this.invTimer -= dt;
      if (this.invTimer <= 0) this.isInvincible = false;
    }

    // Power-up ticks
    this._tickPowerups(dt);

    // Track scroll
    const tileH = this.H * 0.09;
    this.trackTiles.forEach(t => { t.y += this.speed * dt * 0.55; });
    if (this.trackTiles[this.trackTiles.length-1].y > this.groundY+tileH) {
      this.trackTiles.push({ y: this.trackTiles[0].y - tileH });
    }
    this.trackTiles = this.trackTiles.filter(t => t.y < this.H+tileH*2);
    this.bgScrollY += this.speed * dt * 0.3;

    // Spawning
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this._spawnObstacleGroup();
      this.spawnTimer = Math.max(1.2, 3.5 - this.distance*0.0008);
    }
    this.itemTimer -= dt;
    if (this.itemTimer <= 0) {
      this._spawnItems();
      this.itemTimer = Math.max(0.5, 1.8 - this.distance*0.0003);
    }

    // Move obstacles & items
    const scrollSpeed = this.speed * dt;
    this.obstacles.forEach(o => { o.y += scrollSpeed * 0.9; });
    this.items.forEach(i => {
      i.y += scrollSpeed * 0.9;
      i.rot = (i.rot||0) + dt * 3;
      // Magnet pull
      if (this.powerups.magnet.active && i.type==='coin') {
        const dx = this.playerX - i.x, dy = this.playerY - i.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 220) {
          i.x += dx/dist * Math.min(dist, 600*dt);
          i.y += dy/dist * Math.min(dist, 600*dt);
        }
      }
    });

    // Culling
    this.obstacles = this.obstacles.filter(o => o.y < this.H + 200);
    this.items      = this.items.filter(i => i.y < this.H + 100);

    // Collisions
    this._checkCollisions();

    // Particles
    this.particles = this.particles.filter(p => p.update(dt));
  }

  _tickPowerups(dt) {
    PU_TYPES.forEach(type => {
      const pu = this.powerups[type];
      if (pu.active) {
        pu.timer -= dt;
        const pct = Math.max(0, pu.timer / pu.duration) * 100;
        document.getElementById(`pu-${type}-fill`).style.width = pct+'%';
        document.getElementById(`pu-${type}`).classList.add('active');
        if (pu.timer <= 0) {
          pu.active = false;
          document.getElementById(`pu-${type}`).classList.remove('active');
          if (type === 'jetpack') { this.isJetpacking = false; }
          if (type === 'board')   { this._showToast('🛹 Hoverboard done!'); }
        }
      }
    });
    // Sync multiplier UI
    if (this.powerups.x2.active) {
      document.getElementById('hud-mult').textContent = 'x'+(2*this.multiplier);
    }
  }

  _activatePowerUp(type) {
    const pu = this.powerups[type];
    pu.active = true;
    pu.timer  = pu.duration;
    this.audio.playPowerUp();
    document.getElementById(`pu-${type}`).classList.add('active');
    if (type==='jetpack') { this.isJetpacking=true; this.isGrounded=false; this._showToast('🚀 Jetpack!'); }
    if (type==='board')   { this.isInvincible=true; this.invTimer=pu.duration; this._showToast('🛹 Hoverboard Active!'); }
    if (type==='magnet')  { this._showToast('🧲 Coin Magnet!'); }
    if (type==='x2')      { this._showToast('⭐ 2x Score!'); }
  }

  // ─── SPAWNING ───────────────────────────────────────────────────────────────
  _spawnObstacleGroup() {
    const pattern = PATTERNS[Math.floor(Math.random()*PATTERNS.length)];
    pattern.forEach(spec => {
      const x = this.laneX[spec.lane];
      this.obstacles.push({
        x, y: -120,
        lane: spec.lane,
        type: spec.type,
        w: spec.type==='train'?90:55,
        h: spec.type==='barrier_high'?110: (spec.type==='train'?140:65),
      });
    });
  }

  _spawnItems() {
    const lane = Math.floor(Math.random()*3);
    const x    = this.laneX[lane];
    // Coin arc
    const arcLen = Math.floor(Math.random()*4)+3;
    for (let i=0;i<arcLen;i++) {
      this.items.push({ x, y:-60-i*55, type:'coin', lane, rot:0 });
    }
    // Occasional power-up
    if (Math.random()<0.08) {
      const puType = PU_TYPES[Math.floor(Math.random()*PU_TYPES.length)];
      const puLane = Math.floor(Math.random()*3);
      this.items.push({ x:this.laneX[puLane], y:-80, type:'powerup', subtype:puType, lane:puLane, rot:0 });
    }
  }

  // ─── COLLISION DETECTION ────────────────────────────────────────────────────
  _checkCollisions() {
    const PH = this.isSliding ? 48 : 90;  // player hitbox height
    const PW = 38;
    const px = this.playerX, py = this.playerY;

    // Items
    this.items.forEach(item => {
      if (!item.visible === false) {
        const dx = Math.abs(item.x - px), dy = Math.abs(item.y - (py - PH*0.5));
        if (dx < 38 && dy < 38) {
          item.collected = true;
          if (item.type==='coin') {
            this.coins++;
            this.score += 50 * (this.powerups.x2.active ? 2 : 1);
            this.audio.playCoin();
            this._spawnParticles(item.x, item.y, 'coin');
            this.comboCount++;
            if (this.comboCount >= 5) this._showCombo();
          } else if (item.type==='powerup') {
            this._activatePowerUp(item.subtype);
          }
        }
      }
    });
    this.items = this.items.filter(i => !i.collected);

    // Obstacles
    if (this.isInvincible) return;
    for (const o of this.obstacles) {
      const oTop = o.y - o.h;
      const playerBottom = py;
      const playerTop    = py - PH;

      const xOverlap = Math.abs(o.x - px) < (PW + o.w*0.38);
      const yOverlap = playerBottom > oTop && playerTop < o.y;

      if (xOverlap && yOverlap) {
        if (this.powerups.board.active) {
          // Board absorbs hit
          this.powerups.board.active = false;
          this.powerups.board.timer  = 0;
          this.isInvincible = true;
          this.invTimer = 1.5;
          document.getElementById('pu-board').classList.remove('active');
          this.audio.playShieldHit();
          this._showToast('🛹 Hoverboard used!');
          this.cameraShake = 0.6;
          o.hit = true;
        } else {
          this._doCrash();
          return;
        }
      }
    }
    this.obstacles = this.obstacles.filter(o => !o.hit);
  }

  _doCrash() {
    if (this.isDead) return;
    this.isDead = true;
    this.state  = 'gameover';
    this.audio.playCrash();
    this.audio.stopBGM();
    this.cameraShake = 1.8;
    this._spawnParticles(this.playerX, this.playerY-40, 'crash');

    // Save stats
    this.saveData.totalCoinsEver = (this.saveData.totalCoinsEver||0) + this.coins;
    this.saveData.coins = (this.saveData.coins||0) + this.coins;
    const newBest = Math.max(this.saveData.highScore||0, Math.floor(this.score));
    const newDist = Math.max(this.saveData.bestDistance||0, Math.floor(this.distance));
    this.saveData.highScore    = newBest;
    this.saveData.bestDistance = newDist;
    this._updateMissionProgress();
    SaveData.save(this.saveData);
    Leaderboard.submit(this.saveData.displayName||'PREETHI', Math.floor(this.score));

    setTimeout(() => this._showGameOver(), 1000);
  }

  _showGameOver() {
    document.getElementById('go-score').textContent = Math.floor(this.score).toLocaleString();
    document.getElementById('go-dist').textContent  = Math.floor(this.distance)+'m';
    document.getElementById('go-coins').textContent = this.coins+' 🪙';
    document.getElementById('go-best').textContent  = (this.saveData.highScore||0).toLocaleString();
    this.showScreen('gameover');
  }

  _onLand() {
    this.scaleX = 1.3; this.scaleY = 0.65;
    this.audio.playSlide();
    this._spawnParticles(this.playerX, this.playerY, 'land');
    this.comboCount = 0;
  }

  // ─── PARTICLES ──────────────────────────────────────────────────────────────
  _spawnParticles(x, y, type) {
    const count = type==='crash'?24: type==='coin'?8: type==='land'?12: 3;
    for (let i=0;i<count;i++) {
      const angle = Math.random()*Math.PI*2;
      const speed = type==='crash'?200+Math.random()*300: type==='coin'?80+Math.random()*120: 60+Math.random()*80;
      const colors = {
        crash: ['#ff6b35','#ff9933','#ffcc00','#fff'],
        coin:  ['#f5c518','#fff5a0','#f5a623'],
        land:  ['#8b7355','#c4a882','#e8d5b7'],
        jetpack: ['#ff6b35','#ffcc00','#ff9933'],
        slide: ['#888','#aaa','#f5c518'],
      };
      const palate = colors[type]||['#fff'];
      const color = palate[Math.floor(Math.random()*palate.length)];
      const size = type==='crash'?6+Math.random()*6: type==='coin'?3+Math.random()*4: 2+Math.random()*3;
      const life = type==='crash'?0.8+Math.random()*0.5: 0.3+Math.random()*0.4;
      const gravity = type==='jetpack'?-30: type==='land'?-200: 80;
      this.particles.push(new Particle(
        x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*10,
        Math.cos(angle)*speed*(Math.random()+0.5),
        Math.sin(angle)*speed*(Math.random()+0.5) - (type==='coin'?speed*0.5:0),
        size, color, life, gravity
      ));
    }
  }

  // ─── DRAW ───────────────────────────────────────────────────────────────────
  _draw(dt) {
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.W,this.H);
    const cx = this.cameraShakeX||0, cy = this.cameraShakeY||0;
    ctx.save();
    ctx.translate(cx, cy);

    if (this.state==='playing' || this.state==='paused' || this.state==='gameover') {
      this._drawBackground();
      this._drawTrack();
      this._drawItems();
      this._drawObstacles();
      if (this.state==='playing' || this.state==='paused') this._drawPlayer();
      else if (this.state==='gameover') this._drawPlayerCrash();
      this._drawParticles();
      this._drawShieldGlow();
    } else {
      this._drawBackground();
    }
    ctx.restore();
  }

  _drawBackground() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    // Use the provided subway surfers background images, cycling based on distance
    const bgKeys = ['bg1','bg2','bg3'].filter(k => this.imgs[k]);
    if (bgKeys.length > 0) {
      const idx = Math.floor((this.distance||0) / 800) % bgKeys.length;
      const img  = this.imgs[bgKeys[idx]];
      if (img) {
        // Draw bg with subtle parallax
        const parallaxY = (this.bgScrollY||0) % H;
        ctx.drawImage(img, 0, -H + parallaxY, W, H);
        ctx.drawImage(img, 0, parallaxY, W, H);
      }
    } else {
      // Fallback gradient sky
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,'#87CEEB');
      grad.addColorStop(0.6,'#B0E0E6');
      grad.addColorStop(1,'#8B7355');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,W,H);
    }
  }

  _drawTrack() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const groundY = this.groundY;

    // Railway ground panel
    const groundGrad = ctx.createLinearGradient(0,groundY-20,0,H);
    groundGrad.addColorStop(0,'#6b4f2a');
    groundGrad.addColorStop(0.3,'#8b6b3d');
    groundGrad.addColorStop(1,'#5a3e1b');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0,groundY-20,W,H-groundY+20);

    // Three railway track strips
    const laneW = this.W/3.8;
    this.laneX.forEach((lx, li) => {
      // Track bed
      ctx.fillStyle = li===1?'rgba(0,0,0,0.18)':'rgba(0,0,0,0.12)';
      ctx.fillRect(lx-laneW/2, groundY-22, laneW, H);

      // Rails (two per lane)
      ctx.fillStyle = '#999';
      ctx.fillRect(lx-laneW*0.35, groundY-20, 5, H);
      ctx.fillRect(lx+laneW*0.35-5, groundY-20, 5, H);

      // Sleepers (scrolling)
      ctx.fillStyle = '#5a3e1b';
      const tileH = this.H*0.09;
      this.trackTiles.forEach(tile => {
        ctx.fillRect(lx-laneW*0.45, tile.y, laneW*0.9, 10);
      });
    });

    // Lane divider lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20,15]);
    this.laneX.slice(0,-1).forEach((lx,i) => {
      const dx = (this.laneX[i+1]-lx)/2 + lx;
      ctx.beginPath(); ctx.moveTo(dx, groundY-20); ctx.lineTo(dx, H);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  _drawObstacles() {
    const ctx = this.ctx;
    this.obstacles.forEach(o => {
      ctx.save();
      ctx.translate(o.x, o.y - o.h/2);

      if (o.type === 'train') {
        this._drawTrain(ctx, o.w, o.h);
      } else if (o.type === 'barrier_low') {
        this._drawBarrier(ctx, o.w, o.h, false);
      } else if (o.type === 'barrier_high') {
        this._drawBarrier(ctx, o.w, o.h, true);
      }
      ctx.restore();
    });
  }

  _drawTrain(ctx, w, h) {
    // Train body
    const bodyGrad = ctx.createLinearGradient(-w/2,0,w/2,0);
    bodyGrad.addColorStop(0,'#e8c84a');
    bodyGrad.addColorStop(0.3,'#f5d73d');
    bodyGrad.addColorStop(0.7,'#e8c84a');
    bodyGrad.addColorStop(1,'#c9a833');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx,-w/2,-h/2,w,h,8);
    ctx.fill();

    // Red stripe
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(-w/2,h*0.12,w,h*0.14);

    // Windows
    ctx.fillStyle = '#b8d8f8';
    [-w*0.3, w*0.02].forEach(wx => {
      ctx.fillRect(wx,-h*0.28,w*0.28,h*0.22);
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.5; ctx.strokeRect(wx,-h*0.28,w*0.28,h*0.22);
    });

    // Wheels
    ctx.fillStyle='#333';
    [-w*0.3, w*0.3].forEach(wx => {
      ctx.beginPath(); ctx.arc(wx, h/2-4, 8, 0, Math.PI*2); ctx.fill();
    });
    ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2.5;
    this._roundRect(ctx,-w/2,-h/2,w,h,8);
    ctx.stroke();
  }

  _drawBarrier(ctx, w, h, isHigh) {
    const color1 = isHigh ? '#e74c3c' : '#f39c12';
    const color2 = isHigh ? '#c0392b' : '#d68910';
    // Main post
    const grad = ctx.createLinearGradient(-w/2,0,w/2,0);
    grad.addColorStop(0,color2); grad.addColorStop(0.5,color1); grad.addColorStop(1,color2);
    ctx.fillStyle = grad;
    this._roundRect(ctx,-w/2,-h/2,w,h,6); ctx.fill();
    // Hazard stripes
    ctx.save(); ctx.clip();
    ctx.fillStyle='rgba(0,0,0,0.2)';
    for (let i=-h;i<h;i+=20) {
      ctx.beginPath();
      ctx.moveTo(-w/2,i); ctx.lineTo(w/2,i-10); ctx.lineTo(w/2,i-4); ctx.lineTo(-w/2,i+6);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=2;
    this._roundRect(ctx,-w/2,-h/2,w,h,6); ctx.stroke();

    // Warning icon
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.font = `bold ${Math.min(h*0.35,18)}px Nunito`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(isHigh?'▲':'!',0,0);
  }

  _drawItems() {
    const ctx = this.ctx;
    this.items.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot||0);

      if (item.type==='coin') {
        // Gold coin with star
        const r = 16;
        const cg = ctx.createRadialGradient(-r*0.3,-r*0.3,1,0,0,r);
        cg.addColorStop(0,'#ffe066');
        cg.addColorStop(0.5,'#f5c518');
        cg.addColorStop(1,'#c87000');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#c87000'; ctx.lineWidth=2; ctx.stroke();
        // Star
        ctx.fillStyle='#fff5a0';
        ctx.font='bold 14px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('★',0,0.5);
      } else if (item.type==='powerup') {
        const color = PU_COLORS[item.subtype]||'#fff';
        // Glowing orb
        const gl = ctx.createRadialGradient(0,0,4,0,0,22);
        gl.addColorStop(0,'white');
        gl.addColorStop(0.4,color);
        gl.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();
        // Inner circle
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='white'; ctx.font='18px serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(PU_ICONS[item.subtype]||'?',0,1);
      }
      ctx.restore();
    });
  }

  _drawPlayer() {
    const ctx = this.ctx;
    const x = this.playerX, y = this.playerY;
    const sx = this.scaleX, sy = this.scaleY;
    const bob = this.isGrounded ? this.bodyBob : 0;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(sx, sy);

    // Invincibility flash
    if (this.isInvincible && Math.floor(performance.now()/80)%2===0) {
      ctx.globalAlpha = 0.5;
    }

    const img = this.imgs.char;
    if (img) {
      // Draw character as a 2D sprite from the photo, styled as a game character
      const charH = this.isSliding ? 55 : (this.isJetpacking ? 95 : 100);
      const charW = charH * (img.width/img.height);

      // Draw glowing shadow
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur  = 12;
      ctx.shadowOffsetY = 4;

      // Clip to silhouette using circular head + body shape
      ctx.shadowColor = 'transparent';

      // Purple dress tint overlay for game style
      ctx.drawImage(img, -charW/2, -charH, charW, charH);

      // Draw game-style running arms
      if (this.isGrounded && !this.isSliding) {
        const swing = Math.sin(this.runCycle);
        // Left arm
        ctx.strokeStyle = '#7e57c2';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-charW*0.35, -charH*0.65);
        ctx.lineTo(-charW*0.35 + swing*18, -charH*0.4);
        ctx.stroke();
        // Right arm
        ctx.beginPath();
        ctx.moveTo(charW*0.35, -charH*0.65);
        ctx.lineTo(charW*0.35 - swing*18, -charH*0.4);
        ctx.stroke();
      }

      // Hoverboard under feet when active
      if (this.powerups.board.active) {
        const boardGrad = ctx.createLinearGradient(-charW*0.55,-4,charW*0.55,-4);
        boardGrad.addColorStop(0,'#9c27b0');
        boardGrad.addColorStop(0.5,'#e91e63');
        boardGrad.addColorStop(1,'#9c27b0');
        ctx.fillStyle = boardGrad;
        this._roundRect(ctx,-charW*0.55,-8,charW*1.1,14,7); ctx.fill();
        // Glow
        ctx.shadowColor='#e91e63'; ctx.shadowBlur=18;
        this._roundRect(ctx,-charW*0.55,-8,charW*1.1,14,7); ctx.fill();
        ctx.shadowColor='transparent'; ctx.shadowBlur=0;
      }

      // Jetpack on back
      if (this.isJetpacking) {
        ctx.fillStyle = '#ff6b35';
        this._roundRect(ctx, -charW*0.55, -charH*0.7, 14, 36, 5); ctx.fill();
        this._roundRect(ctx, charW*0.55-14, -charH*0.7, 14, 36, 5); ctx.fill();
        // Flame
        const flameGrad = ctx.createLinearGradient(0,-charH*0.7,0,-charH*0.7+40);
        flameGrad.addColorStop(0,'#ffcc00');
        flameGrad.addColorStop(0.5,'#ff6b35');
        flameGrad.addColorStop(1,'rgba(255,107,53,0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.ellipse(-charW*0.48, -charH*0.7+30+Math.sin(this.runCycle*3)*6, 7, 18, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(charW*0.48, -charH*0.7+30+Math.cos(this.runCycle*3)*6, 7, 18, 0, 0, Math.PI*2);
        ctx.fill();
      }
    } else {
      // Fallback cartoon character
      this._drawFallbackChar(ctx, this.isSliding, this.isJetpacking);
    }

    ctx.restore();
  }

  _drawFallbackChar(ctx, sliding, jetpacking) {
    const h = sliding ? 50 : 90;
    // Body
    ctx.fillStyle = '#7e57c2';
    ctx.beginPath(); ctx.ellipse(0, -h*0.45, 18, h*0.38, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#ffccaa';
    ctx.beginPath(); ctx.arc(0, -h-12, 18, 0, Math.PI*2); ctx.fill();
    // Hair
    ctx.fillStyle = '#2c1810';
    ctx.beginPath(); ctx.arc(0, -h-18, 19, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -h-8, 5, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(-6, -h-13, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6,  -h-13, 3, 0, Math.PI*2); ctx.fill();
    // Bindi
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(0, -h-18, 3, 0, Math.PI*2); ctx.fill();
  }

  _drawPlayerCrash() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.playerX, this.playerY);
    ctx.rotate((Math.random()-0.5)*0.3);
    ctx.globalAlpha = 0.7;
    this._drawFallbackChar(ctx, true, false);
    ctx.restore();
  }

  _drawParticles() {
    this.particles.forEach(p => p.draw(this.ctx));
  }

  _drawShieldGlow() {
    if (!this.powerups.board.active) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(performance.now()*0.006)*0.15;
    const glowGrad = ctx.createRadialGradient(this.playerX, this.playerY-50, 10, this.playerX, this.playerY-50, 75);
    glowGrad.addColorStop(0,'rgba(233,30,99,0.5)');
    glowGrad.addColorStop(1,'rgba(233,30,99,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath(); ctx.arc(this.playerX, this.playerY-50, 75, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ─── INPUT ──────────────────────────────────────────────────────────────────
  _setupInput() {
    let sx=0, sy=0, st=0;
    const canvas = this.canvas;

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      sx=t.clientX; sy=t.clientY; st=performance.now();
    }, { passive:false });

    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      if (this.state !== 'playing') return;
      const t = e.changedTouches[0];
      const dx=t.clientX-sx, dy=t.clientY-sy;
      const elapsed = performance.now()-st;
      if (elapsed > 500) return;
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) { dx>0 ? this.swipeRight() : this.swipeLeft(); }
      } else {
        if (Math.abs(dy) > 30) { dy<0 ? this.swipeUp() : this.swipeDown(); }
      }
    }, { passive:false });

    window.addEventListener('keydown', e => {
      if (this.state !== 'playing') return;
      if (e.key==='ArrowLeft'  || e.key==='a' || e.key==='A') this.swipeLeft();
      if (e.key==='ArrowRight' || e.key==='d' || e.key==='D') this.swipeRight();
      if (e.key==='ArrowUp' || e.key===' ' || e.key==='w' || e.key==='W') { e.preventDefault(); this.swipeUp(); }
      if (e.key==='ArrowDown'  || e.key==='s' || e.key==='S') this.swipeDown();
      if (e.key==='Escape' || e.key==='p' || e.key==='P') this.pause();
    });
  }

  swipeLeft()  { if (this.targetLane>0) { this.lane=this.targetLane; this.targetLane--; this.laneT=0; this.audio.playLaneSwipe(); this.scaleX=0.78; this.scaleY=1.18; } }
  swipeRight() { if (this.targetLane<2) { this.lane=this.targetLane; this.targetLane++; this.laneT=0; this.audio.playLaneSwipe(); this.scaleX=0.78; this.scaleY=1.18; } }
  swipeUp() {
    if (this.isJetpacking) return;
    if (this.isGrounded) {
      this.playerVY = JUMP_VEL;
      this.isGrounded = false;
      this.isSliding  = false;
      this.audio.playJump();
      this.scaleY = 1.4; this.scaleX = 0.72;
    } else {
      // Double jump
      if (!this._doubleJumped) {
        this.playerVY = JUMP_VEL * 0.8;
        this._doubleJumped = true;
        this.audio.playJump();
      }
    }
  }
  swipeDown() {
    if (this.isJetpacking) return;
    if (!this.isGrounded) {
      this.playerVY = -JUMP_VEL * 1.2; // air slam
    } else if (!this.isSliding) {
      this.isSliding  = true;
      this.slideTimer = 0.65;
      this.audio.playSlide();
      this.scaleX = 1.4; this.scaleY = 0.6;
    }
  }

  // ─── UI HELPERS ─────────────────────────────────────────────────────────────
  showScreen(id) {
    const allScreens = ['screen-splash','screen-home','screen-gameover','screen-store','screen-missions','screen-leaderboard','screen-settings'];
    const gameHUD = document.getElementById('hud');
    const puBars  = document.getElementById('powerup-bars');

    allScreens.forEach(s => {
      const el = document.getElementById(s);
      if (el) { el.classList.add('hidden'); el.style.display='none'; }
    });

    if (id !== 'hud') {
      gameHUD.style.display='none';
      puBars.style.pointerEvents='none';
    }

    if (id === 'home') {
      this.state = 'home';
      this.audio.stopBGM();
      this._updateHomeUI();
    }

    const target = document.getElementById('screen-'+id);
    if (target) {
      target.classList.remove('hidden');
      target.style.display = 'flex';
    }

    if (id === 'hud') {
      gameHUD.style.display = 'flex';
    }

    // Populate dynamic screens
    if (id === 'store')       this._renderStore();
    if (id === 'missions')    this._renderMissions();
    if (id === 'leaderboard') this._renderLeaderboard();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.stopBGM();
    document.getElementById('modal-pause').classList.remove('hidden');
  }

  resume() {
    this.state = 'playing';
    this.audio.startBGM();
    document.getElementById('modal-pause').classList.add('hidden');
  }

  _updateHomeUI() {
    const d = this.saveData;
    document.getElementById('home-coins-val').textContent = (d.coins||0).toLocaleString();
    document.getElementById('home-gems-val').textContent  = (d.gems||0).toLocaleString();
    document.getElementById('home-lvl-num').textContent   = d.level||1;
    document.getElementById('home-username').textContent  = d.displayName||'PRIYA';
  }

  _showCombo() {
    const el = document.createElement('div');
    el.className = 'combo-popup';
    el.textContent = `${this.comboCount} COMBO! 🔥`;
    el.style.left  = (this.playerX - 60) + 'px';
    el.style.top   = (this.playerY - 120) + 'px';
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 1200);
    this.comboCount = 0;
  }

  _showToast(msg, duration=2000) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), duration);
  }

  // ─── STORE ──────────────────────────────────────────────────────────────────
  _renderStore() {
    document.getElementById('store-coins-val').textContent = (this.saveData.coins||0).toLocaleString();
    const container = document.getElementById('store-upgrades-list');
    container.innerHTML = '';
    const upgradeInfo = {
      magnet:  { icon:'🧲', name:'Coin Magnet',   desc:'Attracts nearby coins', color:'#0277bd' },
      jetpack: { icon:'🚀', name:'Jetpack',        desc:'Fly above obstacles',  color:'#e65100' },
      board:   { icon:'🛹', name:'Hoverboard',     desc:'Absorbs one crash',    color:'#7b1fa2' },
      x2:      { icon:'⭐', name:'Score Booster',  desc:'2x all points',        color:'#2e7d32' },
    };
    PU_TYPES.forEach(type => {
      const info  = upgradeInfo[type];
      const level = this.saveData.upgrades[type]||1;
      const cost  = Math.pow(2, level-1)*500;
      const maxed = level>=5;
      const card  = document.createElement('div');
      card.className='store-card';
      const pips = Array.from({length:5}, (_,i) => `<div class="pip ${i<level?'filled':''}"></div>`).join('');
      card.innerHTML = `
        <div class="store-card-icon" style="background:rgba(${this._hexToRgb(info.color)},0.15);">${info.icon}</div>
        <div class="store-card-info">
          <div class="store-card-name">${info.name}</div>
          <div class="store-card-desc">${info.desc}</div>
          <div class="store-card-pips">${pips}</div>
        </div>
        <button class="store-buy-btn" style="background:${maxed?'#333':'linear-gradient(135deg,'+info.color+','+info.color+'aa)'};color:${maxed?'#666':'white'};"
          onclick="${maxed?'':'game.upgradeItem(\''+type+'\','+cost+')'}">
          ${maxed?'MAX':'<div class="btn-cost"><span>🪙</span>${cost}</div>'}
        </button>`;
      container.appendChild(card);
    });
  }

  upgradeItem(type, cost) {
    if ((this.saveData.coins||0) < cost) { this._showToast('❌ Not enough coins!'); return; }
    this.saveData.coins -= cost;
    this.saveData.upgrades[type] = Math.min(5, (this.saveData.upgrades[type]||1)+1);
    SaveData.save(this.saveData);
    this._showToast(`✅ ${type} upgraded!`);
    this._renderStore();
  }

  buyGems(amount, cost) {
    if ((this.saveData.coins||0) < cost) { this._showToast('❌ Not enough coins!'); return; }
    this.saveData.coins -= cost;
    this.saveData.gems  = (this.saveData.gems||0)+amount;
    SaveData.save(this.saveData);
    this._showToast(`💎 +${amount} Gems!`);
    this._renderStore();
  }

  watchAd(coinBonus=0) {
    this._showToast('📺 Ad simulated! Reward granted.');
    if (coinBonus>0) {
      this.saveData.coins = (this.saveData.coins||0)+coinBonus;
      SaveData.save(this.saveData);
      this._renderStore();
      return;
    }
    // Double coins on game over
    const earned = this.coins||0;
    this.saveData.coins = (this.saveData.coins||0)+earned;
    SaveData.save(this.saveData);
    document.getElementById('go-coins').textContent = (earned*2)+' 🪙 (Doubled!)';
    document.querySelector('.go-btn-ad').disabled = true;
    document.querySelector('.go-btn-ad').textContent = '✅ Reward Claimed!';
  }

  // ─── MISSIONS ───────────────────────────────────────────────────────────────
  _getMissions() {
    const d = this.saveData;
    return [
      { id:'m_score_10k', text:'Score 10,000 in a run',   target:10000, value:d.highScore||0,        reward:250,  type:'score'  },
      { id:'m_dist_500',  text:'Run 500m in a single run',target:500,   value:d.bestDistance||0,     reward:300,  type:'dist'   },
      { id:'m_coins_50',  text:'Collect 50 coins total',  target:50,    value:d.totalCoinsEver||0,   reward:200,  type:'coins'  },
      { id:'m_runs_5',    text:'Play 5 runs',              target:5,     value:d.totalRuns||0,        reward:150,  type:'runs'   },
      { id:'m_score_50k', text:'Score 50,000 in a run',   target:50000, value:d.highScore||0,        reward:800,  type:'score'  },
      { id:'m_dist_2k',   text:'Run 2,000m in a single run',target:2000,value:d.bestDistance||0,    reward:600,  type:'dist'   },
      { id:'m_coins_500', text:'Collect 500 coins total', target:500,   value:d.totalCoinsEver||0,   reward:1000, type:'coins'  },
    ];
  }

  _renderMissions() {
    const container = document.getElementById('missions-list');
    container.innerHTML='';
    this._getMissions().forEach(m => {
      const pct     = Math.min(100, (m.value/m.target)*100);
      const done    = m.value >= m.target;
      const claimed = (this.saveData.completedMissions||[]).includes(m.id);
      const card    = document.createElement('div');
      card.className='mission-card';
      card.innerHTML=`
        <div class="mission-header">
          <div class="mission-text">${m.text}</div>
          <div class="mission-reward">+${m.reward} 🪙</div>
        </div>
        <div class="mission-progress-bg"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;color:rgba(255,255,255,0.5);">${Math.min(m.value,m.target).toLocaleString()} / ${m.target.toLocaleString()}</span>
          ${claimed?'<span style="font-size:11px;color:#56ab2f;font-weight:900;">✅ Claimed</span>':
            done?`<button class="mission-claim-btn" onclick="game.claimMission('${m.id}',${m.reward})">CLAIM!</button>`:''}
        </div>`;
      container.appendChild(card);
    });
  }

  claimMission(id, reward) {
    if ((this.saveData.completedMissions||[]).includes(id)) return;
    if (!this.saveData.completedMissions) this.saveData.completedMissions=[];
    this.saveData.completedMissions.push(id);
    this.saveData.coins = (this.saveData.coins||0)+reward;
    SaveData.save(this.saveData);
    this._showToast(`🎉 +${reward} coins!`);
    this._renderMissions();
  }

  _updateMissionProgress() {
    // missions auto-update via saveData fields; nothing to do explicitly
  }

  // ─── LEADERBOARD ────────────────────────────────────────────────────────────
  _renderLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    container.innerHTML='';
    const entries = Leaderboard.getFormatted(this.saveData.displayName||'PREETHI');
    const rankColors = ['gold','silver','bronze'];
    entries.forEach((e,i) => {
      const row = document.createElement('div');
      row.className='lb-row';
      row.innerHTML=`
        <div class="lb-rank ${rankColors[i]||''}">${i===0?'👑':i===1?'🥈':i===2?'🥉':i+1}</div>
        <div class="lb-name ${e.name===this.saveData.displayName?'me':''}">${e.name}</div>
        <div class="lb-score">${(e.score||0).toLocaleString()}</div>`;
      container.appendChild(row);
    });
  }

  // ─── DAILY REWARD ───────────────────────────────────────────────────────────
  showDailyReward() {
    const now  = Date.now();
    const last = this.saveData.lastDailyReward||0;
    const msSince = now - last;
    const ONE_DAY = 86400000;
    if (msSince < ONE_DAY) {
      const rem = Math.ceil((ONE_DAY-msSince)/3600000);
      this._showToast(`⏳ Next reward in ${rem}h`); return;
    }
    const streak = (msSince < ONE_DAY*2) ? (this.saveData.dailyStreak||0)+1 : 1;
    const amount = Math.min(500+streak*100, 2000);
    document.getElementById('daily-streak-text').textContent = `Day ${streak} Streak 🔥`;
    document.getElementById('daily-amount').textContent = '+'+amount;
    this.saveData._pendingDailyReward = { amount, streak };
    document.getElementById('modal-daily').classList.remove('hidden');
  }

  claimDailyReward() {
    const pending = this.saveData._pendingDailyReward;
    if (!pending) return;
    this.saveData.coins = (this.saveData.coins||0)+pending.amount;
    this.saveData.lastDailyReward = Date.now();
    this.saveData.dailyStreak = pending.streak;
    delete this.saveData._pendingDailyReward;
    SaveData.save(this.saveData);
    document.getElementById('modal-daily').classList.add('hidden');
    this._showToast(`🎁 +${pending.amount} coins!`);
    this._updateHomeUI();
  }

  // ─── SETTINGS ───────────────────────────────────────────────────────────────
  toggleSFX() {
    this.audio.sfxOn = !this.audio.sfxOn;
    this.saveData.sfxEnabled = this.audio.sfxOn;
    SaveData.save(this.saveData);
    const btn = document.getElementById('toggle-sfx');
    btn.classList.toggle('on',  this.audio.sfxOn);
    btn.classList.toggle('off', !this.audio.sfxOn);
  }

  toggleMusic() {
    this.audio.musicOn = !this.audio.musicOn;
    this.saveData.musicEnabled = this.audio.musicOn;
    SaveData.save(this.saveData);
    if (!this.audio.musicOn) this.audio.stopBGM();
    else if (this.state==='playing') this.audio.startBGM();
    const btn = document.getElementById('toggle-music');
    btn.classList.toggle('on',  this.audio.musicOn);
    btn.classList.toggle('off', !this.audio.musicOn);
  }

  setQuality(level, el) {
    this.quality = level;
    this.saveData.quality = level;
    SaveData.save(this.saveData);
    document.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }

  resetData() {
    this.saveData = SaveData.reset();
    this._updateHomeUI();
    this._showToast('🗑️ Data reset!');
  }

  // ─── UTILITIES ──────────────────────────────────────────────────────────────
  _lerp(a, b, t) { return a + (b-a)*t; }
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
    ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
    ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }
  _hexToRgb(hex) {
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
const game = new CityDash();
window.game = game;
