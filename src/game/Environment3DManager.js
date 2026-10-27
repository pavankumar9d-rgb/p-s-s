import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Environment3DManager {
    constructor(scene) {
        this.scene = scene;
        this.lanes = [-2.0, 0.0, 2.0];
        
        // Track chunks
        this.trackChunks = [];
        this.chunkLength = 60.0;
        this.numChunks = 4;
        
        // Active entities
        this.obstacles = [];
        this.coins = [];

        // Continuous rhythmic wave cursor (Subway Surfers cadence)
        this.nextSpawnZ = -18.0;
        this.spawnInterval = 25.0; // Spawns a rhythmic cluster every 25 meters

        // Preloaded 3D Model Templates
        this.models = {
            trains: [],
            barriers: [],
            coins: [],
            powerups: [],
            props: []
        };

        this._initTexturesAndMaterials();
        this._buildTrackChunks();
        this._preloadAllGLBAssets();

        // Spawn initial continuous track density
        this._spawnInitialWaves();
    }

    _createCanvasTexture(width, height, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, width, height);
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        return tex;
    }

    _initTexturesAndMaterials() {
        // Indian Railway Yellow Bilingual Station Sign
        const stationSignTex = this._createCanvasTexture(512, 160, (ctx, w, h) => {
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(0, 0, w, h);
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('प्रीति जंक्शन', w / 2, 54);
            ctx.font = '900 42px sans-serif';
            ctx.fillText('PREETHI JUNCTION', w / 2, 106);
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('समुद्र तल से ऊँचाई 540M | ELEVATION 540M', w / 2, 138);
        });
        this.matStationSign = new THREE.MeshBasicMaterial({ map: stationSignTex });

        // Chai Stall Banner
        const chaiSignTex = this._createCanvasTexture(512, 128, (ctx, w, h) => {
            ctx.fillStyle = '#d32f2f';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 32px sans-serif';
            ctx.fillText('☕ PREETHI CHAI & SNACKS', w / 2, 55);
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('गरम चाय • समोसा • ताज़ा नाश्ता', w / 2, 98);
        });
        this.matChaiSign = new THREE.MeshBasicMaterial({ map: chaiSignTex });

        // Warning Curb Stripes
        const curbTex = this._createCanvasTexture(256, 64, (ctx, w, h) => {
            const stripeW = 32;
            for (let x = 0; x < w; x += stripeW * 2) {
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(x, 0, stripeW, h);
                ctx.fillStyle = '#111111';
                ctx.fillRect(x + stripeW, 0, stripeW, h);
            }
        });
        curbTex.wrapS = THREE.RepeatWrapping;
        curbTex.repeat.set(10, 1);
        this.matCurbStripe = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.6 });

        // Base Track Materials
        this.matBallast = new THREE.MeshStandardMaterial({ color: 0x33302c, roughness: 0.95 });
        this.matRail = new THREE.MeshStandardMaterial({ color: 0xc4cbd5, metallic: 0.95, roughness: 0.18 });
        this.matTie = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.85 });
        this.matPlatform = new THREE.MeshStandardMaterial({ color: 0x824e40, roughness: 0.8 });
        this.matGantryLattice = new THREE.MeshStandardMaterial({ color: 0x37474f, metallic: 0.85, roughness: 0.35 });
        this.matCable = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metallic: 0.7, roughness: 0.4 });
        this.matCoin = new THREE.MeshStandardMaterial({ color: 0xffd700, metallic: 0.95, roughness: 0.12, emissive: 0xffaa00, emissiveIntensity: 0.4 });

        // Authentic Indian Railways Express Train (ICF Blue & Cream)
        this.matTrainIRBlue = new THREE.MeshStandardMaterial({ color: 0x153f7c, roughness: 0.32, metalness: 0.25 });
        this.matTrainCreamBand = new THREE.MeshStandardMaterial({ color: 0xf2edd9, roughness: 0.45 });
        this.matTrainRoof = new THREE.MeshStandardMaterial({ color: 0x546e7a, metallic: 0.35, roughness: 0.55 });
        this.matTrainWindow = new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 0.1, metalness: 0.85 });
        this.matTrainGrill = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.4, emissive: 0xffb300, emissiveIntensity: 0.3 });
        this.matHeadlight = new THREE.MeshBasicMaterial({ color: 0xffffff });

        this.matBuildings = [
            new THREE.MeshStandardMaterial({ color: 0xc85a38, roughness: 0.75 }),
            new THREE.MeshStandardMaterial({ color: 0xe6a838, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x388e68, roughness: 0.75 }),
            new THREE.MeshStandardMaterial({ color: 0xf5eedc, roughness: 0.85 })
        ];
    }

    _fitModelToBounds(root, targetW, targetH, targetL) {
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const sx = targetW / Math.max(0.001, size.x);
        const sy = targetH / Math.max(0.001, size.y);
        const sz = targetL / Math.max(0.001, size.z);
        root.scale.set(sx, sy, sz);
        
        // Re-align base pivot to Y=0
        const newBox = new THREE.Box3().setFromObject(root);
        root.position.y -= newBox.min.y;
    }

    _preloadAllGLBAssets() {
        const loader = new GLTFLoader();

        const loadModel = (path, category, targetW, targetH, targetL, rotationY = 0) => {
            loader.load(path, (gltf) => {
                const root = gltf.scene;
                if (rotationY) root.rotation.y = rotationY;
                this._fitModelToBounds(root, targetW, targetH, targetL);
                root.traverse((c) => {
                    if (c.isMesh) {
                        c.castShadow = true;
                        c.receiveShadow = true;
                    }
                });
                this.models[category].push(root);
                console.log(`[Environment3DManager] Loaded & Calibrated ${category}: ${path}`);
            }, undefined, () => {});
        };

        // 1. Trains (calibrated to full Indian Railway scale: 1.95m W, 2.6m H, 16.5m L)
        loadModel('assets/models/trains/train.glb', 'trains', 1.95, 2.6, 16.5, Math.PI);
        loadModel('assets/models/trains/commuter_train.glb', 'trains', 1.95, 2.6, 16.5, Math.PI);
        loadModel('assets/models/trains/train_car.glb', 'trains', 1.95, 2.6, 16.5, Math.PI);

        // 2. Obstacles (calibrated to 1.8m lane width)
        loadModel('assets/models/obstacles/metal_barrier.glb', 'barriers', 1.8, 0.85, 0.35);
        loadModel('assets/models/obstacles/road_barrier.glb', 'barriers', 1.8, 0.85, 0.35);
        loadModel('assets/models/obstacles/rail_maintenance_vehicle.glb', 'barriers', 1.85, 1.2, 2.5);

        // 3. Collectibles & Powerups
        loadModel('assets/models/collectibles/gold_coin.glb', 'coins', 0.45, 0.45, 0.1);
        loadModel('assets/models/collectibles/horseshoe_magnet.glb', 'powerups', 0.55, 0.55, 0.55);
        loadModel('assets/models/collectibles/hoverboard.glb', 'powerups', 0.55, 0.25, 1.2);
        loadModel('assets/models/collectibles/jetpack.glb', 'powerups', 0.55, 0.65, 0.4);

        // 4. Props
        loadModel('assets/models/props/palm_tree.glb', 'props', 2.8, 6.0, 2.8);
        loadModel('assets/models/props/bench.glb', 'props', 1.8, 0.9, 0.8);
        loadModel('assets/models/props/vending_machine.glb', 'props', 1.1, 2.1, 0.9);
        loadModel('assets/models/props/tunnel_entrance.glb', 'props', 8.5, 7.0, 5.0);
    }

    _createTrackChunk(zPos) {
        const chunk = new THREE.Group();
        chunk.position.z = zPos;

        // 1. Ballast Stone Bed
        const ballast = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.26, this.chunkLength), this.matBallast);
        ballast.position.set(0, -0.13, 0);
        ballast.receiveShadow = true;
        chunk.add(ballast);

        // 2. Broad Gauge Rails (6 rails across 3 lanes)
        const railGauge = 1.1;
        this.lanes.forEach((lx) => {
            [-railGauge / 2, railGauge / 2].forEach((offset) => {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, this.chunkLength), this.matRail);
                rail.position.set(lx + offset, 0.045, 0);
                chunk.add(rail);
            });
        });

        // 3. Concrete Sleepers
        const sleeperSpacing = 0.8;
        const numSleepers = Math.floor(this.chunkLength / sleeperSpacing);
        for (let i = 0; i < numSleepers; i++) {
            const sz = -this.chunkLength / 2 + i * sleeperSpacing;
            const sleeper = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.07, 0.18), this.matTie);
            sleeper.position.set(0, 0.015, sz);
            sleeper.receiveShadow = true;
            chunk.add(sleeper);
        }

        // 4. 25 kV AC OHE Portal Catenary Gantries
        const gantryZ = 0.0;
        [-4.2, 4.2].forEach((px) => {
            const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 0.22), this.matGantryLattice);
            mast.position.set(px, 3.1, gantryZ);
            chunk.add(mast);
        });

        const girder = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.32, 0.35), this.matGantryLattice);
        girder.position.set(0, 6.0, gantryZ);
        chunk.add(girder);

        this.lanes.forEach((lx) => {
            const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, this.chunkLength, 6), this.matCable);
            wire.rotation.x = Math.PI / 2;
            wire.position.set(lx, 5.4, 0);
            chunk.add(wire);
        });

        // 5. Red-Brick Platforms
        [-5.1, 5.1].forEach((platX, sIdx) => {
            const platform = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, this.chunkLength), this.matPlatform);
            platform.position.set(platX, 0.32, 0);
            platform.receiveShadow = true;
            chunk.add(platform);

            const curbOffset = sIdx === 0 ? 0.92 : -0.92;
            const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, this.chunkLength), this.matCurbStripe);
            curb.position.set(platX + curbOffset, 0.66, 0);
            chunk.add(curb);
        });

        // 6. Yellow Bilingual Station Signboard
        const signGroup = new THREE.Group();
        signGroup.position.set(-5.1, 1.8, -15.0);
        [-1.4, 1.4].forEach((spx) => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), this.matGantryLattice);
            pole.position.set(spx, -0.2, 0);
            signGroup.add(pole);
        });
        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.08), this.matStationSign);
        signBoard.position.set(0, 0.7, 0);
        signGroup.add(signBoard);
        chunk.add(signGroup);

        // 7. Chai & Refreshments Kiosk
        const chaiKiosk = new THREE.Group();
        chaiKiosk.position.set(5.1, 0.65, -25.0);
        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1.1, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.5 })
        );
        counter.position.set(0, 0.55, 0);
        chaiKiosk.add(counter);

        const awning = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.12, 2.7),
            new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 })
        );
        awning.position.set(0, 1.8, 0);
        awning.rotation.x = 0.1;
        chaiKiosk.add(awning);

        const chaiBanner = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 2.2), this.matChaiSign);
        chaiBanner.position.set(-0.85, 1.45, 0);
        chaiBanner.rotation.y = Math.PI / 2;
        chaiKiosk.add(chaiBanner);
        chunk.add(chaiKiosk);

        // 8. Flanking Architecture & Palms
        for (let b = 0; b < 4; b++) {
            const side = b % 2 === 0 ? -1 : 1;
            const bX = side * (8.8 + (b % 3) * 2.2);
            const bZ = -this.chunkLength / 2 + (b + 0.5) * (this.chunkLength / 4);
            const bH = 10.0 + (b % 3) * 4.0;
            const bldg = new THREE.Mesh(
                new THREE.BoxGeometry(4.0, bH, 6.0),
                this.matBuildings[b % this.matBuildings.length]
            );
            bldg.position.set(bX, bH / 2, bZ);
            bldg.castShadow = true;
            chunk.add(bldg);
        }

        this.scene.add(chunk);
        return chunk;
    }

    _buildTrackChunks() {
        for (let i = 0; i < this.numChunks; i++) {
            const chunk = this._createTrackChunk(-i * this.chunkLength);
            this.trackChunks.push(chunk);
        }
    }

    _spawnInitialWaves() {
        // Continuous wave progression ahead of player
        for (let i = 0; i < 7; i++) {
            this.spawnObstaclePattern(this.nextSpawnZ);
            this.nextSpawnZ -= this.spawnInterval;
        }
    }

    spawnObstaclePattern(targetZ) {
        const patternType = Math.floor(Math.random() * 5);
        const trainLane = Math.floor(Math.random() * 3);
        const barrierLane = (trainLane + 1) % 3;
        const freeLane = (trainLane + 2) % 3;

        if (patternType === 0) {
            // Pattern 0: Parked Train on one track with Coins on free track
            this._spawnTrain(this.lanes[trainLane], targetZ - 8, false);
            this._spawnCoinRow(this.lanes[freeLane], targetZ - 12, 6);
            this._spawnBarrier(this.lanes[barrierLane], targetZ, false);
        } else if (patternType === 1) {
            // Pattern 1: Oncoming Moving Train! High-speed excitement
            this._spawnTrain(this.lanes[trainLane], targetZ - 14, true);
            this._spawnCoinArc(this.lanes[barrierLane], targetZ + 5, targetZ - 15, 7);
            this._spawnBarrier(this.lanes[barrierLane], targetZ, false);
        } else if (patternType === 2) {
            // Pattern 2: High Overhead Barrier (Requires Slide!)
            this._spawnBarrier(this.lanes[freeLane], targetZ, true);
            this._spawnCoinRow(this.lanes[freeLane], targetZ - 8, 5, 0.4);
            this._spawnTrain(this.lanes[trainLane], targetZ - 10, false);
        } else if (patternType === 3) {
            // Pattern 3: Double Barriers with Powerup in center
            this._spawnBarrier(this.lanes[0], targetZ, false);
            this._spawnBarrier(this.lanes[2], targetZ, false);
            this._spawnCoinRow(this.lanes[1], targetZ - 10, 6);
            if (Math.random() > 0.4) {
                this._spawnPowerup(this.lanes[1], targetZ - 4);
            }
        } else {
            // Pattern 4: Coin Bonanza & Leap Arc
            this._spawnBarrier(this.lanes[1], targetZ, false);
            this._spawnCoinArc(this.lanes[1], targetZ + 6, targetZ - 12, 7);
            this._spawnTrain(this.lanes[trainLane], targetZ - 10, false);
            if (Math.random() > 0.5) {
                this._spawnPowerup(this.lanes[freeLane], targetZ - 6);
            }
        }
    }

    _spawnTrain(x, z, isOncoming = false) {
        let train;
        if (this.models.trains.length > 0) {
            const tmpl = this.models.trains[Math.floor(Math.random() * this.models.trains.length)];
            train = tmpl.clone();
            train.position.set(x, 0.1, z);
        } else {
            // Procedural Authentic Indian Railways ICF Express Coach
            train = new THREE.Group();
            const trainLen = 16.5;
            const trainW = 1.95;
            const trainH = 2.5;

            // Deep Blue Lower/Upper Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(trainW, trainH * 0.75, trainLen), this.matTrainIRBlue);
            body.position.y = (trainH * 0.75) / 2 + 0.35;
            body.castShadow = true;
            train.add(body);

            // Iconic Cream Mid-Band
            const creamBand = new THREE.Mesh(new THREE.BoxGeometry(trainW + 0.02, 0.5, trainLen), this.matTrainCreamBand);
            creamBand.position.y = 1.65;
            train.add(creamBand);

            // Grey Steel Roof
            const roof = new THREE.Mesh(new THREE.BoxGeometry(trainW * 0.94, 0.28, trainLen * 0.98), this.matTrainRoof);
            roof.position.y = trainH + 0.15;
            train.add(roof);

            // Front Windshield
            const frontFaceZ = trainLen / 2 + 0.02;
            const windshield = new THREE.Mesh(new THREE.BoxGeometry(trainW * 0.8, 0.65, 0.05), this.matTrainWindow);
            windshield.position.set(0, 1.85, frontFaceZ);
            train.add(windshield);

            // Front Yellow Hazard Stripes
            const yellowStripes = new THREE.Mesh(new THREE.BoxGeometry(trainW * 0.9, 0.45, 0.06), this.matTrainGrill);
            yellowStripes.position.set(0, 0.9, frontFaceZ);
            train.add(yellowStripes);

            // Headlights
            [-0.6, 0.6].forEach((hx) => {
                const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), this.matHeadlight);
                hl.rotation.x = Math.PI / 2;
                hl.position.set(hx, 1.0, frontFaceZ + 0.02);
                train.add(hl);
            });

            train.position.set(x, 0, z);
        }

        train.userData = {
            type: 'train',
            width: 1.95,
            height: 2.6,
            length: 16.5,
            isOncoming: isOncoming,
            speed: isOncoming ? 14.0 : 0.0
        };

        this.scene.add(train);
        this.obstacles.push(train);
    }

    _spawnBarrier(x, z, isHigh = false) {
        let barrier;
        if (this.models.barriers.length > 0 && !isHigh) {
            const tmpl = this.models.barriers[Math.floor(Math.random() * this.models.barriers.length)];
            barrier = tmpl.clone();
            barrier.position.set(x, 0.1, z);
        } else {
            barrier = new THREE.Group();
            if (isHigh) {
                // High overhead caution hurdle: must slide underneath!
                const bar = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.45, 0.15), this.matCurbStripe);
                bar.position.y = 1.35;
                bar.castShadow = true;
                barrier.add(bar);

                // Tall support posts
                const legGeo = new THREE.BoxGeometry(0.12, 1.8, 0.12);
                [-0.85, 0.85].forEach((lx) => {
                    const leg = new THREE.Mesh(legGeo, this.matGantryLattice);
                    leg.position.set(lx, 0.9, 0);
                    barrier.add(leg);
                });
            } else {
                // Low hurdle: jumpable over!
                const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.38, 0.14), this.matCurbStripe);
                bar.position.y = 0.55;
                bar.castShadow = true;
                barrier.add(bar);

                const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.72, 8);
                [-0.75, 0.75].forEach((lx) => {
                    const leg = new THREE.Mesh(legGeo, this.matGantryLattice);
                    leg.position.set(lx, 0.36, 0);
                    barrier.add(leg);
                });
            }
            barrier.position.set(x, 0, z);
        }

        barrier.userData = {
            type: isHigh ? 'high_barrier' : 'barrier',
            width: 1.8,
            height: isHigh ? 1.8 : 0.82,
            length: 0.35
        };

        this.scene.add(barrier);
        this.obstacles.push(barrier);
    }

    _spawnCoin(x, y, z) {
        let coin;
        if (this.models.coins.length > 0) {
            coin = this.models.coins[0].clone();
            coin.position.set(x, y, z);
        } else {
            // Glowing 3D Gold Coin
            coin = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), this.matCoin);
            coin.rotation.x = Math.PI / 2;
            coin.position.set(x, y, z);
        }
        coin.userData = {
            type: 'coin',
            collected: false
        };
        this.scene.add(coin);
        this.coins.push(coin);
    }

    _spawnCoinRow(x, startZ, count, y = 0.85) {
        for (let i = 0; i < count; i++) {
            this._spawnCoin(x, y, startZ - i * 1.8);
        }
    }

    _spawnCoinArc(x, startZ, endZ, count) {
        const dz = (endZ - startZ) / (count - 1);
        for (let i = 0; i < count; i++) {
            const z = startZ + i * dz;
            const arcH = 0.85 + Math.sin((i / (count - 1)) * Math.PI) * 2.3;
            this._spawnCoin(x, arcH, z);
        }
    }

    _spawnPowerup(x, z) {
        const types = ['magnet', 'hoverboard', 'jetpack', 'multiplier'];
        const chosen = types[Math.floor(Math.random() * types.length)];

        let powerup;
        if (this.models.powerups.length > 0) {
            const tmpl = this.models.powerups[Math.floor(Math.random() * this.models.powerups.length)];
            powerup = tmpl.clone();
            powerup.position.set(x, 0.95, z);
        } else {
            const colors = {
                magnet: 0xe91e63,
                hoverboard: 0x9c27b0,
                jetpack: 0xff9800,
                multiplier: 0x4caf50
            };
            const geo = new THREE.OctahedronGeometry(0.38, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[chosen] || 0x00bcd4,
                emissive: colors[chosen] || 0x00bcd4,
                emissiveIntensity: 0.6,
                roughness: 0.2
            });
            powerup = new THREE.Mesh(geo, mat);
            powerup.position.set(x, 0.95, z);
        }

        powerup.userData = {
            type: 'powerup',
            powerupType: chosen,
            collected: false
        };

        this.scene.add(powerup);
        this.coins.push(powerup);
    }

    update(delta, playerZ, speed) {
        // Continuous wave generation: maintain 160m buffer ahead of player
        while (this.nextSpawnZ > playerZ - 160.0) {
            this.spawnObstaclePattern(this.nextSpawnZ);
            this.nextSpawnZ -= this.spawnInterval;
        }

        // Track chunk recycling
        for (const chunk of this.trackChunks) {
            if (chunk.position.z > playerZ + this.chunkLength) {
                let minZ = 0;
                for (const c of this.trackChunks) {
                    if (c.position.z < minZ) minZ = c.position.z;
                }
                chunk.position.z = minZ - this.chunkLength;
            }
        }

        // Rotate collectibles & coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const item = this.coins[i];
            item.rotation.y += delta * 3.8;
            if (item.position.z > playerZ + 15.0) {
                this.scene.remove(item);
                this.coins.splice(i, 1);
            }
        }

        // Move oncoming trains & clean passed obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            if (obs.userData.isOncoming) {
                obs.position.z += obs.userData.speed * delta;
            }
            if (obs.position.z > playerZ + 25.0) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }
    }

    checkCollisions(runnerHitbox, runnerCenter, hasMagnet, onCollectCoin, onCollectPowerup, onHitObstacle) {
        // 1. Collectibles with Magnetic Attraction
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const item = this.coins[i];
            const dist = item.position.distanceTo(runnerCenter);

            // Magnetic suction effect (Subway Surfers magnet mechanic)
            if (hasMagnet && item.userData.type === 'coin' && dist < 12.0) {
                const dir = runnerCenter.clone().sub(item.position).normalize();
                item.position.addScaledVector(dir, 32.0 * 0.016);
            }

            if (dist < 1.15) {
                this.scene.remove(item);
                this.coins.splice(i, 1);
                if (item.userData.type === 'powerup') {
                    if (onCollectPowerup) onCollectPowerup(item.userData.powerupType);
                } else {
                    if (onCollectCoin) onCollectCoin();
                }
            }
        }

        // 2. Obstacles with Subway Surfers Forgiveness Margins
        for (const obs of this.obstacles) {
            const u = obs.userData;
            // 22% inward grace margin for seamless lane switching
            const halfW = ((u.width || 1.8) * 0.78) / 2;
            const halfL = ((u.length || 2.0) * 0.78) / 2;
            const topY = obs.position.y + (u.height || 2.0);

            const obsBox = new THREE.Box3(
                new THREE.Vector3(obs.position.x - halfW, obs.position.y, obs.position.z - halfL),
                new THREE.Vector3(obs.position.x + halfW, topY, obs.position.z + halfL)
            );

            if (runnerHitbox.intersectsBox(obsBox)) {
                // Low barrier: jump clearance check
                if (u.type === 'barrier' && runnerHitbox.min.y > 0.58) {
                    continue;
                }
                // High overhead barrier: duck/slide clearance check
                if (u.type === 'high_barrier' && runnerHitbox.max.y < 0.85) {
                    continue;
                }
                if (onHitObstacle) onHitObstacle(u.type);
                return;
            }
        }
    }

    reset() {
        // Clear all spawned obstacles and coins
        for (const obs of this.obstacles) this.scene.remove(obs);
        for (const coin of this.coins) this.scene.remove(coin);
        this.obstacles = [];
        this.coins = [];

        // Reset track chunks
        for (let i = 0; i < this.trackChunks.length; i++) {
            this.trackChunks[i].position.z = -i * this.chunkLength;
        }

        // Reset spawn cursor and reseed continuous waves
        this.nextSpawnZ = -18.0;
        this._spawnInitialWaves();
    }
}
