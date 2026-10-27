/**
 * TrackManager.js
 * Generates and scrolls procedural tracks, coordinates pre-defined obstacle layout patterns
 * to guarantee fair, skill-based gameplay, and handles strict object pooling for 3D meshes.
 */

class TrackManager {
    constructor(scene) {
        this.scene = scene;
        this.segmentLength = 40.0;
        this.visibleSegments = 5;
        this.lanesX = [-2.0, 0.0, 2.0];
        
        // Active spawned elements
        this.activeSegments = [];
        
        // Object Pools
        this.pools = {
            road: [],
            coin: [],
            gem: [],
            barrierLow: [],
            barrierHigh: [],
            train: [],
            powerup: [],
            ramp: []
        };
        
        this._initObjectPools();
    }

    _initObjectPools() {
        const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.88, metalness: 0.05 });
        const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xf5c623, emissive: 0xf5a623, emissiveIntensity: 0.15, roughness: 0.4 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.08, emissive: 0xffaa00, emissiveIntensity: 0.25 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, metalness: 0.6, roughness: 0.1, emissive: 0x0088ff, emissiveIntensity: 0.4 });
        const laserMat = new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.85 });
        const postMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 });
        const pinkPowerMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, metalness: 0.4, roughness: 0.2, emissive: 0xff1493, emissiveIntensity: 0.3 });
        const cyanPowerMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.4, roughness: 0.2, emissive: 0x00bfff, emissiveIntensity: 0.35 });

        const trainTexLoader = new THREE.TextureLoader();
        let trainBodyMat = new THREE.MeshStandardMaterial({ color: 0xf4c430, metalness: 0.35, roughness: 0.45 });
        trainTexLoader.load('train_obstacle_yellow.png', (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(2, 1);
            trainBodyMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.3, roughness: 0.5 });
            this.pools.train.forEach((t) => {
                if (t.children[0]) t.children[0].material = trainBodyMat;
            });
        });
        
        // 1. Road segments pool (flat surfaces with lane divider lines)
        for (let i = 0; i < this.visibleSegments + 2; i++) {
            const roadGrp = new THREE.Group();
            
            // Core asphalt road surface
            const geo = new THREE.BoxGeometry(6.6, 0.2, this.segmentLength);
            const mesh = new THREE.Mesh(geo, asphaltMat);
            mesh.receiveShadow = true;
            roadGrp.add(mesh);
            
            // Yellow Lane dividers
            const lineL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, this.segmentLength), yellowLineMat);
            lineL.position.set(-1.0, 0.01, 0);
            const lineR = lineL.clone();
            lineR.position.set(1.0, 0.01, 0);
            roadGrp.add(lineL);
            roadGrp.add(lineR);
            
            roadGrp.visible = false;
            this.scene.add(roadGrp);
            this.pools.road.push(roadGrp);
        }

        // 2. Coins Pool (golden rings)
        for (let i = 0; i < 60; i++) {
            const coin = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 10, 20), goldMat);
            coin.rotation.x = Math.PI / 2;
            coin.visible = false;
            coin.castShadow = true;
            this.scene.add(coin);
            this.pools.coin.push(coin);
        }

        // 3. Gems Pool (blue diamonds)
        for (let i = 0; i < 10; i++) {
            const gemGeo = new THREE.OctahedronGeometry(0.32, 0);
            const gem = new THREE.Mesh(gemGeo, gemMat);
            gem.visible = false;
            this.scene.add(gem);
            this.pools.gem.push(gem);
        }

        // 4. Low Barriers (jump over)
        for (let i = 0; i < 8; i++) {
            const barrier = new THREE.Group();
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.35), postMat);
            base.position.y = 0.06;
            barrier.add(base);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.45, 0.12), new THREE.MeshStandardMaterial({ color: 0xff6b35, emissive: 0xff4400, emissiveIntensity: 0.2 }));
            panel.position.y = 0.38;
            barrier.add(panel);
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.14), whiteMat);
            stripe.position.y = 0.48;
            barrier.add(stripe);
            barrier.visible = false;
            this.scene.add(barrier);
            this.pools.barrierLow.push(barrier);
        }

        // 5. High Barriers (slide under laser gate)
        for (let i = 0; i < 8; i++) {
            const barrier = new THREE.Group();
            const postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), postMat);
            postL.position.set(-0.78, 0.95, 0);
            const postR = postL.clone();
            postR.position.set(0.78, 0.95, 0);
            barrier.add(postL, postR);

            const beam = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 0.08), laserMat);
            beam.position.set(0, 1.08, 0);
            barrier.add(beam);

            const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.35, 0.2), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 }));
            topBar.position.set(0, 1.55, 0);
            barrier.add(topBar);

            barrier.visible = false;
            this.scene.add(barrier);
            this.pools.barrierHigh.push(barrier);
        }

        // 6. Ramps Pool (wooden ramps)
        const rampMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.8 });
        for (let i = 0; i < 4; i++) {
            const rampGeo = new THREE.BoxGeometry(1.6, 0.8, 4.0);
            const ramp = new THREE.Mesh(rampGeo, rampMat);
            ramp.rotation.x = -0.2;
            ramp.castShadow = true;
            ramp.visible = false;
            this.scene.add(ramp);
            this.pools.ramp.push(ramp);
        }

        // 7. Trains Pool
        for (let i = 0; i < 6; i++) {
            const train = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.25, 12.0), trainBodyMat);
            body.position.y = 1.12;
            body.castShadow = true;
            train.add(body);

            const windowMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.6, roughness: 0.15, emissive: 0x88ccff, emissiveIntensity: 0.15 });
            [-0.83, 0.83].forEach((x) => {
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 9.5), windowMat);
                win.position.set(x, 1.55, 0);
                train.add(win);
            });

            const headlight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffcc }));
            headlight.position.set(0, 0.65, 6.02);
            train.add(headlight);

            const roof = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 11.8), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 }));
            roof.position.set(0, 2.28, 0);
            train.add(roof);

            train.visible = false;
            this.scene.add(train);
            this.pools.train.push(train);
        }

        // 8. Power-ups Pool
        const powerupTypes = ["magnet", "jetpack", "shield"];
        for (let j = 0; j < powerupTypes.length; j++) {
            const type = powerupTypes[j];
            for (let i = 0; i < 3; i++) {
                const grp = new THREE.Group();
                grp.userData = { type: type };
                
                // Outer ring
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 24), pinkPowerMat);
                grp.add(ring);
                
                // Core emblem
                let emblemGeo;
                if (type === "magnet") emblemGeo = new THREE.BoxGeometry(0.2, 0.35, 0.2);
                else if (type === "jetpack") emblemGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
                else emblemGeo = new THREE.SphereGeometry(0.2, 8, 8);
                
                const emblem = new THREE.Mesh(emblemGeo, cyanPowerMat);
                grp.add(emblem);
                
                grp.visible = false;
                this.scene.add(grp);
                this.pools.powerup.push(grp);
            }
        }
    }

    reset() {
        // Recycle all active elements
        for (let i = 0; i < this.activeSegments.length; i++) {
            const seg = this.activeSegments[i];
            
            // Hide roads
            seg.roadMesh.visible = false;
            
            // Hide obstacles
            seg.obstacles.forEach(o => {
                o.mesh.visible = false;
                o.mesh.position.set(0,0,0);
            });
            
            // Hide items
            seg.items.forEach(item => {
                item.mesh.visible = false;
                item.mesh.position.set(0,0,0);
            });
        }
        
        this.activeSegments = [];
        
        // Spawn initial safe starting tracks
        for (let i = 0; i < this.visibleSegments; i++) {
            this._spawnSegment(i * -this.segmentLength, i === 0 || i === 1);
        }
    }

    _spawnSegment(zPos, isEmpty = false) {
        // 1. Get road from pool
        const roadMesh = this.pools.road.find(r => !r.visible);
        if (!roadMesh) return;
        
        roadMesh.position.set(0, 0, zPos);
        roadMesh.visible = true;
        
        const segment = {
            zStart: zPos + this.segmentLength / 2,
            zEnd: zPos - this.segmentLength / 2,
            roadMesh: roadMesh,
            obstacles: [], // Items spawned inside this segment
            items: []
        };

        if (!isEmpty) {
            this._populateSegment(segment, zPos);
        }
        
        this.activeSegments.push(segment);
    }

    _populateSegment(segment, zCenter) {
        // Select an obstacle pattern based on difficulty thresholds
        // Available patterns (0 to 6)
        const patternIdx = Math.floor(Math.random() * 7);
        
        switch (patternIdx) {
            case 0:
                // Safe coin arch in center lane
                this._spawnCoinsArch(segment, zCenter, 1);
                break;
                
            case 1:
                // High Gate (Center), low barrier (Left)
                this._spawnObstacle(segment, "barrierHigh", 1, zCenter - 5);
                this._spawnObstacle(segment, "barrierLow", 0, zCenter + 5);
                // Scatter coins on right lane
                this._spawnCoinsRow(segment, zCenter, 2, 4);
                break;
                
            case 2:
                // Train in center with ramp in front, allowing players to run on top of train
                this._spawnTrainWithRamp(segment, zCenter, 1);
                break;
                
            case 3:
                // Obstacles on Left & Right, powerup in Center
                this._spawnObstacle(segment, "barrierLow", 0, zCenter);
                this._spawnObstacle(segment, "barrierHigh", 2, zCenter);
                this._spawnPowerupRandom(segment, 1, zCenter + 2);
                break;
                
            case 4:
                // Train blocking Right lane, Laser blocking Center lane (Slide needed)
                this._spawnObstacle(segment, "train", 2, zCenter);
                this._spawnObstacle(segment, "barrierHigh", 1, zCenter - 4);
                this._spawnCoinsRow(segment, zCenter, 0, 3);
                break;
                
            case 5:
                // Dual trains side by side on Left (0) and Right (2) lanes, Center has barriers
                this._spawnObstacle(segment, "train", 0, zCenter + 2);
                this._spawnObstacle(segment, "train", 2, zCenter - 2);
                this._spawnObstacle(segment, "barrierLow", 1, zCenter);
                break;
                
            case 6:
                // High gate Left, Low gate Right, coins leading through center
                this._spawnObstacle(segment, "barrierHigh", 0, zCenter - 5);
                this._spawnObstacle(segment, "barrierLow", 2, zCenter + 5);
                this._spawnCoinsRow(segment, zCenter, 1, 4);
                break;
        }

        // Low probability to spawn occasional rare gems
        if (Math.random() < 0.15) {
            const lane = Math.floor(Math.random() * 3);
            this._spawnGem(segment, lane, zCenter + (Math.random() - 0.5) * 20.0);
        }
    }

    // SPAWNING HELPERS (PULLING OBJECTS FROM THE POOLS)

    _spawnObstacle(segment, type, lane, z) {
        const pool = this.pools[type];
        if (!pool) return;
        
        const mesh = pool.find(item => !item.visible);
        if (mesh) {
            mesh.position.set(this.lanesX[lane], 0, z);
            mesh.visible = true;
            segment.obstacles.push({
                type: type,
                lane: lane,
                mesh: mesh
            });
        }
    }

    _spawnTrainWithRamp(segment, zCenter, lane) {
        // Spawn train at zCenter - 4 (12 units long, extends from zCenter - 10 to zCenter + 2)
        const trainMesh = this.pools.train.find(item => !item.visible);
        const rampMesh = this.pools.ramp.find(item => !item.visible);
        
        if (trainMesh) {
            trainMesh.position.set(this.lanesX[lane], 0, zCenter - 3);
            trainMesh.visible = true;
            segment.obstacles.push({ type: "train", lane, mesh: trainMesh });
        }
        
        if (rampMesh) {
            // Place ramp directly in front of the train
            rampMesh.position.set(this.lanesX[lane], 0.25, zCenter + 5.5);
            rampMesh.visible = true;
            segment.obstacles.push({ type: "ramp", lane, mesh: rampMesh });
        }
        
        // Spawn coins on top of the train! (Train height is 2.2, coins float at y=2.9)
        const startZ = zCenter - 8;
        for (let i = 0; i < 4; i++) {
            const coin = this.pools.coin.find(item => !item.visible);
            if (coin) {
                coin.position.set(this.lanesX[lane], 2.8, startZ + i * 3.5);
                coin.visible = true;
                segment.items.push({ type: "coin", lane, mesh: coin });
            }
        }
    }

    _spawnCoinsRow(segment, zCenter, lane, count = 4) {
        const startZ = zCenter - (count * 2.0);
        for (let i = 0; i < count; i++) {
            const coin = this.pools.coin.find(item => !item.visible);
            if (coin) {
                coin.position.set(this.lanesX[lane], 0.75, startZ + i * 4.0);
                coin.visible = true;
                segment.items.push({ type: "coin", lane, mesh: coin });
            }
        }
    }

    _spawnCoinsArch(segment, zCenter, lane) {
        // Spawns a nice jump arch of 5 coins (Y goes 0.75 -> 1.5 -> 2.2 -> 1.5 -> 0.75)
        const count = 5;
        const heights = [0.75, 1.6, 2.3, 1.6, 0.75];
        const startZ = zCenter - 6.0;
        
        for (let i = 0; i < count; i++) {
            const coin = this.pools.coin.find(item => !item.visible);
            if (coin) {
                coin.position.set(this.lanesX[lane], heights[i], startZ + i * 3.0);
                coin.visible = true;
                segment.items.push({ type: "coin", lane, mesh: coin });
            }
        }
    }

    _spawnGem(segment, lane, z) {
        const gem = this.pools.gem.find(item => !item.visible);
        if (gem) {
            gem.position.set(this.lanesX[lane], 0.9, z);
            gem.visible = true;
            segment.items.push({ type: "gem", lane, mesh: gem });
        }
    }

    _spawnPowerupRandom(segment, lane, z) {
        // Random pick a type
        const type = ["magnet", "jetpack", "shield"][Math.floor(Math.random() * 3)];
        const pu = this.pools.powerup.find(item => !item.visible && item.userData.type === type);
        if (pu) {
            pu.position.set(this.lanesX[lane], 0.85, z);
            pu.visible = true;
            segment.items.push({ type: "powerup", subtype: type, lane, mesh: pu });
        }
    }

    // CORE GAME SCROLL LOOP
    update(dt, speed, player, soundManager, vfxManager, onScoreUpdate) {
        // Scroll speed
        const scrollDist = speed * dt;

        // Animate coins and powerups (rotate)
        this.pools.coin.forEach((c) => { if (c.visible) { c.rotation.y += dt * 4.5; c.rotation.z += dt * 2.0; } });
        this.pools.gem.forEach(g => { if (g.visible) { g.rotation.y += dt * 2.0; g.rotation.x += dt * 0.5; } });
        this.pools.powerup.forEach(p => { if (p.visible) { p.rotation.y += dt * 2.0; } });

        // Scroll track segments
        for (let i = this.activeSegments.length - 1; i >= 0; i--) {
            const seg = this.activeSegments[i];
            
            // Move segment
            seg.roadMesh.position.z += scrollDist;
            seg.obstacles.forEach(o => o.mesh.position.z += scrollDist);
            seg.items.forEach(item => {
                // If Magnet is active, attract coins towards player!
                if (item.type === "coin" && item.mesh.visible && player.isMagnetActive) {
                    const coinPos = item.mesh.position;
                    const playerPos = player.position;
                    
                    // Distance check
                    const dist = coinPos.distanceTo(playerPos);
                    if (dist < 10.0) { // Attraction range
                        // Smoothly interpolate towards player chest (y=0.4)
                        const targetPos = playerPos.clone();
                        targetPos.y += 0.4;
                        coinPos.lerp(targetPos, dt * 11.0); // Magnet pull speed
                    } else {
                        // Standard scroll
                        coinPos.z += scrollDist;
                    }
                } else {
                    item.mesh.position.z += scrollDist;
                }
            });

            // If segment goes completely behind the camera
            if (seg.roadMesh.position.z > 25.0) {
                // Hide road
                seg.roadMesh.visible = false;
                
                // Hide and return obstacles to pool
                seg.obstacles.forEach(o => {
                    o.mesh.visible = false;
                    o.mesh.position.set(0, 0, 0);
                });
                
                // Hide items
                seg.items.forEach(item => {
                    item.mesh.visible = false;
                    item.mesh.position.set(0, 0, 0);
                });

                // Remove from list
                this.activeSegments.splice(i, 1);
                
                // Spawn a new one ahead: find the furthest segment's Z coordinate
                let furthestZ = 0;
                this.activeSegments.forEach(s => {
                    if (s.roadMesh.position.z < furthestZ) furthestZ = s.roadMesh.position.z;
                });
                
                // Spawn one segment-length ahead
                this._spawnSegment(furthestZ - this.segmentLength);
            }
        }
    }
}

export { TrackManager };
export default TrackManager;
