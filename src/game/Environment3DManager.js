import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Environment3DManager.js
 * Generates an authentic Native Indian Railway (IR) environment:
 * - Iconic yellow bilingual station boards ("PREETHI JUNCTION / प्रीति जंक्शन")
 * - Classic Indian Railways Blue & Cream ICF Express Trains
 * - 25 kV AC OHE Catenary steel lattice gantries with ceramic insulators
 * - Red-brick platform pavement with yellow-and-black curb stripes
 * - Trackside Chai / Tea stalls with colorful striped canopies
 * - Indian station benches, water taps, and trackside palms
 * - High-speed infinite chunk recycling and obstacle coordination
 */

export class Environment3DManager {
    constructor(scene) {
        this.scene = scene;
        this.lanes = [-2.0, 0.0, 2.0];
        
        this.trackChunks = [];
        this.chunkLength = 60.0;
        this.numChunks = 4;
        
        this.obstacles = [];
        this.coins = [];

        this.trainModel = null;
        this.barrierModel = null;
        this.coinModel = null;

        this._initTexturesAndMaterials();
        this._buildTrackChunks();
        this._preloadModels();
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
        // 1. Iconic Indian Railway Yellow Station Board Texture
        const stationSignTex = this._createCanvasTexture(512, 160, (ctx, w, h) => {
            // Yellow background
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(0, 0, w, h);
            // Black border
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(6, 6, w - 12, h - 12);
            // Station text
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

        // 2. Chai / Refreshment Stall Banner Texture
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

        // 3. Indian Railway Curb Black & Yellow Warning Stripes
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

        // 4. Track Materials
        this.matBallast = new THREE.MeshStandardMaterial({ color: 0x3a3835, roughness: 0.95 }); // Crushed basalt stone
        this.matRail = new THREE.MeshStandardMaterial({ color: 0xc0c8d2, metallic: 0.95, roughness: 0.18 });
        this.matTie = new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.85 }); // Concrete sleepers
        this.matPlatform = new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.75 }); // Red-terracotta brick platform
        this.matGantryLattice = new THREE.MeshStandardMaterial({ color: 0x37474f, metallic: 0.85, roughness: 0.35 });
        this.matInsulator = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.3 }); // Ceramic brown
        this.matCable = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metallic: 0.7, roughness: 0.4 });
        this.matAwningRed = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 });
        this.matAwningWhite = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 });
        this.matCoin = new THREE.MeshStandardMaterial({ color: 0xffd700, metallic: 0.95, roughness: 0.12, emissive: 0xffaa00, emissiveIntensity: 0.4 });

        // 5. Classic Indian Railways Blue & Cream Train Liveries
        this.matTrainIRBlue = new THREE.MeshStandardMaterial({ color: 0x153f7c, roughness: 0.3, metalness: 0.2 }); // Iconic IR Blue
        this.matTrainCreamBand = new THREE.MeshStandardMaterial({ color: 0xf2edd9, roughness: 0.4 }); // Cream mid-band
        this.matTrainRoof = new THREE.MeshStandardMaterial({ color: 0x546e7a, metallic: 0.3, roughness: 0.6 });
        this.matTrainWindow = new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 0.1, metalness: 0.85 });
        this.matTrainGrill = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.4, emissive: 0xffb300, emissiveIntensity: 0.2 });

        // 6. Regional Buildings (Terracotta, Yellow Ochre, Mint Green)
        this.matBuildings = [
            new THREE.MeshStandardMaterial({ color: 0xc85a38, roughness: 0.75 }), // Terracotta
            new THREE.MeshStandardMaterial({ color: 0xe6a838, roughness: 0.8 }),  // Mustard Ochre
            new THREE.MeshStandardMaterial({ color: 0x388e68, roughness: 0.75 }), // Mint / Colonial Green
            new THREE.MeshStandardMaterial({ color: 0xf5eedc, roughness: 0.85 })  // Sandstone White
        ];
    }

    _preloadModels() {
        const loader = new GLTFLoader();
        loader.load('assets/models/trains/train.glb', (gltf) => {
            this.trainModel = gltf.scene;
            this.trainModel.scale.set(0.95, 0.95, 0.95);
        }, undefined, () => {});

        loader.load('assets/models/obstacles/metal_barrier.glb', (gltf) => {
            this.barrierModel = gltf.scene;
            this.barrierModel.scale.set(0.9, 0.9, 0.9);
        }, undefined, () => {});

        loader.load('assets/models/collectibles/gold_coin.glb', (gltf) => {
            this.coinModel = gltf.scene;
            this.coinModel.scale.set(0.35, 0.35, 0.35);
        }, undefined, () => {});
    }

    _createTrackChunk(zPos) {
        const chunk = new THREE.Group();
        chunk.position.z = zPos;

        // 1. Ballast Stone Bed
        const ballast = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.26, this.chunkLength), this.matBallast);
        ballast.position.set(0, -0.13, 0);
        ballast.receiveShadow = true;
        chunk.add(ballast);

        // 2. Steel Rails (Broad Gauge 3-lanes)
        const railGauge = 1.1;
        this.lanes.forEach((lx) => {
            [-railGauge / 2, railGauge / 2].forEach((offset) => {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, this.chunkLength), this.matRail);
                rail.position.set(lx + offset, 0.045, 0);
                chunk.add(rail);
            });
        });

        // 3. Indian Railway Concrete Monoblock Sleepers
        const sleeperSpacing = 0.8;
        const numSleepers = Math.floor(this.chunkLength / sleeperSpacing);
        for (let i = 0; i < numSleepers; i++) {
            const sz = -this.chunkLength / 2 + i * sleeperSpacing;
            const sleeper = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.07, 0.18), this.matTie);
            sleeper.position.set(0, 0.015, sz);
            sleeper.receiveShadow = true;
            chunk.add(sleeper);
        }

        // 4. Indian Railways 25 kV AC OHE Portal Catenary Gantries
        const gantryZ = 0.0;
        [-4.2, 4.2].forEach((px) => {
            // Steel Lattice Mast
            const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 0.22), this.matGantryLattice);
            mast.position.set(px, 3.1, gantryZ);
            chunk.add(mast);

            // Concrete Mast Foundation
            const mastBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), this.matTie);
            mastBase.position.set(px, 0.3, gantryZ);
            chunk.add(mastBase);
        });

        // Overhead Portal Cross Girder
        const girder = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.32, 0.35), this.matGantryLattice);
        girder.position.set(0, 6.0, gantryZ);
        chunk.add(girder);

        // Insulators & Cantilever Droppers over each lane
        this.lanes.forEach((lx) => {
            const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), this.matInsulator);
            insulator.position.set(lx, 5.65, gantryZ);
            chunk.add(insulator);

            // Overhead Contact Wire
            const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, this.chunkLength, 6), this.matCable);
            wire.rotation.x = Math.PI / 2;
            wire.position.set(lx, 5.4, 0);
            chunk.add(wire);
        });

        // 5. Red-Brick Platforms on Both Sides
        [-5.1, 5.1].forEach((platX, sIdx) => {
            const platform = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, this.chunkLength), this.matPlatform);
            platform.position.set(platX, 0.32, 0);
            platform.receiveShadow = true;
            chunk.add(platform);

            // Black & Yellow Warning Curb Stripe
            const curbOffset = sIdx === 0 ? 0.92 : -0.92;
            const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, this.chunkLength), this.matCurbStripe);
            curb.position.set(platX + curbOffset, 0.66, 0);
            chunk.add(curb);
        });

        // 6. Iconic Yellow Indian Railway Bilingual Station Signboard
        const signGroup = new THREE.Group();
        signGroup.position.set(-5.1, 1.8, -15.0);

        const signPoles = [-1.4, 1.4];
        signPoles.forEach((spx) => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), this.matGantryLattice);
            pole.position.set(spx, -0.2, 0);
            signGroup.add(pole);
        });

        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.08), this.matStationSign);
        signBoard.position.set(0, 0.7, 0);
        signGroup.add(signBoard);
        chunk.add(signGroup);

        // 7. Trackside Chai & Refreshment Kiosk (टपरी)
        const chaiKiosk = new THREE.Group();
        chaiKiosk.position.set(5.1, 0.65, -25.0);

        // Kiosk Base Counter
        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1.1, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.5 }) // Green stall base
        );
        counter.position.set(0, 0.55, 0);
        chaiKiosk.add(counter);

        // Awning Roof (Red & White Striped Canopy)
        const awning = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 2.7), this.matAwningRed);
        awning.position.set(0, 1.8, 0);
        awning.rotation.x = 0.1;
        chaiKiosk.add(awning);

        // Chai Sign Banner
        const chaiBanner = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 2.2), this.matChaiSign);
        chaiBanner.position.set(-0.85, 1.45, 0);
        chaiBanner.rotation.y = Math.PI / 2;
        chaiKiosk.add(chaiBanner);

        chunk.add(chaiKiosk);

        // 8. Station Benches (Cast-iron with wooden slats)
        const benchGroup = new THREE.Group();
        benchGroup.position.set(-5.1, 0.65, -35.0);
        const benchSeat = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.06, 1.4),
            new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7 })
        );
        benchSeat.position.set(0, 0.4, 0);
        benchGroup.add(benchSeat);
        const benchBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.4, 1.4),
            new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7 })
        );
        benchBack.position.set(-0.22, 0.62, 0);
        benchGroup.add(benchBack);
        chunk.add(benchGroup);

        // 9. Traditional Indian Architecture High-rises & Palm Trees
        for (let b = 0; b < 5; b++) {
            const side = b % 2 === 0 ? -1 : 1;
            const bX = side * (8.8 + (b % 3) * 2.2);
            const bZ = -this.chunkLength / 2 + (b + 0.5) * (this.chunkLength / 5);
            const bH = 10.0 + (b % 4) * 4.0;
            const bldg = new THREE.Mesh(
                new THREE.BoxGeometry(4.0, bH, 6.0),
                this.matBuildings[b % this.matBuildings.length]
            );
            bldg.position.set(bX, bH / 2, bZ);
            bldg.castShadow = true;
            chunk.add(bldg);

            // Coconut Palm Tree beside building
            const palm = new THREE.Group();
            palm.position.set(side * 6.6, 0, bZ + 3.0);
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.18, 5.0, 7),
                new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
            );
            trunk.position.y = 2.5;
            trunk.rotation.z = side * 0.08;
            palm.add(trunk);

            const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
            for (let f = 0; f < 6; f++) {
                const frond = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 1.8), frondMat);
                frond.position.set(0, 5.0, 0);
                frond.rotation.y = (f / 6) * Math.PI * 2;
                frond.rotation.x = 0.5;
                palm.add(frond);
            }
            chunk.add(palm);
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

        // 1. Spawn Indian Railway Express Train
        this._spawnIndianTrain(this.lanes[trainLane], targetZ - 12);

        // 2. Spawn Track Hurdle Barrier on another lane
        this._spawnBarrier(this.lanes[barrierLane], targetZ);

        // 3. Spawn Floating Gold Coins
        if (Math.random() > 0.4) {
            this._spawnCoinArc(this.lanes[trainLane], targetZ + 10, targetZ - 20, 8); // Jump over train
        }
        this._spawnCoinRow(this.lanes[freeLane], targetZ - 15, 6);
    }

    _spawnIndianTrain(x, z) {
        const train = new THREE.Group();
        const trainLen = 17.0;
        const trainW = 1.95;
        const trainH = 2.5;

        // Lower body: Classic IR Blue
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(trainW, trainH * 0.75, trainLen),
            this.matTrainIRBlue
        );
        body.position.y = (trainH * 0.75) / 2 + 0.35;
        body.castShadow = true;
        train.add(body);

        // Upper body: Cream Mid-band
        const creamBand = new THREE.Mesh(
            new THREE.BoxGeometry(trainW + 0.02, 0.5, trainLen),
            this.matTrainCreamBand
        );
        creamBand.position.y = 1.65;
        train.add(creamBand);

        // Roof: Dark Grey Ribbed Arch
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(trainW * 0.94, 0.28, trainLen * 0.98),
            this.matTrainRoof
        );
        roof.position.y = trainH + 0.15;
        train.add(roof);

        // Front Windshield & Indian Railway Yellow Buffer Warning Grille
        const frontFaceZ = trainLen / 2 + 0.02;
        const windshield = new THREE.Mesh(
            new THREE.BoxGeometry(trainW * 0.8, 0.65, 0.05),
            this.matTrainWindow
        );
        windshield.position.set(0, 1.85, frontFaceZ);
        train.add(windshield);

        const yellowStripes = new THREE.Mesh(
            new THREE.BoxGeometry(trainW * 0.9, 0.45, 0.06),
            this.matTrainGrill
        );
        yellowStripes.position.set(0, 0.9, frontFaceZ);
        train.add(yellowStripes);

        // Double Headlights
        [-0.65, 0.65].forEach((hx) => {
            const lamp = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12),
                new THREE.MeshBasicMaterial({ color: 0xfffae0 })
            );
            lamp.rotation.x = Math.PI / 2;
            lamp.position.set(hx, 0.9, frontFaceZ + 0.04);
            train.add(lamp);
        });

        train.position.set(x, 0, z);
        train.userData = {
            type: 'train',
            width: 1.9,
            height: 2.6,
            length: trainLen
        };

        this.scene.add(train);
        this.obstacles.push(train);
    }

    _spawnBarrier(x, z) {
        let barrier;
        if (this.barrierModel) {
            barrier = this.barrierModel.clone();
            barrier.position.set(x, 0.1, z);
        } else {
            barrier = new THREE.Group();
            const bar = new THREE.Mesh(
                new THREE.BoxGeometry(1.7, 0.38, 0.12),
                this.matCurbStripe
            );
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
        if (this.coinModel) {
            coin = this.coinModel.clone();
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

    update(delta, playerZ, speed, onCollectCoin, onCrash) {
        // Recycle track chunks
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

        // Coin rotation & cleanup
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.rotation.y += delta * 4.0;
            if (coin.position.z > playerZ + 15.0) {
                this.scene.remove(coin);
                this.coins.splice(i, 1);
            }
        }

        // Obstacle cleanup
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            if (obs.position.z > playerZ + 25.0) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }
    }

    checkCollisions(runnerHitbox, onCollectCoin, onHitObstacle) {
        // Coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            const dist = coin.position.distanceTo(runnerHitbox.getCenter(new THREE.Vector3()));
            if (dist < 1.05) {
                this.scene.remove(coin);
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
                    continue; // Cleared by jumping!
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
