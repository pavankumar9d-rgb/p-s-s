/**
 * Game.js
 * Main game loop controller. Sets up Three.js WebGL scene, camera, lights,
 * handles swipe and keyboard inputs, ticks physics, and coordinates collisions.
 */

import { Player } from './Player.js';
import { TrackManager } from './TrackManager.js';
import { VFXManager } from './VFXManager.js';
import { SoundManager } from './SoundManager.js';
import { UIManager } from '../ui/UIManager.js';
import { firebaseMock } from './FirebaseMock.js';
import { applySkinColors } from './PreethiRunner.js';
import { getPlayerHitBox, getObstacleHitBox, canPlayerPass, boxesOverlap } from './CollisionSystem.js';
import { EnvironmentBuilder } from './EnvironmentBuilder.js';

const STATE_MENU = "menu";
const STATE_PLAYING = "playing";
const STATE_PAUSED = "paused";
const STATE_GAMEOVER = "gameover";

class Game {
    constructor() {
        this.state = STATE_MENU;
        this.graphicsQuality = "med";
        
        // Game variables
        this.baseSpeed = 22.0;
        this.currentSpeed = 22.0;
        this.maxSpeed = 52.0;
        this.speedRamp = 0.0055; // Faster acceleration for premium runner feel
        
        this.distanceRun = 0.0;
        this.coinsCollected = 0;
        this.runScore = 0.0;
        this.multiplier = 1;
        
        // Invincibility frame on shield crash
        this.invincibilityTimer = 0.0;
        
        // Powerups timers (active remaining time in seconds)
        this.powerups = {
            magnet: 0.0,
            jetpack: 0.0,
            shield: 0.0
        };
        this.powerupDurations = {
            magnet: 10.0,
            jetpack: 8.0,
            shield: 15.0
        };
        
        // Web Audio manager
        this.soundManager = new SoundManager();
        
        // Create UIManager
        this.uiManager = new UIManager(this);
        
        this.envData = null;
        this.cameraShake = 0.0;
        this.cameraBasePos = new THREE.Vector3(0, 3.0, 4.4);
        this.cameraTargetLook = new THREE.Vector3(0, 1.1, -6.0);
        
        // Setup Three.js
        this._initEngine();
        
        // Create game systems
        this.player = new Player(this.scene);
        this.trackManager = new TrackManager(this.scene);
        this.vfxManager = new VFXManager(this.scene);
        
        // Input gesture handlers
        this._setupInputs();
        
        // Start rendering loops
        this.clock = new THREE.Clock();
        this._animate();
        
        // Show tutorial on first game start
        this.hasShownSwipeTutorial = false;
        
        // Synchronize initial settings buttons
        this.uiManager.updateQualityButtons(this.graphicsQuality);

        const profile = firebaseMock.getUserProfile();
        if (profile?.equippedSkin) {
            this.updatePlayerModelSkin(profile.equippedSkin);
        }
    }

    _initEngine() {
        const container = document.getElementById("game-canvas-container");
        this.scene = new THREE.Scene();
        
        // Warm daylight sky fallback
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.012);
        
        // Load custom background cityscape image
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('game_background_city.png', (texture) => {
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            this.scene.background = texture;
        }, undefined, (err) => {
            console.warn("Failed to load background texture, falling back to blue sky color.", err);
        });
        
        // Camera setup (Portrait perspective)
        this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.copy(this.cameraBasePos);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Warm daylight ambient
        const ambientLight = new THREE.AmbientLight(0xfff0e6, 1.35);
        this.scene.add(ambientLight);
        
