/**
 * Player.js — Phase 2 photo-rigged Preethi runner with pro animations.
 */

import {
    buildPreethiRunner,
    STATE_RUN,
    STATE_JUMP,
    STATE_SLIDE,
    STATE_JETPACK,
    STATE_LAND
} from './PreethiRunner.js';

class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);

        this.parts = {};
        this.anim = null;
        this.ready = false;

        this.lanes = [-2.0, 0.0, 2.0];
        this.currentLane = 1;
        this.targetX = 0.0;
        this.position = new THREE.Vector3(0, 0.75, 0);

        this.vy = 0.0;
        this.gravity = -34.0;
        this.jumpVelocity = 11.2;
        this.isGrounded = true;

        this.laneSwitchDuration = 0.1;
        this.laneSwitchTimer = 0.0;
        this.startX = 0.0;

        this.isSliding = false;
        this.slideDuration = 0.72;
        this.slideTimer = 0.0;

        this.isJetpacking = false;
        this.jetpackY = 5.8;

        this.squashStretchScale = new THREE.Vector3(1, 1, 1);
        this.isMagnetActive = false;

        this._loadRunner();
    }

    async _loadRunner() {
        try {
            const runner = await buildPreethiRunner();
            this.mesh.add(runner.mesh);
            this.parts = runner.parts;
            this.anim = runner.anim;
            this.jetpack = runner.parts.jetpack;
            this.boardMesh = runner.parts.boardMesh;
            this.ready = true;
            this.reset();
        } catch (e) {
            console.error('Failed to load Preethi runner', e);
        }
    }

    reset() {
        this.currentLane = 1;
        this.targetX = 0.0;
        this.position.set(0, 0.75, 0);
        this.mesh.position.copy(this.position);

        this.vy = 0.0;
        this.isGrounded = true;
        this.isSliding = false;
        this.slideTimer = 0;
        this.isJetpacking = false;
        if (this.jetpack) this.jetpack.visible = false;
        if (this.boardMesh) this.boardMesh.visible = false;
        this.squashStretchScale.set(1, 1, 1);
        this.mesh.scale.set(1, 1, 1);
        this.mesh.rotation.set(0, 0, 0);
        if (this.parts.bodyPlane) this.parts.bodyPlane.scale.set(1, 1, 1);
        if (this.anim) this.anim.setState(STATE_RUN);
    }

    switchLane(direction) {
        const old = this.currentLane;
        this.currentLane = Math.max(0, Math.min(2, this.currentLane + direction));
        if (old !== this.currentLane) {
            this.targetX = this.lanes[this.currentLane];
            this.startX = this.position.x;
            this.laneSwitchTimer = 0.0;
            this.squashStretchScale.set(0.8, 1.1, 1);
        }
    }

    jump() {
        if (this.isJetpacking || !this.isGrounded) return;
        this.isSliding = false;
        this.slideTimer = 0;
        this.squashStretchScale.set(1.25, 0.62, 1);
        this.vy = this.jumpVelocity;
        this.isGrounded = false;
        if (this.anim) this.anim.setState(STATE_JUMP);
    }

    slide() {
        if (this.isJetpacking) return;
        if (!this.isGrounded) {
            this.vy = -this.jumpVelocity * 1.6;
        }
        this.isSliding = true;
        this.slideTimer = 0;
        this.squashStretchScale.set(1.3, 0.5, 1.2);
        if (this.anim) this.anim.setState(STATE_SLIDE);
    }

    update(dt, speedRatio, soundManager, vfxManager) {
        if (this.laneSwitchTimer < this.laneSwitchDuration) {
            this.laneSwitchTimer += dt;
            const t = Math.min(1, this.laneSwitchTimer / this.laneSwitchDuration);
            const ease = 1 - Math.pow(1 - t, 3);
            this.position.x = this.startX + (this.targetX - this.startX) * ease;
            this.mesh.rotation.z = -(this.targetX - this.startX) * 0.12 * (1 - t);
        } else {
            this.position.x = this.targetX;
            this.mesh.rotation.z *= 0.88;
        }

        if (this.isJetpacking) {
            this.position.y += (this.jetpackY - this.position.y) * dt * 6;
            this.isGrounded = false;
            if (this.jetpack) this.jetpack.visible = true;
            if (this.anim) this.anim.setState(STATE_JETPACK);
            vfxManager.createJetpackFlame(this.position);
        } else {
            if (this.jetpack) this.jetpack.visible = false;
            if (!this.isGrounded) {
                this.vy += this.gravity * dt;
                this.position.y += this.vy * dt;
                if (this.position.y <= 0.75) {
                    this.position.y = 0.75;
                    this.vy = 0;
                    this.isGrounded = true;
                    this.squashStretchScale.set(1.3, 0.55, 1);
                    if (this.anim) this.anim.setState(STATE_LAND);
                    soundManager.playSwipe();
                    vfxManager.createLandingDust(this.position.x, 0.05, this.position.z);
                } else if (this.anim && this.anim.state !== STATE_SLIDE) {
                    this.anim.setState(STATE_JUMP);
                }
            }
        }

        if (this.isSliding) {
            this.slideTimer += dt;
            if (this.slideTimer >= this.slideDuration) {
                this.isSliding = false;
                if (this.parts.bodyPlane) this.parts.bodyPlane.scale.y = 1;
                if (this.anim && this.isGrounded) this.anim.setState(STATE_RUN);
            } else if (this.isGrounded) {
                vfxManager.createSlideSparks(this.position);
            }
        } else if (this.isGrounded && this.anim && this.anim.state !== STATE_LAND) {
            if (this.anim.state === STATE_SLIDE || this.anim.state === STATE_JUMP) {
                this.anim.setState(STATE_RUN);
            }
        }

        this.squashStretchScale.x += (1 - this.squashStretchScale.x) * dt * 10;
        this.squashStretchScale.y += (1 - this.squashStretchScale.y) * dt * 10;
        this.squashStretchScale.z += (1 - this.squashStretchScale.z) * dt * 10;
        this.mesh.scale.copy(this.squashStretchScale);

        if (this.anim) this.anim.update(dt, speedRatio);

        this.mesh.position.copy(this.position);
    }

    setHoverboardActive(active) {
        if (this.boardMesh) this.boardMesh.visible = active;
    }

    getBoundingBox() {
        const x = this.position.x;
        const y = this.position.y;
        const z = this.position.z;

        if (this.isSliding) {
            return new THREE.Box3(
                new THREE.Vector3(x - 0.34, y - 0.62, z - 0.22),
                new THREE.Vector3(x + 0.34, y - 0.08, z + 0.22)
            );
        }
        if (!this.isGrounded) {
            return new THREE.Box3(
                new THREE.Vector3(x - 0.34, y - 0.5, z - 0.28),
                new THREE.Vector3(x + 0.34, y + 0.55, z + 0.28)
            );
        }
        return new THREE.Box3(
            new THREE.Vector3(x - 0.36, y - 0.72, z - 0.3),
            new THREE.Vector3(x + 0.36, y + 0.58, z + 0.3)
        );
    }
}

export { Player };
export default Player;
