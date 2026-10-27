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
        
        // Physics & Jumping
        this.y = 0.0;
        this.vy = 0.0;
        this.gravity = -38.0;
        this.jumpVelocity = 13.5;
        this.isGrounded = true;

        // Sliding
        this.isSliding = false;
        this.slideTimer = 0.0;
        this.slideDuration = 0.85;

        // Flying / Jetpack
        this.isFlying = false;

        // Animation mixer & state clips
        this.mixer = null;
        this.actions = {};
        this.currentAction = null;
        this.isLoaded = false;
        this.modelMesh = null;

        // Collision bounds
        this.hitbox = new THREE.Box3();

        this._loadModel();
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

                    // Match keywords
                    if (name.includes('run')) this.actions['run'] = action;
                    else if (name.includes('jump')) this.actions['jump'] = action;
                    else if (name.includes('slide')) this.actions['slide'] = action;
                    else if (name.includes('idle')) this.actions['idle'] = action;
                    else if (name.includes('left')) this.actions['dodge_left'] = action;
                    else if (name.includes('right')) this.actions['dodge_right'] = action;
                    else if (name.includes('crash') || name.includes('stumble')) this.actions['crash'] = action;
                    else if (name.includes('fly')) this.actions['fly'] = action;
                });

                // Set jump and slide to play once and clamp
                ['jump', 'slide', 'crash', 'dodge_left', 'dodge_right'].forEach((k) => {
                    if (this.actions[k]) {
                        this.actions[k].setLoop(THREE.LoopOnce);
                        this.actions[k].clampWhenFinished = true;
                    }
                });

                // Start with pending or idle
                const initialAnim = this.pendingAnimation || 'idle';
                this.playAnimation(initialAnim);
            }

            this.isLoaded = true;
        }

        // Contact shadow blob
        const shadowGeo = new THREE.CircleGeometry(0.48, 20);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.02;
        this.group.add(this.shadow);
    }

    playAnimation(name, duration = 0.15) {
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
        const nextLane = this.currentLane + direction;
        if (nextLane >= 0 && nextLane < this.lanes.length) {
            this.currentLane = nextLane;
            this.targetX = this.lanes[this.currentLane];

            // Dodge animation if grounded
            if (this.isGrounded && !this.isSliding) {
                const dodgeKey = direction > 0 ? 'dodge_right' : 'dodge_left';
                if (this.actions[dodgeKey]) {
                    this.playAnimation(dodgeKey, 0.08);
                    setTimeout(() => {
                        if (this.isGrounded && !this.isSliding && this.currentAction === this.actions[dodgeKey]) {
                            this.playAnimation('run', 0.12);
                        }
                    }, 400);
                }
            }
        }
    }

    jump() {
        if (this.isGrounded && !this.isSliding) {
            this.vy = this.jumpVelocity;
            this.isGrounded = false;
            this.playAnimation('jump', 0.1);
        }
    }

    slide() {
        if (this.isGrounded && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.slideDuration;
            this.playAnimation('slide', 0.1);

            if (this.modelMesh) {
                this.modelMesh.scale.set(1.05, 0.5, 1.05);
            }
        }
    }

    crash() {
        this.playAnimation('crash', 0.1);
    }

    update(delta, isPlaying = true) {
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Smooth lane change
        this.group.position.x += (this.targetX - this.group.position.x) * Math.min(1.0, delta * 15.0);
        const dx = this.targetX - this.group.position.x;
        this.group.rotation.z = -dx * 0.12;

        // Jump physics
        if (!this.isGrounded) {
            this.vy += this.gravity * delta;
            this.y += this.vy * delta;

            if (this.y <= 0.0) {
                this.y = 0.0;
                this.vy = 0.0;
                this.isGrounded = true;
                if (isPlaying && !this.isSliding) {
                    this.playAnimation('run', 0.12);
                }
            }
        }
        this.group.position.y = this.y;

        // Slide timer recovery
        if (this.isSliding) {
            this.slideTimer -= delta;
            if (this.slideTimer <= 0.0) {
                this.isSliding = false;
                if (this.modelMesh) {
                    this.modelMesh.scale.set(0.9, 0.9, 0.9);
                }
                if (isPlaying && this.isGrounded) {
                    this.playAnimation('run', 0.15);
                }
            }
        }

        // Contact shadow
        if (this.shadow) {
            const hFactor = Math.max(0.1, 1.0 - this.y * 0.35);
            this.shadow.scale.set(hFactor, hFactor, 1.0);
            this.shadow.material.opacity = 0.35 * hFactor;
        }

        // Hitbox
        const hitHeight = this.isSliding ? 0.7 : 1.7;
        this.hitbox.min.set(this.group.position.x - 0.4, this.y, this.group.position.z - 0.4);
        this.hitbox.max.set(this.group.position.x + 0.4, this.y + hitHeight, this.group.position.z + 0.4);
    }

    reset() {
        this.currentLane = 1;
        this.targetX = 0.0;
        this.group.position.set(0, 0, 0);
        this.y = 0.0;
        this.vy = 0.0;
        this.isGrounded = true;
        this.isSliding = false;
        if (this.modelMesh) {
            this.modelMesh.scale.set(0.9, 0.9, 0.9);
        }
        this.playAnimation('run', 0.1);
    }
}