        this.dirLight = new THREE.DirectionalLight(0xfff5cc, 2.8);
        this.dirLight.position.set(6, 18, 8);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 60;
        this.dirLight.shadow.camera.left = -10;
        this.dirLight.shadow.camera.right = 10;
        this.dirLight.shadow.camera.top = 20;
        this.dirLight.shadow.camera.bottom = -6;
        this.scene.add(this.dirLight);
        
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x554433, 1.0);
        this.scene.add(hemiLight);

        const fill = new THREE.DirectionalLight(0x88aaff, 0.45);
        fill.position.set(-8, 4, -6);
        this.scene.add(fill);

        // Window resize binding
        window.addEventListener('resize', () => this._onResize());
        
        // Build premium environment
        this.envData = EnvironmentBuilder.build(this.scene);
    }

    _tickEnvironment(dt) {
        EnvironmentBuilder.tick(this.envData, dt, this.currentSpeed, this.state === STATE_PLAYING);
    }

    _onResize() {
        const container = document.getElementById("game-canvas-container");
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    setGraphicsQuality(quality) {
        this.graphicsQuality = quality;
        if (quality === 'low') {
            this.renderer.shadowMap.enabled = false;
            this.scene.fog.density = 0.025;
            this.dirLight.castShadow = false;
            this.renderer.setPixelRatio(1.0);
        } else {
            this.renderer.shadowMap.enabled = true;
            this.scene.fog.density = 0.012;
            this.dirLight.castShadow = true;
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        }
    }

        // SWIPE CONTROL DETECTORS (Zero Latency Dispatch)
    _setupInputs() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let trackingTouchId = null;
        const container = document.getElementById("touch-swipe-zone") || document.getElementById("ui-layer");
        
        // Touch Listeners
        container.addEventListener("touchstart", (e) => {
            if (this.state !== STATE_PLAYING) return;
            const t = e.changedTouches[0];
            trackingTouchId = t.identifier;
            touchStartX = t.clientX;
            touchStartY = t.clientY;
            touchStartTime = performance.now();
        }, { passive: true });
        
        container.addEventListener("touchend", (e) => {
            if (this.state !== STATE_PLAYING) return;
            let t = null;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === trackingTouchId) {
                    t = e.changedTouches[i];
                    break;
                }
            }
            if (!t) t = e.changedTouches[0];
            const diffX = t.clientX - touchStartX;
            const diffY = t.clientY - touchStartY;
            const elapsed = performance.now() - touchStartTime;
            
            // Swipe thresholds: 40px length, within 350ms
            if (elapsed < 500) {
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    if (Math.abs(diffX) > 24) {
                        if (diffX > 0) this._handleSwipe("right");
                        else this._handleSwipe("left");
                    }
                } else {
                    if (Math.abs(diffY) > 24) {
                        if (diffY < 0) this._handleSwipe("up"); // Up swipe is negative Y in browser
                        else this._handleSwipe("down");
                    }
                }
            }
            trackingTouchId = null;
        }, { passive: true });

        // Pointer fallback for some Android webviews
        let pointerStartX = 0;
        let pointerStartY = 0;
        let pointerStartTime = 0;
        let activePointer = null;
        container.addEventListener("pointerdown", (e) => {
            if (this.state !== STATE_PLAYING) return;
            activePointer = e.pointerId;
            pointerStartX = e.clientX;
            pointerStartY = e.clientY;
            pointerStartTime = performance.now();
        }, { passive: true });
        container.addEventListener("pointerup", (e) => {
            if (this.state !== STATE_PLAYING || e.pointerId !== activePointer) return;
            const dx = e.clientX - pointerStartX;
            const dy = e.clientY - pointerStartY;
            const elapsed = performance.now() - pointerStartTime;
            if (elapsed < 500) {
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) {
                    this._handleSwipe(dx > 0 ? "right" : "left");
                } else if (Math.abs(dy) > 24) {
                    this._handleSwipe(dy < 0 ? "up" : "down");
                }
            }
            activePointer = null;
        }, { passive: true });

        // Keyboard Fallbacks
        window.addEventListener("keydown", (e) => {
            if (this.state !== STATE_PLAYING) return;
            switch (e.key) {
                case "ArrowLeft":
                case "a":
                case "A":
                    this._handleSwipe("left");
                    break;
                case "ArrowRight":
                case "d":
                case "D":
                    this._handleSwipe("right");
                    break;
                case "ArrowUp":
                case "w":
                case "W":
                case " ":
                    this._handleSwipe("up");
                    break;
                case "ArrowDown":
                case "s":
                case "S":
                    this._handleSwipe("down");
                    break;
            }
        });
    }

    _handleSwipe(dir) {
        if (!this.hasShownSwipeTutorial && dir === "up") {
            // Dismiss tutorial hint on swipe
            this.hasShownSwipeTutorial = true;
            document.getElementById("hud-swipe-hint").classList.add("opacity-0");
            setTimeout(() => document.getElementById("hud-swipe-hint").style.display = "none", 300);
        }

        if (dir === "left") {
            this.player.switchLane(-1);
            this.soundManager.playSwipe();
        } else if (dir === "right") {
            this.player.switchLane(1);
            this.soundManager.playSwipe();
        } else if (dir === "up") {
            this.player.jump();
            this.soundManager.playJump();
        } else if (dir === "down") {
            this.player.slide();
            this.soundManager.playSwipe();
        }
    }

    // GAME STATE TRANSITIONS
    startRun() {
        this.state = STATE_PLAYING;
        
        // Reset metrics
        this.distanceRun = 0.0;
        this.coinsCollected = 0;
        this.runScore = 0.0;
        
        // Fetch multipliers based on selected skin
        const profile = firebaseMock.getUserProfile();
        this.multiplier = profile.level * 2; // e.g. level 2 * 2 = multiplier x4
        
        // Fetch active duration upgrade levels
        const magnetLvl = profile.upgrades.magnet || 1;
        const jetpackLvl = profile.upgrades.jetpack || 1;
        const shieldLvl = profile.upgrades.shield || 1;
        
        this.powerupDurations.magnet = 6.0 + magnetLvl * 2.0; // 8s to 16s
        this.powerupDurations.jetpack = 5.0 + jetpackLvl * 1.5; // 6.5s to 12.5s
        this.powerupDurations.shield = 10.0 + shieldLvl * 3.0; // 13s to 25s
        
        this.currentSpeed = this.baseSpeed;
        this.invincibilityTimer = 0.0;
        
        // Reset timers
        Object.keys(this.powerups).forEach(k => this.powerups[k] = 0.0);
        
        // Clear old visual queues
        this.player.reset();
        this.trackManager.reset();
        this.vfxManager.clear();
        
        // Set camera starting position
        this.camera.position.copy(this.cameraBasePos);
        
        // Music beats trigger
        this.soundManager.adjustTempo(1.0);
        this.soundManager.startBGM();

        // Tutorial hint management
        const hint = document.getElementById("hud-swipe-hint");
        if (!this.hasShownSwipeTutorial) {
            hint.style.display = "flex";
            hint.classList.remove("opacity-0");
        } else {
            hint.style.display = "none";
        }
    }

    pauseRun() {
        this.state = STATE_PAUSED;
        this.soundManager.stopBGM();
    }

    resumeRun() {
        this.state = STATE_PLAYING;
        this.soundManager.startBGM();
    }

    exitRunToMenu() {
        this.state = STATE_MENU;
        this.soundManager.stopBGM();
    }

    // ANIMATION & PHYSICS TICK RUNNER (60 FPS TARGET)
    _animate() {
        requestAnimationFrame(() => this._animate());
        
        const dt = Math.min(0.05, this.clock.getDelta()); // Cap delta to avoid giant steps on frame lag
        
        if (this.state === STATE_PLAYING) {
            this._tickGameplay(dt);
        } else if (this.state === STATE_MENU) {
            this._tickMenuRotation(dt);
        }
        this._tickEnvironment(dt);
        
        // Process camera screen shakes
        this._updateCameraMotion(dt);

        this.renderer.render(this.scene, this.camera);
    }

    _tickMenuRotation(dt) {
        // Slow float of camera over track segment to make Home screen look alive
        const time = performance.now() * 0.0008;
        this.camera.position.x = Math.sin(time) * 0.6;
        this.camera.position.y = 3.0 + Math.sin(time * 2.0) * 0.25;
        this.camera.lookAt(new THREE.Vector3(0, 0.8, -6.0));
        
        // Make the mock character rotate/breathe in menu
        if (this.player) {
            this.player.mesh.rotation.y = Math.sin(time * 1.5) * 0.15;
            this.player.mesh.position.y = 0.75 + Math.sin(time * 3.0) * 0.03;
        }
    }

    _tickGameplay(dt) {
        // 1. Tick power-up timings
        this._tickPowerups(dt);

        // 2. Adjust speed based on distance
        this.distanceRun += this.currentSpeed * dt;
        this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distanceRun * this.speedRamp));
        
        // Speed up music beat
        const speedRatio = this.currentSpeed / this.baseSpeed;
        this.soundManager.adjustTempo(speedRatio);
        
        // 3. Accumulate Score: distance * multiplier
        this.runScore += this.currentSpeed * dt * this.multiplier;
        
        // 4. Update HUD values
        this.uiManager.updateHUDScores(this.runScore, this.distanceRun, this.multiplier, this.coinsCollected);
        
        // Speed lines VFX overlay visibility at extreme speeds
        const speedOverlay = document.getElementById("speed-lines-overlay");
        if (speedOverlay) {
            if (this.currentSpeed > 24.0 || this.player.isJetpacking) {
                speedOverlay.style.opacity = this.player.isJetpacking ? "0.65" : "0.3";
            } else {
                speedOverlay.style.opacity = "0.0";
            }
        }

        // 5. Update game systems
        this.player.update(dt, speedRatio, this.soundManager, this.vfxManager);
        this.trackManager.update(dt, this.currentSpeed, this.player, this.soundManager, this.vfxManager);
        this.vfxManager.update(dt, this.player.position, this.graphicsQuality);
        
        // Invincibility ticks
        if (this.invincibilityTimer > 0.0) {
            this.invincibilityTimer -= dt;
        }

        // 6. Check collisions
        this._checkCollisions();
    }

    _tickPowerups(dt) {
        // Magnet
        if (this.powerups.magnet > 0.0) {
            this.powerups.magnet -= dt;
            this.player.isMagnetActive = true;
            this.uiManager.updateHUDPowerUpTimer("magnet", this.powerups.magnet, this.powerupDurations.magnet);
        } else {
            this.player.isMagnetActive = false;
        }

        // Jetpack
        if (this.powerups.jetpack > 0.0) {
            this.powerups.jetpack -= dt;
            this.player.isJetpacking = true;
            this.uiManager.updateHUDPowerUpTimer("jetpack", this.powerups.jetpack, this.powerupDurations.jetpack);
            
            // If jetpack sound handle exists, it runs. Handled by SoundManager
            if (this.powerups.jetpack <= 0.0) {
                // Jetpack expired: shut down thruster sound and return player
                this.player.isJetpacking = false;
                if (this.jetpackAudio) {
                    this.jetpackAudio.stop();
                    this.jetpackAudio = null;
                }
                this.soundManager.playSwipe(); // drop whoosh
            }
        }

        // Hoverboard Shield
        if (this.powerups.shield > 0.0) {
            this.powerups.shield -= dt;
            this.player.setHoverboardActive(true);
            this.vfxManager.setShieldState(true, this.player.position);
            this.uiManager.updateHUDPowerUpTimer("shield", this.powerups.shield, this.powerupDurations.shield);
            
            if (this.powerups.shield <= 0.0) {
                this.player.setHoverboardActive(false);
                this.vfxManager.setShieldState(false);
            }
        }
    }

    // ADVANCED Pseudo-3D Heights & AABB Bounding Collisions
    _checkCollisions() {
        const playerBox = getPlayerHitBox(this.player);
        let groundedHeight = 0.75;
        let onTrain = false;

        this.trackManager.activeSegments.forEach((seg) => {
            seg.items.forEach((item) => {
                if (!item.mesh.visible) return;
                const dist = item.mesh.position.distanceTo(this.player.position);
                if (dist < 1.0) this._collectItem(item);
            });

            seg.obstacles.forEach((o) => {
                if (!o.mesh.visible) return;

                if (o.type === 'ramp' && o.lane === this.player.currentLane) {
                    const playerZ = this.player.position.z;
                    const rampZ = o.mesh.position.z;
                    if (playerZ < rampZ + 2.0 && playerZ > rampZ - 2.0) {
                        const ratio = ((rampZ + 2.0) - playerZ) / 4.0;
                        const rampY = 0.25 + ratio * 0.9;
                        groundedHeight = Math.max(groundedHeight, rampY + 0.5);
                        onTrain = true;
                    }
                }

                if (o.type === 'train' && o.lane === this.player.currentLane) {
                    const playerZ = this.player.position.z;
                    const trainZ = o.mesh.position.z;
                    if (playerZ < trainZ + 6.2 && playerZ > trainZ - 6.2) {
                        if (this.player.position.y >= 2.0) {
                            groundedHeight = Math.max(groundedHeight, 2.25 + 0.75);
                            onTrain = true;
                        }
                    }
                }

                const oBox = getObstacleHitBox(o);
                if (!boxesOverlap(playerBox, oBox)) return;

                if (canPlayerPass(this.player, o)) return;
                if (o.type === 'train' && onTrain) return;
                if (o.type === 'ramp') return;

                this._handlePlayerCrash(o);
            });
        });

        if (onTrain) {
            this.player.isGrounded = this.player.position.y <= groundedHeight;
            if (this.player.isGrounded) {
                this.player.position.y = groundedHeight;
                this.player.vy = 0.0;
            }
        } else if (this.player.position.y > 0.75 && this.player.isGrounded && !this.player.isJetpacking) {
            this.player.isGrounded = false;
            this.player.vy = 0.0;
        }
    }

    _collectItem(item) {
        item.mesh.visible = false;
        
        if (item.type === "coin") {
            this.coinsCollected += 1;
            this.runScore += 50 * this.multiplier;
            this.soundManager.playCoin();
            this.vfxManager.createCoinSparks(item.mesh.position.x, item.mesh.position.y, item.mesh.position.z);
        } else if (item.type === "gem") {
            // Add gem directly to account
            firebaseMock.addGems(1);
            this.soundManager.playCoin();
            this.vfxManager.createCoinSparks(item.mesh.position.x, item.mesh.position.y, item.mesh.position.z);
        } else if (item.type === "powerup") {
            const type = item.subtype;
            this.soundManager.playSwipe(); // Activation chirp
            
            // Set timers
            this.powerups[type] = this.powerupDurations[type];
            
            if (type === "jetpack") {
                this.player.isJetpacking = true;
                
                // Play launch thruster sound
                if (this.jetpackAudio) this.jetpackAudio.stop();
                this.jetpackAudio = this.soundManager.playJetpack(this.powerupDurations.jetpack);
                
                // Trigger launch screen shake
                this.cameraShake = 0.8;
            }
        }
    }

    _handlePlayerCrash(obstacle) {
        if (this.invincibilityTimer > 0.0) return; // Immune to collision damage

        if (this.powerups.shield > 0.0) {
            // Hoverboard shield Save!
            this.powerups.shield = 0.0; // Terminate shield
            this.player.setHoverboardActive(false);
            this.vfxManager.setShieldState(false);
            
            this.soundManager.playShieldHit();
            this.vfxManager.triggerShieldHit();
            
            // Grant short invincibility to clear the obstacle
            this.invincibilityTimer = 1.3;
            
            // Hide the hit obstacle to clear the path
            obstacle.mesh.visible = false;
            
            // Camera impact shake
            this.cameraShake = 0.45;
        } else {
            // Game Over crash death!
            this.state = STATE_GAMEOVER;
            this.soundManager.playCrash();
            
            // Heavy camera shake
            this.cameraShake = 1.2;
            
            // Save local storage profile run stats
            const result = firebaseMock.saveRunStats(
                this.runScore,
                this.distanceRun,
                this.coinsCollected
            );
            
            // Render Game Over metrics
            setTimeout(() => {
                this.uiManager.triggerGameOverDisplay(
                    this.runScore,
                    this.distanceRun,
                    this.coinsCollected,
                    firebaseMock.userData.highScore
                );
            }, 1000);
        }
    }

    // CAMERA MOTION INTERPOLATION
    _updateCameraMotion(dt) {
        let targetCamPos = this.cameraBasePos.clone();
        let targetLookAt = this.cameraTargetLook.clone();

        if (this.state === STATE_PLAYING) {
            if (this.player.isJetpacking) {
                // Jetpack Flight Mode: camera moves high and tilts down
                targetCamPos.set(this.player.position.x * 0.4, 7.5, 6.0);
                targetLookAt.set(this.player.position.x, 3.0, -10.0);
            } else {
                // Normal Gameplay Mode: track character smoothly
                // Roll camera slightly on lane switches (centrifugal lean)
                const targetRoll = -this.player.mesh.rotation.z * 0.8;
                this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * dt * 8.0;
                
                // Speed Zoom: pull camera back slightly as runner accelerates
                const zoomFactor = 1.0 + (this.currentSpeed / this.maxSpeed) * 0.25;
                targetCamPos.set(this.player.position.x * 0.45, 3.2 + (this.player.position.y - 0.75) * 0.5, 4.8 * zoomFactor);
                targetLookAt.set(this.player.position.x * 0.8, 1.2 + (this.player.position.y - 0.75) * 0.4, -5.0);
                
                // Velocity FOV adjustment
                const targetFOV = 68 + (this.currentSpeed / this.maxSpeed) * 18;
                if (this.camera.fov !== targetFOV) {
                    this.camera.fov += (targetFOV - this.camera.fov) * dt * 5.0;
                    this.camera.updateProjectionMatrix();
                }
            }
        }

        // Camera Shake effect processing
        if (this.cameraShake > 0.0) {
            this.cameraShake -= dt * 2.0; // Decay shake over time
            const shake = this.cameraShake * 0.15;
            this.camera.position.x = targetCamPos.x + (Math.random() - 0.5) * shake;
            this.camera.position.y = targetCamPos.y + (Math.random() - 0.5) * shake;
            this.camera.position.z = targetCamPos.z + (Math.random() - 0.5) * shake;
        } else {
            // Smooth Camera interpolation (lerp)
            this.camera.position.lerp(targetCamPos, dt * 5.0);
        }
        
        // Update camera view vector
        const lookDir = new THREE.Vector3();
        lookDir.lerpVectors(this.cameraTargetLook, targetLookAt, 0.5);
        this.camera.lookAt(lookDir);
    }

    updatePlayerModelSkin(skinId) {
        if (!this.player || !this.player.mesh) return;
        applySkinColors(this.player.mesh, skinId);
        if (this.uiManager.charPreview) {
            this.uiManager.charPreview.setSkin(skinId);
        }
    }
}

export { Game };
export default Game;

// Auto-boot the game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
});
