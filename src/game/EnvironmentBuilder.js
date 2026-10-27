/**
 * EnvironmentBuilder.js — Premium subway tunnel environment.
 */

class EnvironmentBuilder {
    static build(scene) {
        const env = { tunnelWalls: [], parallaxLayers: [] };

        scene.fog = new THREE.Fog(0x6a8caf, 18, 120);
        scene.background = new THREE.Color(0x7aa8cc);

        const texLoader = new THREE.TextureLoader();
        texLoader.load('game_background_city.png', (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            scene.background = tex;
        });

        const trackMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.92, metalness: 0.05 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 0.85, roughness: 0.25 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 0.75, metalness: 0.1 });
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        const platform = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.25, 500), trackMat);
        platform.position.set(0, -0.05, -200);
        platform.receiveShadow = true;
        scene.add(platform);

        const gravel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 500), new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 1 }));
        gravel.position.set(0, 0.02, -200);
        scene.add(gravel);

        [-1.55, -1.15, 1.15, 1.55].forEach((x) => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 500), railMat);
            rail.position.set(x, 0.06, -200);
            scene.add(rail);
        });

        for (let i = 0; i < 280; i++) {
            const tie = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.07, 0.2), tieMat);
            tie.position.set(0, 0.03, -i * 1.8);
            tie.receiveShadow = true;
            scene.add(tie);
        }

        [-5.2, 5.2].forEach((x) => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.5, 500), wallMat);
            wall.position.set(x, 3.2, -200);
            wall.receiveShadow = true;
            scene.add(wall);
            env.tunnelWalls.push(wall);

            for (let i = 0; i < 80; i++) {
                const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), neonMat);
                stripe.position.set(x + (x > 0 ? -0.2 : 0.2), 1.2 + (i % 8) * 0.65, -i * 6.2);
                scene.add(stripe);
            }
        });

        const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.2, 500), new THREE.MeshStandardMaterial({ color: 0x3a4550, roughness: 0.8 }));
        roof.position.set(0, 6.6, -200);
        scene.add(roof);

        const buildingColors = [0xc9a87c, 0xa67c52, 0xd4b896, 0x8b6914, 0xe8c99b];
        for (let i = 0; i < 24; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const h = 10 + Math.random() * 14;
            const w = 2.5 + Math.random() * 2;
            const b = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, 4 + Math.random() * 3),
                new THREE.MeshStandardMaterial({ color: buildingColors[i % buildingColors.length], roughness: 0.65 })
            );
            b.position.set(side * (9 + Math.random() * 3), h / 2, -20 - i * 22);
            b.castShadow = true;
            scene.add(b);
            env.parallaxLayers.push({ mesh: b, speed: 0.15 + Math.random() * 0.1 });

            const winMat = new THREE.MeshStandardMaterial({ color: 0xffee99, emissive: 0xffcc44, emissiveIntensity: 0.35 });
            for (let r = 0; r < Math.floor(h / 2.2); r++) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.05), winMat);
                win.position.set(b.position.x - side * (w / 2 + 0.04), 1.2 + r * 2.2, b.position.z);
                scene.add(win);
            }
        }

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 500),
            new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.95 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.12, -200);
        ground.receiveShadow = true;
        scene.add(ground);

        return env;
    }

    static tick(env, dt, speed, isPlaying) {
        if (!env || !isPlaying) return;
        env.parallaxLayers?.forEach((layer) => {
            layer.mesh.position.z += speed * dt * layer.speed;
            if (layer.mesh.position.z > 15) layer.mesh.position.z -= 520;
        });
    }
}

export { EnvironmentBuilder };
