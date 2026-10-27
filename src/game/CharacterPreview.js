/**
 * CharacterPreview.js — Renders rotating Preethi runner in menus.
 */

import { buildPreethiRunner, applySkinColors } from './PreethiRunner.js';

class CharacterPreview {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.compact = options.compact || false;
        this.scene = new THREE.Scene();
        this.scene.background = null;

        const w = this.container.clientWidth || (this.compact ? 44 : 280);
        const h = this.container.clientHeight || (this.compact ? 44 : 280);

        this.camera = new THREE.PerspectiveCamera(this.compact ? 48 : 40, w / h, 0.1, 50);
        if (this.compact) {
            this.camera.position.set(0, 0.95, 2.2);
            this.camera.lookAt(0, 0.7, 0);
        } else {
            this.camera.position.set(0, 1.0, 2.8);
            this.camera.lookAt(0, 0.75, 0);
        }

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        const ambient = new THREE.AmbientLight(0xfff5ee, 1.5);
        this.scene.add(ambient);
        const key = new THREE.DirectionalLight(0xfff2cc, 2.4);
        key.position.set(2, 6, 4);
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(0x9b7ec8, 0.7);
        rim.position.set(-3, 2, -2);
        this.scene.add(rim);

        this.character = new THREE.Group();
        this.scene.add(this.character);
        this.anim = null;

        buildPreethiRunner().then((runner) => {
            this.character.add(runner.mesh);
            this.anim = runner.anim;
        });

        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(1.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.4 })
        );
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.time = 0;
        this._animate();
    }

    setSkin(skinId) {
        applySkinColors(this.character.children[0], skinId);
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        this.time += 0.016;

        this.character.rotation.y = Math.sin(this.time * 0.6) * 0.3 + 0.2;
        this.character.position.y = Math.sin(this.time * 2) * 0.03;
        if (this.anim) this.anim.update(0.016, 1.0);

        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        if (!this.container) return;
        const w = this.container.clientWidth || 280;
        const h = this.container.clientHeight || 280;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}

export { CharacterPreview };
