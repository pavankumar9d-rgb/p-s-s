import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Preethi3DRunner {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.lanes = [-2.0, 0.0, 2.0];
        this.currentLane = 1; // Center lane
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
        this.slideDuration = 0.7;

        // Animation
        this.mixer = null;
        this.runAction = null;
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
            'models/preethi_running.glb',
            'assets/models/character/preethi_tpose.glb',
            'models/preethi_runner.glb'
        ];

        let gltf = null;
        for (const p of modelPaths) {
            try {
                gltf = await new Promise((resolve, reject) => loader.load(p, resolve, undefined, reject));
                if (gltf) {
                    console.log(`[Preethi3DRunner] Successfully loaded model from: ${p}`);
                    break;
                }
            } catch (_) {
                // try next
            }
        }

        if (gltf) {
            this.modelMesh = gltf.scene;
            
            // Normalize scale and orientation
            // In Subway Surfers, runner height is ~1.8m
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

            // Setup skeletal animation mixer if animations exist
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.modelMesh);
                this.runAction = this.mixer.clipAction(gltf.animations[0]);
                this.runAction.setEffectiveTimeScale(1.2);
                this.runAction.play();
                console.log(`[Preethi3DRunner] Playing animation clip: ${gltf.animations[0].name}`);
            }

            this.isLoaded = true;
        } else {
            console.warn("[Preethi3DRunner] Falling back to procedural runner placeholder.");
            this._buildFallbackMesh();
        }

        // Add contact shadow blob under runner
        const shadowGeo = new THREE.CircleGeometry(0.48, 20);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.02;
        this.group.add(this.shadow);
    }

    _buildFallbackMesh() {
        const bodyGeo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.35, 1.1, 4, 8) : new THREE.CylinderGeometry(0.35, 0.35, 1.4, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a5d78, roughness: 0.6 }); // Mauve dress
        const fallback = new THREE.Mesh(bodyGeo, bodyMat);
        fallback.position.y = 0.9;
        fallback.castShadow = true;
        this.group.add(fallback);
        this.modelMesh = fallback;
        this.isLoaded = true;
    }

    changeLane(direction) {
        // -1: Left, +1: Right
        const nextLane = this.currentLane + direction;
        if (nextLane >= 0 && nextLane < this.lanes.length) {
            this.currentLane = nextLane;
            this.targetX = this.lanes[this.currentLane];
        }
    }

    jump() {
        if (this.isGrounded && !this.isSliding) {
            this.vy = this.jumpVelocity;
            this.isGrounded = false;
        }
    }

    slide() {
        if (this.isGrounded && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.slideDuration;
            // Visual squash for slide
            if (this.modelMesh) {
                this.modelMesh.scale.set(1.1, 0.45, 1.1);
            }
        }
    }

    update(delta, isPlaying = true) {
        // 1. Skeletal animation update
        if (this.mixer && isPlaying) {
            this.mixer.update(delta);
        }

        // 2. Smooth lane change interpolation
        this.group.position.x += (this.targetX - this.group.position.x) * Math.min(1.0, delta * 14.0);

        // Subtle banking roll when switching lanes
        const dx = this.targetX - this.group.position.x;
        this.group.rotation.z = -dx * 0.12;

        // 3. Jump physics
        if (!this.isGrounded) {
            this.vy += this.gravity * delta;
            this.y += this.vy * delta;

            if (this.y <= 0.0) {
                this.y = 0.0;
                this.vy = 0.0;
                this.isGrounded = true;
            }
        }
        this.group.position.y = this.y;

        // 4. Slide recovery
        if (this.isSliding) {
            this.slideTimer -= delta;
            if (this.slideTimer <= 0.0) {
                this.isSliding = false;
                if (this.modelMesh) {
                    this.modelMesh.scale.set(0.9, 0.9, 0.9);
                }
            }
        }

        // 5. Update contact shadow scale & opacity with height
        if (this.shadow) {
            const hFactor = Math.max(0.1, 1.0 - this.y * 0.35);
            this.shadow.scale.set(hFactor, hFactor, 1.0);
            this.shadow.material.opacity = 0.35 * hFactor;
        }

        // 6. Update Hitbox
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
    }
}

