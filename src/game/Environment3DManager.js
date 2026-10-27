import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Environment3DManager {
    constructor(scene) {
        this.scene = scene;
        this.lanes = [-2.0, 0.0, 2.0];
        
        this.trackChunks = [];
        this.chunkLength = 60.0;
        this.numChunks = 4;
        
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];

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
        this.matInsulator = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.3 });
        this.matCable = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metallic: 0.7, roughness: 0.4 });
        this.matCoin = new THREE.MeshStandardMaterial({ color: 0xffd700, metallic: 0.95, roughness: 0.12, emissive: 0xffaa00, emissiveIntensity: 0.4 });

        // Indian Railway Express Train Fallback
        this.matTrainIRBlue = new THREE.MeshStandardMaterial({ color: 0x153f7c, roughness: 0.3, metalness: 0.2 });
        this.matTrainCreamBand = new THREE.MeshStandardMaterial({ color: 0xf2edd9, roughness: 0.4 });
        this.matTrainRoof = new THREE.MeshStandardMaterial({ color: 0x546e7a, metallic: 0.3, roughness: 0.6 });
        this.matTrainWindow = new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 0.1, metalness: 0.85 });
        this.matTrainGrill = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.4, emissive: 0xffb300, emissiveIntensity: 0.3 });

        this.matBuildings = [
            new THREE.MeshStandardMaterial({ color: 0xc85a38, roughness: 0.75 }),
            new THREE.MeshStandardMaterial({ color: 0xe6a838, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x388e68, roughness: 0.75 }),
            new THREE.MeshStandardMaterial({ color: 0xf5eedc, roughness: 0.85 })
        ];
    }

    _preloadAllGLBAssets() {
        const loader = new GLTFLoader();

        const loadModel = (path, category, scale, rotationY = 0) => {
            loader.load(path, (gltf) => {
                const root = gltf.scene;
                root.scale.set(scale, scale, scale);
                if (rotationY) root.rotation.y = rotationY;
                root.traverse((c) => {
                    if (c.isMesh) {
                        c.castShadow = true;
                        c.receiveShadow = true;
                    }
                });
                this.models[category].push(root);
                console.log(`[Environment3DManager] Loaded ${category}: ${path}`);
            }, undefined, () => {});
        };

        // 1. Trains
        loadModel('assets/models/trains/train.glb', 'trains', 0.95, Math.PI);
        loadModel('assets/models/trains/commuter_train.glb', 'trains', 0.95, Math.PI);
        loadModel('assets/models/trains/train_car.glb', 'trains', 0.95, Math.PI);

        // 2. Obstacles
        loadModel('assets/models/obstacles/metal_barrier.glb', 'barriers', 0.85);
        loadModel('assets/models/obstacles/road_barrier.glb', 'barriers', 0.85);
        loadModel('assets/models/obstacles/rail_maintenance_vehicle.glb', 'barriers', 0.9);

        // 3. Collectibles & Powerups
        loadModel('assets/models/collectibles/gold_coin.glb', 'coins', 0.35);
        loadModel('assets/models/collectibles/horseshoe_magnet.glb', 'powerups', 0.45);
        loadModel('assets/models/collectibles/hoverboard.glb', 'powerups', 0.5);
        loadModel('assets/models/collectibles/jetpack.glb', 'powerups', 0.45);

        // 4. Props
        loadModel('assets/models/props/palm_tree.glb', 'props', 1.1);
        loadModel('assets/models/props/bench.glb', 'props', 0.9);
        loadModel('assets/models/props/vending_machine.glb', 'props', 0.85);
        loadModel('assets/models/props/tunnel_entrance.glb', 'props', 1.0);
    }

    _createTrackChunk(zPos) {
        const chunk = new THREE.Group();
        chunk.position.z = zPos;

        // 1. Ballast Stone Bed
        const ballast = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.26, this.chunkLength), this.matBallast);
        ballast.position.set(0, -0.13, 0);
        ballast.receiveShadow = true;
        chunk.add(ballast);

        // 2. Broad Gauge Rails (6 rails)
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

    spawnObstaclePattern(targetZ) {
        const trainLane = Math.floor(Math.random() * 3);
        const barrierLane = (trainLane + 1) % 3;
        const freeLane = (trainLane + 2) % 3;

        // 1. Spawn Train (uses real GLB if available, otherwise Indian Express body)
        this._spawnTrain(this.lanes[trainLane], targetZ - 12);

        // 2. Spawn Barrier (uses real GLB if available)
        this._spawnBarrier(this.lanes[barrierLane], targetZ);

        // 3. Spawn Coins
        if (Math.random() > 0.4) {
            this._spawnCoinArc(this.lanes[trainLane], targetZ + 10, targetZ - 20, 8);
        }
        this._spawnCoinRow(this.lanes[freeLane], targetZ - 15, 6);

        // 4. Occasional Powerup (Magnet / Jetpack / Hoverboard)
        if (Math.random() > 0.6 && this.models.powerups.length > 0) {
            this._spawnPowerup(this.lanes[freeLane], targetZ - 28);
        }
    }

    _spawnTrain(x, z) {
        let train;
        if (this.models.trains.length > 0) {
            const tmpl = this.models.trains[Math.floor(Math.random() * this.models.trains.length)];
            train = tmpl.clone();
            train.position.set(x, 0.1, z);
        } else {
            train = new THREE.Group();
            const trainLen = 17.0;
            const trainW = 1.95;
            const trainH = 2.5;

            const body = new THREE.Mesh(new THREE.BoxGeometry(trainW, trainH * 0.75, trainLen), this.matTrainIRBlue);
            body.position.y = (trainH * 0.75) / 2 + 0.35;
            body.castShadow = true;
            train.add(body);

            const creamBand = new THREE.Mesh(new THREE.BoxGeometry(trainW + 0.02, 0.5, trainLen), this.matTrainCreamBand);
            creamBand.position.y = 1.65;
            train.add(creamBand);

            const roof = new THREE.Mesh(new THREE.BoxGeometry(trainW * 0.94, 0.28, trainLen * 0.98), this.matTrainRoof);
            roof.position.y = trainH + 0.15;
            train.add(roof);

            const frontFaceZ = trainLen / 2 + 0.02;
            const windshield = new THREE.Mesh(new THREE.BoxGeometry(trainW * 0.8, 0.65, 0.05), this.matTrainWindow);
            windshield.position.set(0, 1.85, frontFaceZ);
            train.add(windshield);

            const yellowStripes = new THREE.Mesh(new THREE.BoxGeometry(trainW * 0.9, 0.45, 0.06), this.matTrainGrill);
            yellowStripes.position.set(0, 0.9, frontFaceZ);
            train.add(yellowStripes);

            train.position.set(x, 0, z);
        }

        train.userData = {
            type: 'train',
            width: 1.9,
            height: 2.6,
            length: 16.0
        };

        this.scene.add(train);
        this.obstacles.push(train);
    }

    _spawnBarrier(x, z) {
        let barrier;
        if (this.models.barriers.length > 0) {
            const tmpl = this.models.barriers[Math.floor(Math.random() * this.models.barriers.length)];
            barrier = tmpl.clone();
            barrier.position.set(x, 0.1, z);
        } else {
            barrier = new THREE.Group();
            const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.38, 0.12), this.matCurbStripe);
            bar.position.y = 0.55;
            bar.castShadow = true;
            barrier.add(bar);

            const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8);
            [-0.7, 0.7].forEach((lx) => {
                const leg = new THREE.Mesh(legGeo, this.matGantryLattice);
                leg.position.set(lx, 0.35, 0);
                barrier.add(leg);
            });
            barrier.position.set(x, 0, z);
        }

        barrier.userData = {
            type: 'barrier',
            width: 1.7,
            height: 0.85,
            length: 0.4
        };

        this.scene.add(barrier);
        this.obstacles.push(barrier);
    }

    _spawnCoinRow(x, startZ, count) {
        for (let i = 0; i < count; i++) {
            this._spawnCoin(x, 0.85, startZ - i * 1.8);
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

    _spawnCoin(x, y, z) {
        let coin;
        if (this.models.coins.length > 0) {
            coin = this.models.coins[0].clone();
            coin.position.set(x, y, z);
        } else {
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

    _spawnPowerup(x, z) {
        const tmpl = this.models.powerups[Math.floor(Math.random() * this.models.powerups.length)];
        const powerup = tmpl.clone();
        powerup.position.set(x, 0.95, z);
        powerup.userData = {
            type: 'powerup',
            collected: false
        };
        this.scene.add(powerup);
        this.coins.push(powerup); // Reuse collect check
    }

    update(delta, playerZ, speed, onCollectCoin, onCrash) {
        // Track recycling
        for (const chunk of this.trackChunks) {
            if (chunk.position.z > playerZ + this.chunkLength) {
                let minZ = 0;
                for (const c of this.trackChunks) {
                    if (c.position.z < minZ) minZ = c.position.z;
                }
                chunk.position.z = minZ - this.chunkLength;
                this.spawnObstaclePattern(chunk.position.z);
            }
        }

        // Rotate collectibles
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.rotation.y += delta * 4.0;
            if (coin.position.z > playerZ + 15.0) {
                this.scene.remove(coin);
                this.coins.splice(i, 1);
            }
        }

        // Clean obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            if (obs.position.z > playerZ + 25.0) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }
    }

    checkCollisions(runnerHitbox, onCollectCoin, onHitObstacle) {
        // Collectibles
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const item = this.coins[i];
            const dist = item.position.distanceTo(runnerHitbox.getCenter(new THREE.Vector3()));
            if (dist < 1.1) {
                this.scene.remove(item);
                this.coins.splice(i, 1);
                if (onCollectCoin) onCollectCoin();
            }
        }

        // Obstacles
        for (const obs of this.obstacles) {
            const u = obs.userData;
            const halfW = (u.width || 1.8) / 2;
            const halfL = (u.length || 2.0) / 2;
            const topY = obs.position.y + (u.height || 2.0);

            const obsBox = new THREE.Box3(
                new THREE.Vector3(obs.position.x - halfW, obs.position.y, obs.position.z - halfL),
                new THREE.Vector3(obs.position.x + halfW, topY, obs.position.z + halfL)
            );

            if (runnerHitbox.intersectsBox(obsBox)) {
                if (u.type === 'barrier' && runnerHitbox.min.y > 0.75) {
                    continue;
                }
                if (onHitObstacle) onHitObstacle(u.type);
                return;
            }
        }
    }

    reset() {
        for (const obs of this.obstacles) this.scene.remove(obs);
        for (const coin of this.coins) this.scene.remove(coin);
        this.obstacles = [];
        this.coins = [];

        for (let i = 0; i < this.trackChunks.length; i++) {
            this.trackChunks[i].position.z = -i * this.chunkLength;
            if (i > 0) this.spawnObstaclePattern(-i * this.chunkLength);
        }
    }
}
