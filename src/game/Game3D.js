import * as THREE from 'three';
import { Preethi3DRunner } from './Preethi3DRunner.js';
import { Environment3DManager } from './Environment3DManager.js';

export const STATE_MENU = 'MENU';
export const STATE_PLAYING = 'PLAYING';
export const STATE_GAMEOVER = 'GAMEOVER';

export class Game3D {
    constructor() {
        this.state = STATE_MENU;
        this.container = document.getElementById('game-canvas-container');
        
        // Game variables
        this.baseSpeed = 22.0;
        this.speed = this.baseSpeed;
        this.maxSpeed = 50.0;
        this.speedRamp = 0.04;
        
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.highScore = parseInt(localStorage.getItem('preethi_highscore') || '0', 10);
        
        this.cameraOffset = new THREE.Vector3(0, 3.8, 5.2);
        this.cameraTarget = new THREE.Vector3(0, 1.2, -6.0);
        this.cameraShake = 0.0;

        this._initAudio();
        this._initThree();
        this._initEntities();
        this._initInputs();
        this._initUI();

        this.clock = new THREE.Clock();
        this._animate();
    }

    _initAudio() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();
        } catch (_) {
            this.audioCtx = null;
        }
    }

    _playSound(type) {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'jump') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(540, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        }
    }

    _initThree() {
        this.scene = new THREE.Scene();
        
        // Golden hour twilight sky & fog
        this.scene.background = new THREE.Color(0xa5c4e8);
        this.scene.fog = new THREE.Fog(0xa5c4e8, 30.0, 110.0);

        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 400);
        this.camera.position.copy(this.cameraOffset);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffeedd, 1.3);
        this.scene.add(ambient);

        this.sunLight = new THREE.DirectionalLight(0xfff0cc, 3.2);
        this.sunLight.position.set(12, 28, 16);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 1.0;
        this.sunLight.shadow.camera.far = 80;
        this.sunLight.shadow.camera.left = -15;
        this.sunLight.shadow.camera.right = 15;
        this.sunLight.shadow.camera.top = 25;
        this.sunLight.shadow.camera.bottom = -10;
        this.scene.add(this.sunLight);

        const fillLight = new THREE.DirectionalLight(0x88bbff, 0.6);
        fillLight.position.set(-10, 8, -10);
        this.scene.add(fillLight);

        window.addEventListener('resize', () => this._onResize());
    }

    _initEntities() {
        this.environment = new Environment3DManager(this.scene);
        this.runner = new Preethi3DRunner(this.scene);
        this.environment.spawnObstaclePattern(-30);
        this.environment.spawnObstaclePattern(-60);
    }

    _initInputs() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (this.state === STATE_MENU && (e.code === 'Space' || e.code === 'Enter')) {
                this.startGame();
                return;
            }
            if (this.state !== STATE_PLAYING) return;

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.runner.changeLane(-1);
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.runner.changeLane(1);
            } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
                this.runner.jump();
                this._playSound('jump');
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.runner.slide();
            }
        });

        // Touch & Mouse Swipe
        let startX = 0;
        let startY = 0;
        let touchActive = false;

        const onTouchStart = (x, y) => {
            startX = x;
            startY = y;
            touchActive = true;
        };

        const onTouchEnd = (endX, endY) => {
            if (!touchActive) return;
            touchActive = false;
            const dx = endX - startX;
            const dy = endY - startY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (Math.max(absX, absY) < 25) return; // Ignore tap

            if (absX > absY) {
                // Horizontal swipe
                if (dx > 0) this.runner.changeLane(1);
                else this.runner.changeLane(-1);
            } else {
                // Vertical swipe
                if (dy < 0) {
                    this.runner.jump();
                    this._playSound('jump');
                } else {
                    this.runner.slide();
                }
            }
        };

        this.container.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            onTouchStart(t.clientX, t.clientY);
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0];
            onTouchEnd(t.clientX, t.clientY);
        }, { passive: true });

        this.container.addEventListener('mousedown', (e) => {
            onTouchStart(e.clientX, e.clientY);
        });

        this.container.addEventListener('mouseup', (e) => {
            onTouchEnd(e.clientX, e.clientY);
        });
    }

    _initUI() {
        this.ui = {
            menuScreen: document.getElementById('screen-menu'),
            hudScreen: document.getElementById('screen-hud'),
            gameoverScreen: document.getElementById('screen-gameover'),
            btnPlay: document.getElementById('btn-play-run'),
            btnRestart: document.getElementById('btn-play-again'),
            scoreLabel: document.getElementById('hud-score'),
            coinsLabel: document.getElementById('hud-coins'),
            distanceLabel: document.getElementById('hud-distance'),
            finalScoreLabel: document.getElementById('gameover-score'),
            finalCoinsLabel: document.getElementById('gameover-coins'),
            highScoreLabel: document.getElementById('gameover-highscore')
        };

        if (this.ui.btnPlay) {
            this.ui.btnPlay.addEventListener('click', () => this.startGame());
        }
        if (this.ui.btnRestart) {
            this.ui.btnRestart.addEventListener('click', () => this.restartGame());
        }
    }

    startGame() {
        this.state = STATE_PLAYING;
        if (this.ui.menuScreen) this.ui.menuScreen.classList.add('hidden');
        if (this.ui.gameoverScreen) this.ui.gameoverScreen.classList.add('hidden');
        if (this.ui.hudScreen) this.ui.hudScreen.classList.remove('hidden');
        this.speed = this.baseSpeed;
        this.runner.reset();
        this._playSound('jump');
    }

    restartGame() {
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.speed = this.baseSpeed;
        this.environment.reset();
        this.runner.reset();
        this.startGame();
    }

    onCrash() {
        this.state = STATE_GAMEOVER;
        this.cameraShake = 0.55;
        this._playSound('crash');
        if (this.runner) this.runner.crash();

        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('preethi_highscore', this.highScore.toString());
        }

        if (this.ui.finalScoreLabel) this.ui.finalScoreLabel.textContent = Math.floor(this.score).toLocaleString();
        if (this.ui.finalCoinsLabel) this.ui.finalCoinsLabel.textContent = this.coins.toLocaleString();
        if (this.ui.highScoreLabel) this.ui.highScoreLabel.textContent = this.highScore.toLocaleString();

        setTimeout(() => {
            if (this.ui.hudScreen) this.ui.hudScreen.classList.add('hidden');
            if (this.ui.gameoverScreen) this.ui.gameoverScreen.classList.remove('hidden');
        }, 600);
    }

    _onResize() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.state === STATE_PLAYING) {
            // Speed progression
            this.speed = Math.min(this.maxSpeed, this.speed + this.speedRamp * delta);

            // Progress distance & score
            const runDist = this.speed * delta;
            this.distance += runDist;
            this.score += runDist * 1.5;

            // Update runner
            this.runner.update(delta, true);

            // Move runner forward along -Z
            this.runner.group.position.z -= runDist;

            // Update track & recycle
            this.environment.update(
                delta,
                this.runner.group.position.z,
                this.speed,
                () => {
                    this.coins += 1;
                    this.score += 60;
                    this._playSound('coin');
                },
                () => this.onCrash()
            );

            // Check collisions
            this.environment.checkCollisions(
                this.runner.hitbox,
                () => {
                    this.coins += 1;
                    this.score += 60;
                    this._playSound('coin');
                },
                (type) => this.onCrash()
            );

            // Update HUD
            if (this.ui.scoreLabel) this.ui.scoreLabel.textContent = Math.floor(this.score);
            if (this.ui.coinsLabel) this.ui.coinsLabel.textContent = this.coins;
            if (this.ui.distanceLabel) this.ui.distanceLabel.textContent = `${Math.floor(this.distance)}m`;

        } else if (this.state === STATE_MENU) {
            // Idle camera slow bob
            this.runner.update(delta, false);
        }

        // Camera Follow Runner
        const runnerZ = this.runner.group.position.z;
        this.camera.position.x = this.runner.group.position.x * 0.4;
        this.camera.position.y = this.cameraOffset.y + this.runner.y * 0.35;
        this.camera.position.z = runnerZ + this.cameraOffset.z;

        // Camera Shake
        if (this.cameraShake > 0.0) {
            this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
            this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
            this.cameraShake = Math.max(0.0, this.cameraShake - delta * 2.0);
        }

        this.camera.lookAt(
            this.runner.group.position.x * 0.25,
            this.cameraTarget.y + this.runner.y * 0.2,
            runnerZ + this.cameraTarget.z
        );

        // Sun light follows runner along Z
        this.sunLight.position.z = runnerZ + 16;
        this.sunLight.target.position.z = runnerZ;
        this.sunLight.target.updateMatrixWorld();

        this.renderer.render(this.scene, this.camera);
    }
}

// Start Game on page load
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game3D();
});

