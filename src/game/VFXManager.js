/**
 * VFXManager.js
 * Manages 3D particle systems, shield bubbles, and speed trail visual effects.
 * Uses GPU-instanced points and pre-allocated buffers for maximum mobile performance.
 */

class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.maxParticles = 600;
        this.particles = []; // Particle models
        
        // Particle buffers
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        
        // Materials using additive blending for neon glow
        this.material = new THREE.PointsMaterial({
            size: 1.0,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
        
        // Active pointer index for circular allocations
        this.particleIndex = 0;
        
        // Initialize particle states
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                active: false,
                vx: 0, vy: 0, vz: 0,
                r: 1, g: 1, b: 1,
                alpha: 1.0,
                life: 0.0,
                maxLife: 1.0,
                damping: 0.98
            });
            this.sizes[i] = 0.0;
        }
        
        // Setup shield mesh
        this._initShield();
    }

    _initShield() {
        // Holographic grid shield sphere
        const geo = new THREE.SphereGeometry(1.1, 16, 12);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff7df4,
            wireframe: true,
            transparent: true,
            opacity: 0.0, // Start hidden
            blending: THREE.AdditiveBlending
        });
        
        this.shieldMesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.shieldMesh);
        this.shieldActive = false;
        this.shieldPulseTimer = 0.0;
        this.shieldHitEffect = 0.0;
    }

    // Allocate a particle from the circular pool
    _spawnParticle(x, y, z, vx, vy, vz, r, g, b, size, maxLife, damping = 0.98) {
        const i = this.particleIndex;
        this.particleIndex = (this.particleIndex + 1) % this.maxParticles;
        
        const p = this.particles[i];
        p.active = true;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
        p.r = r;
        p.g = g;
        p.b = b;
        p.life = maxLife;
        p.maxLife = maxLife;
        p.damping = damping;
        
        // Position buffer
        this.positions[i * 3] = x;
        this.positions[i * 3 + 1] = y;
        this.positions[i * 3 + 2] = z;
        
        // Color buffer
        this.colors[i * 3] = r;
        this.colors[i * 3 + 1] = g;
        this.colors[i * 3 + 2] = b;
        
        // Size buffer
        this.sizes[i] = size;
    }

    // TRIGGER VISUAL EFFECTS

    // 1. Spark burst on collecting coins (electric cyan/gold sparks)
    createCoinSparks(x, y, z) {
        const count = 12;
        for (let j = 0; j < count; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.0 + Math.random() * 4.0;
            const vx = Math.cos(angle) * speed;
            const vy = (Math.random() - 0.2) * speed;
            const vz = Math.sin(angle) * speed;
            
            // Gold sparks
            this._spawnParticle(
                x, y, z,
                vx, vy, vz,
                1.0, 0.85, 0.2, // Gold RGB
                0.25 + Math.random() * 0.2,
                0.4 + Math.random() * 0.3
            );
        }
    }

    // 2. Continuous friction sparks on sliding
    createSlideSparks(playerPos, isLeftRightSwitched) {
        // Emit 2-3 sparks per frame at player's feet
        const count = 3;
        const py = playerPos.y - 0.75; // ground level approx
        for (let j = 0; j < count; j++) {
            const vx = (Math.random() - 0.5) * 2.0;
            const vy = Math.random() * 3.0;
            const vz = 10.0 + Math.random() * 8.0; // Fly backwards fast
            
            // Orange neon spark
            this._spawnParticle(
                playerPos.x + (Math.random() - 0.5) * 0.4,
                py,
                playerPos.z - 0.2,
                vx, vy, vz,
                1.0, 0.3, 0.05, // Orange RGB
                0.2 + Math.random() * 0.15,
                0.3 + Math.random() * 0.2
            );
        }
    }

    // 3. Expanding dust ring on landing impact
    createLandingDust(x, y, z) {
        const count = 20;
        for (let j = 0; j < count; j++) {
            const angle = (j / count) * Math.PI * 2;
            const speed = 4.0 + Math.random() * 2.0;
            const vx = Math.cos(angle) * speed;
            const vy = 0.5 + Math.random() * 1.5;
            const vz = Math.sin(angle) * speed;
            
            // Cyber cyan/white dust
            this._spawnParticle(
                x, y, z,
                vx, vy, vz,
                0.0, 0.85, 1.0, // Cyan RGB
                0.4 + Math.random() * 0.3,
                0.5 + Math.random() * 0.3,
                0.9 // High damping
            );
        }
    }

    // 4. Jetpack engine thruster flames
    createJetpackFlame(playerPos) {
        const count = 4;
        const leftExhaustX = playerPos.x - 0.35;
        const rightExhaustX = playerPos.x + 0.35;
        const ey = playerPos.y + 0.2;
        const ez = playerPos.z - 0.4;
        
        for (let j = 0; j < count; j++) {
            const sideX = (j % 2 === 0) ? leftExhaustX : rightExhaustX;
            const vx = (Math.random() - 0.5) * 0.5;
            const vy = -4.0 - Math.random() * 5.0; // Blow down
            const vz = 5.0 + Math.random() * 4.0;  // Blow back
            
            // Alternating cyan and purple thrust particles
            const isCyan = Math.random() > 0.4;
            const r = isCyan ? 0.0 : 0.9;
            const g = isCyan ? 0.9 : 0.0;
            const b = 1.0;
            
            this._spawnParticle(
                sideX, ey, ez,
                vx, vy, vz,
                r, g, b,
                0.35 + Math.random() * 0.25,
                0.35 + Math.random() * 0.2
            );
        }
    }

    // 5. Shield bubble active states
    setShieldState(active, pos) {
        this.shieldActive = active;
        if (active && pos) {
            this.shieldMesh.position.copy(pos);
        }
    }

    triggerShieldHit() {
        this.shieldHitEffect = 1.0;
    }

    // Update loops
    update(dt, playerPos, graphicsQuality) {
        // Handle Shield mesh scaling and pulses
        if (this.shieldActive) {
            this.shieldMesh.position.copy(playerPos);
            this.shieldPulseTimer += dt * 5.0;
            
            // Base pulsing scale
            let scaleVal = 1.0 + Math.sin(this.shieldPulseTimer) * 0.04;
            let opacityVal = 0.35 + Math.sin(this.shieldPulseTimer) * 0.1;
            
            // Process hits
            if (this.shieldHitEffect > 0.0) {
                this.shieldHitEffect -= dt * 3.0; // Fast decay
                scaleVal += this.shieldHitEffect * 0.8;
                opacityVal += this.shieldHitEffect * 0.6;
                this.shieldMesh.material.color.setHex(0xffffff); // Flash white
            } else {
                this.shieldMesh.material.color.setHex(0xff7df4); // Standard purple neon
            }
            
            this.shieldMesh.scale.set(scaleVal, scaleVal, scaleVal);
            this.shieldMesh.material.opacity = opacityVal;
            this.shieldMesh.rotation.y += dt * 2.0;
            this.shieldMesh.rotation.x += dt * 0.5;
            this.shieldMesh.visible = true;
        } else {
            this.shieldMesh.visible = false;
        }

        // Throttling particle density on Low Graphics mode
        const decayFactor = graphicsQuality === 'low' ? 2.5 : 1.0;

        // Process active particles in pool
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            p.life -= dt * decayFactor;
            if (p.life <= 0.0) {
                p.active = false;
                this.sizes[i] = 0.0;
                continue;
            }

            // Apply damping and gravity/motion
            p.vx *= p.damping;
            p.vy *= p.damping;
            p.vz *= p.damping;

            // Update buffer values
            this.positions[i * 3] += p.vx * dt;
            this.positions[i * 3 + 1] += p.vy * dt;
            this.positions[i * 3 + 2] += p.vz * dt;

            // Fade size relative to remaining life
            const pct = p.life / p.maxLife;
            this.sizes[i] = this.sizes[i] * pct;
        }

        // Request Three.js to re-sync buffers
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }

    clear() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles[i].active = false;
            this.sizes[i] = 0.0;
        }
        this.geometry.attributes.size.needsUpdate = true;
        this.shieldActive = false;
        this.shieldMesh.visible = false;
    }
}

export { VFXManager };
export default VFXManager;
