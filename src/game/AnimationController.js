/**
 * AnimationController.js — Smooth state blending for runner poses.
 */

const STATE_RUN = 'run';
const STATE_JUMP = 'jump';
const STATE_SLIDE = 'slide';
const STATE_JETPACK = 'jetpack';
const STATE_LAND = 'land';

class AnimationController {
    constructor(parts) {
        this.parts = parts;
        this.state = STATE_RUN;
        this.prevState = STATE_RUN;
        this.blend = 1;
        this.runCycle = 0;
        this.landTimer = 0;
    }

    setState(next) {
        if (next === this.state) return;
        this.prevState = this.state;
        this.state = next;
        this.blend = 0;
        if (next === STATE_LAND) this.landTimer = 0.18;
    }

    update(dt, speedRatio) {
        this.blend = Math.min(1, this.blend + dt * 10);

        if (this.state === STATE_LAND) {
            this.landTimer -= dt;
            if (this.landTimer <= 0) this.setState(STATE_RUN);
        }

        if (this.state === STATE_RUN) {
            this._poseRun(dt, speedRatio);
        } else if (this.state === STATE_JUMP) {
            this._poseJump();
        } else if (this.state === STATE_SLIDE) {
            this._poseSlide();
        } else if (this.state === STATE_JETPACK) {
            this._poseJetpack();
        } else if (this.state === STATE_LAND) {
            this._poseLand();
        }
    }

    _resetLimbs() {
        const p = this.parts;
        if (!p) return;
        ['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'torso', 'headGroup', 'skirt', 'hairBack'].forEach((k) => {
            const node = p[k];
            if (node) {
                node.rotation.set(0, 0, 0);
                if (k === 'torso' || k === 'headGroup') node.position.y = k === 'torso' ? 0.52 : 1.05;
            }
        });
        if (p.bodyPlane) p.bodyPlane.rotation.x = 0;
        if (p.legPlane) {
            p.legPlane.rotation.x = 0;
            p.legPlane.position.y = -0.42;
        }
    }

    _poseRun(dt, speedRatio) {
        const p = this.parts;
        if (!p) return;
        this.runCycle += dt * 13.5 * speedRatio;
        const swing = Math.sin(this.runCycle) * 0.9;
        const bounce = Math.abs(Math.sin(this.runCycle)) * 0.07;

        if (p.bodyPlane) {
            p.bodyPlane.position.y = 0.42 + bounce;
            p.bodyPlane.rotation.x = 0.12;
        }
        if (p.legPlane) {
            p.legPlane.position.y = -0.42 + bounce * 0.5;
            p.legPlane.rotation.x = swing * 0.55;
        }
        if (p.leftLeg) p.leftLeg.rotation.x = swing;
        if (p.rightLeg) p.rightLeg.rotation.x = -swing;
        if (p.leftArm) p.leftArm.rotation.x = -swing * 0.7;
        if (p.rightArm) p.rightArm.rotation.x = swing * 0.7;
        if (p.headGroup) {
            p.headGroup.position.y = 1.05 + Math.sin(this.runCycle * 2) * 0.04;
            p.headGroup.rotation.x = -0.05;
        }
        if (p.skirt) p.skirt.rotation.x = Math.sin(this.runCycle) * 0.1;
        if (p.hairBack) p.hairBack.rotation.x = 0.2 + Math.sin(this.runCycle) * 0.15;
    }

    _poseJump() {
        const p = this.parts;
        if (!p) return;
        if (p.bodyPlane) {
            p.bodyPlane.position.y = 0.5;
            p.bodyPlane.rotation.x = -0.15;
        }
        if (p.legPlane) {
            p.legPlane.position.y = -0.38;
            p.legPlane.rotation.x = -0.5;
        }
        if (p.leftLeg) p.leftLeg.rotation.x = -0.55;
        if (p.rightLeg) p.rightLeg.rotation.x = -0.45;
        if (p.leftArm) p.leftArm.rotation.x = 0.45;
        if (p.rightArm) p.rightArm.rotation.x = 0.4;
        if (p.headGroup) p.headGroup.rotation.x = 0.1;
    }

    _poseSlide() {
        const p = this.parts;
        if (!p) return;
        if (p.bodyPlane) {
            p.bodyPlane.position.y = 0.08;
            p.bodyPlane.rotation.x = 1.05;
            p.bodyPlane.scale.y = 0.72;
        } else {
            if (p.torso) {
                p.torso.position.y = 0.12;
                p.torso.rotation.x = 0.95;
            }
        }
        if (p.legPlane) {
            p.legPlane.position.y = -0.12;
            p.legPlane.rotation.x = -1.4;
        }
        if (p.leftLeg) p.leftLeg.rotation.x = -1.4;
        if (p.rightLeg) p.rightLeg.rotation.x = -1.4;
        if (p.leftArm) p.leftArm.rotation.x = 0.8;
        if (p.rightArm) p.rightArm.rotation.x = 0.8;
        if (p.headGroup) {
            p.headGroup.position.y = 0.65;
            p.headGroup.rotation.x = -0.4;
        }
        if (p.skirt) p.skirt.rotation.x = 0.55;
    }

    _poseJetpack() {
        const p = this.parts;
        if (!p) return;
        if (p.bodyPlane) {
            p.bodyPlane.position.y = 0.48;
            p.bodyPlane.rotation.x = 0.2;
        }
        if (p.legPlane) p.legPlane.rotation.x = 0.35;
        if (p.leftArm) p.leftArm.rotation.x = -0.55;
        if (p.rightArm) p.rightArm.rotation.x = -0.55;
        if (p.jetpack) p.jetpack.visible = true;
    }

    _poseLand() {
        const p = this.parts;
        if (!p) return;
        const squash = 1 - this.landTimer / 0.18;
        if (p.bodyPlane) {
            p.bodyPlane.position.y = 0.38 - squash * 0.08;
            p.bodyPlane.scale.y = 0.85 + squash * 0.15;
        }
    }
}

export { AnimationController, STATE_RUN, STATE_JUMP, STATE_SLIDE, STATE_JETPACK, STATE_LAND };
