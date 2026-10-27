import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Preethi3DRunner {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.lanes = [-2.0, 0.0, 2.0];
        this.currentLane = 1;
        this.targetX = 0.0;
        
        // Exact Subway Surfers Kinematics
        this.y = 0.0;
        this.vy = 0.0;
        this.gravity = -46.0;         // Crisp, athletic gravity
        this.jumpVelocity = 15.2;     // 2.5m apex height
        this.diveVelocity = -34.0;    // Fast-fall downward dive
        this.isGrounded = true;
        this.divePendingSlide = false;

        // Sliding
        this.isSliding = false;
        this.slideTimer = 0.0;
        this.slideDuration = 0.75;    // Standard Subway Surfers slide duration

        // Dodging (Delta-time clock driven, zero setTimeout)
        this.dodgeTimer = 0.0;

        // Powerup States & Buffs
        this.hasHoverboard = false;
        this.hoverboardTimer = 0.0;
        this.hoverboardMesh = null;

        this.hasJetpack = false;
        this.jetpackTimer = 0.0;
        this.targetJetpackY = 6.2;

        this.hasMagnet = false;
        this.magnetTimer = 0.0;

        this.isInvincible = false;
        this.invincibleTimer = 0.0;

        // Animation mixer & state clips
        this.mixer = null;
        this.actions = {};
        this.currentAction = null;
        this.isLoaded = false;
        this.modelMesh = null;
        this.pendingAnimation = null;

        // Collision bounds
        this.hitbox = new THREE.Box3();

        this._createHoverboardMesh();
        this._loadModel();
    }

    _createHoverboardMesh() {
        const boardGroup = new THREE.Group();
        
        // Sleek cyber/street hoverboard
        const deckGeo = new THREE.BoxGeometry(0.55, 0.06, 1.35);
        const deckMat = new THREE.MeshStandardMaterial({
            color: 0x9c27b0,
            metalness: 0.8,
            roughness: 0.2
        });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.y = 0.08;
        boardGroup.add(deck);

        // Neon edge rails
        const railMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 0.8
        });
        [-0.26, 0.26].forEach((rx) => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.3), railMat);
            rail.position.set(rx, 0.08, 0);
            boardGroup.add(rail);
        });

        // Thruster glow discs
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        [-0.45, 0.45].forEach((tz) => {
            const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), thrusterMat);
            disc.position.set(0, 0.03, tz);
            boardGroup.add(disc);
        });

        boardGroup.visible = false;
        this.hoverboardMesh = boardGroup;
        this.group.add(boardGroup);
    }

    async _loadModel() {
        const loader = new GLTFLoader();
        const modelPaths = [
            'assets/models/character/preethi_running.glb',
            'models/preethi_running.glb'
        ];

        let gltf = null;
        for (const p of modelPaths) {
            try {
                gltf = await new Promise((resolve, reject) => loader.load(p, resolve, undefined, reject));
                if (gltf) {
                    console.log(`[Preethi3DRunner] Successfully loaded model from: ${p}`);
                    break;
                }
            } catch (_) {}
        }

        if (gltf) {
            this.modelMesh = gltf.scene;
            this.modelMesh.scale.set(0.9, 0.9, 0.9);
            this.modelMesh.rotation.y = Math.PI; // Face towards -Z (running direction)
            this.modelMesh.position.set(0, 0, 0);

            this.modelMesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.roughness = 0.6;
                        child.material.metalness = 0.1;
                    }
                }
            });

            this.group.add(this.modelMesh);

            // Setup skeletal animation clips
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.modelMesh);
                gltf.animations.forEach((clip) => {
                    const action = this.mixer.clipAction(clip);
                    const name = clip.name.toLowerCase();
                    this.actions[name] = action;

                    // Keyword retargeting
                    if (name.includes('run')) this.actions['run'] = action;
                    else if (name.includes('jump')) this.actions['jump'] = action;
                    else if (name.includes('slide')) this.actions['slide'] = action;
                    else if (name.includes('idle')) this.actions['idle'] = action;
                    else if (name.includes('left')) this.actions['dodge_left'] = action;
                    else if (name.includes('right')) this.actions['dodge_right'] = action;
                    else if (name.includes('crash') || name.includes('stumble')) this.actions['crash'] = action;
                    else if (name.includes('fly')) this.actions['fly'] = action;
                });

                ['jump', 'slide', 'crash', 'dodge_left', 'dodge_right'].forEach((k) => {
                    if (this.actions[k]) {
                        this.actions[k].setLoop(THREE.LoopOnce);
                        this.actions[k].clampWhenFinished = true;
                    }
                });

                const initialAnim = this.pendingAnimation || 'idle';
                this.playAnimation(initialAnim);
            }

            this.isLoaded = true;
        }

        // Dynamic Contact Shadow Blob
        const shadowGeo = new THREE.CircleGeometry(0.48, 24);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.02;
        this.group.add(this.shadow);
    }

    playAnimation(name, duration = 0.12) {
        if (!this.actions || !this.actions[name]) {
            this.pendingAnimation = name;
            return;
        }
        const nextAction = this.actions[name];

        if (this.currentAction && this.currentAction !== nextAction) {
            this.currentAction.fadeOut(duration);
        }

        nextAction.reset().fadeIn(duration).play();
        this.currentAction = nextAction;
    }

    changeLane(direction) {
        const nextLane = THREE.MathUtils.clamp(this.currentLane + direction, 0, this.lanes.length - 1);
        if (nextLane !== this.currentLane) {
            this.currentLane = nextLane;
            this.targetX = this.lanes[this.currentLane];

            // Dodge lean & animation if grounded and not sliding
            if (this.isGrounded && !this.isSliding && !this.hasJetpack) {
                const dodgeKey = direction > 0 ? 'dodge_right' : 'dodge_left';
                if (this.actions[dodgeKey]) {
                    this.playAnimation(dodgeKey, 0.06);
                    this.dodgeTimer = 0.32;
                }
            }
        }
    }

    jump() {
        if (this.hasJetpack) return;

        // Cancel slide immediately on jump (classic Subway Surfers mechanic)
        if (this.isSliding) {
            this.isSliding = false;
            this.slideTimer = 0.0;
        }

        if (this.isGrounded) {
            this.vy = this.jumpVelocity;
            this.isGrounded = false;
            this.dodgeTimer = 0.0;
            this.playAnimation('jump', 0.08);
        }
    }

    slide() {
        if (this.hasJetpack) return;

        // Air Dive / Fast Fall: swipe down in mid-air immediately accelerates downward
        if (!this.isGrounded) {
            this.vy = this.diveVelocity;
            this.divePendingSlide = true;
            return;
        }

        // Ground slide
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        this.dodgeTimer = 0.0;
        this.playAnimation('slide', 0.08);
    }

    crash() {
        this.playAnimation('crash', 0.08);
    }

    activateHoverboard(duration = 25.0) {
        this.hasHoverboard = true;
        this.hoverboardTimer = duration;
        if (this.hoverboardMesh) this.hoverboardMesh.visible = true;
    }

    activateJetpack(duration = 8.0) {
        this.hasJetpack = true;
        this.jetpackTimer = duration;
        this.isGrounded = false;
        this.isSliding = false;
        this.playAnimation('fly', 0.2);
    }

    activateMagnet(duration = 10.0) {
        this.hasMagnet = true;
        this.magnetTimer = duration;
    }

    breakHoverboardShield() {
        this.hasHoverboard = false;
        this.hoverboardTimer = 0.0;
        if (this.hoverboardMesh) this.hoverboardMesh.visible = false;
        
        // 1.8s invulnerability buffer after shield break
        this.isInvincible = true;
        this.invincibleTimer = 1.8;
    }

    update(delta, isPlaying = true, speed = 20.0) {
        if (this.mixer) {
            // Dynamic stride rate: match leg frequency to forward ground velocity
            if (this.currentAction === this.actions['run']) {
                this.mixer.timeScale = Math.max(1.0, speed / 19.5);
            } else {
                this.mixer.timeScale = 1.0;
            }
            this.mixer.update(delta);
        }

        // Snappy Hermite lane interpolation
        const laneLerp = Math.min(1.0, delta * 18.0);
        this.group.position.x += (this.targetX - this.group.position.x) * laneLerp;

        // Athletic banking (yaw into lane direction, roll bank)
        const dx = this.targetX - this.group.position.x;
        this.group.rotation.y = Math.PI + dx * 0.16;
        this.group.rotation.z = -dx * 0.12;

        // Hoverboard timer & bob
        if (this.hasHoverboard) {
            this.hoverboardTimer -= delta;
            if (this.hoverboardTimer <= 0) {
                this.breakHoverboardShield();
            } else if (this.hoverboardMesh) {
                this.hoverboardMesh.rotation.y += delta * 2.0;
            }
        }

        // Invulnerability flicker
        if (this.isInvincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                if (this.modelMesh) this.modelMesh.visible = true;
            } else if (this.modelMesh) {
                this.modelMesh.visible = Math.floor(Date.now() / 80) % 2 === 0;
            }
        }

        // Jetpack propulsion mechanics
        if (this.hasJetpack) {
            this.jetpackTimer -= delta;
            // Ascend smoothly to target altitude
            this.y += (this.targetJetpackY - this.y) * Math.min(1.0, delta * 6.0);
            if (this.jetpackTimer <= 0) {
                this.hasJetpack = false;
                this.vy = 0.0;
                this.playAnimation('jump', 0.15);
            }
        } else {
            // Regular Jump & Gravity Physics
            if (!this.isGrounded) {
                this.vy += this.gravity * delta;
                this.y += this.vy * delta;

                if (this.y <= 0.0) {
                    this.y = 0.0;
                    this.vy = 0.0;
                    this.isGrounded = true;

                    // Transition to slide if dive was triggered, else run
                    if (this.divePendingSlide) {
                        this.divePendingSlide = false;
                        this.isSliding = true;
                        this.slideTimer = this.slideDuration;
                        this.playAnimation('slide', 0.06);
                    } else if (isPlaying && !this.isSliding) {
                        this.playAnimation('run', 0.1);
                    }
                }
            }
        }
        this.group.position.y = this.y;

        // Slide timer & recovery (Preserving 3D model scale!)
        if (this.isSliding) {
            this.slideTimer -= delta;
            if (this.slideTimer <= 0.0) {
                this.isSliding = false;
                if (isPlaying && this.isGrounded) {
                    this.playAnimation('run', 0.12);
                }
            }
        }

        // Dodge timer recovery
        if (this.dodgeTimer > 0.0) {
            this.dodgeTimer -= delta;
            if (this.dodgeTimer <= 0.0 && this.isGrounded && !this.isSliding && isPlaying) {
                this.playAnimation('run', 0.1);
            }
        }

        // Magnet timer
        if (this.hasMagnet) {
            this.magnetTimer -= delta;
            if (this.magnetTimer <= 0) this.hasMagnet = false;
        }

        // Contact shadow opacity and radius
        if (this.shadow) {
            const hFactor = Math.max(0.08, 1.0 - (this.y / 5.0) * 0.8);
            this.shadow.scale.set(hFactor, hFactor, 1.0);
            this.shadow.material.opacity = 0.38 * hFactor;
        }

        // Hitbox calibration: Forgiving Subway Surfers dimensions
        const hitWidth = 0.32;
        const hitHeight = this.isSliding ? 0.65 : 1.75;
        this.hitbox.min.set(this.group.position.x - hitWidth, this.y, this.group.position.z - 0.38);
        this.hitbox.max.set(this.group.position.x + hitWidth, this.y + hitHeight, this.group.position.z + 0.38);
    }

    reset() {
        this.currentLane = 1;
        this.targetX = 0.0;
        this.group.position.set(0, 0, 0);
        this.y = 0.0;
        this.vy = 0.0;
        this.isGrounded = true;
        this.isSliding = false;
        this.dodgeTimer = 0.0;
        this.divePendingSlide = false;
        this.hasHoverboard = false;
        this.hasJetpack = false;
        this.hasMagnet = false;
        this.isInvincible = false;
        if (this.hoverboardMesh) this.hoverboardMesh.visible = false;
        if (this.modelMesh) {
            this.modelMesh.visible = true;
            this.modelMesh.scale.set(0.9, 0.9, 0.9);
        }
        this.playAnimation('run', 0.1);
    }
}
