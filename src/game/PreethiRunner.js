/**
 * PreethiRunner.js — Phase 2 photo-rigged runner (exact preethi.png likeness)
 * with optional GLB model fallback.
 */

import { AnimationController, STATE_RUN, STATE_JUMP, STATE_SLIDE, STATE_JETPACK, STATE_LAND } from './AnimationController.js';
import { buildPreethiCharacter, applySkinColors as applyToonSkinColors } from './PreethiCharacter.js';

const IMAGE_SOURCES = [
    'preethi.png',
    'a_stylized_3d_digital_art_character_inspired_by_the_person_in_the_photo._the.png'
];

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

function makeRegionTexture(img, region, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const sx = img.width * region.x;
    const sy = img.height * region.y;
    const sw = img.width * region.w;
    const sh = img.height * region.h;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

async function loadSourceImage() {
    for (const src of IMAGE_SOURCES) {
        try {
            return await loadImage(src);
        } catch (_) { /* try next */ }
    }
    throw new Error('Could not load Preethi image');
}

function makePlane(w, h, tex, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
        roughness: 0.45,
        metalness: 0.05,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.08,
        ...opts
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.castShadow = true;
    return mesh;
}

async function buildPhotoRiggedRunner() {
    const img = await loadSourceImage();
    const group = new THREE.Group();

    const bodyTex = makeRegionTexture(img, { x: 0.12, y: 0.0, w: 0.76, h: 0.62 }, 768);
    const legTex = makeRegionTexture(img, { x: 0.2, y: 0.52, w: 0.6, h: 0.46 }, 512);
    const hairTex = makeRegionTexture(img, { x: 0.22, y: 0.0, w: 0.56, h: 0.22 }, 256);

    const bodyPlane = makePlane(0.95, 1.35, bodyTex);
    bodyPlane.position.set(0, 0.48, 0.02);
    group.add(bodyPlane);

    const legPlane = makePlane(0.72, 0.72, legTex);
    legPlane.position.set(0, -0.42, 0.03);
    group.add(legPlane);

    const hairPlane = makePlane(0.55, 0.32, hairTex);
    hairPlane.position.set(0, 1.02, 0.04);
    group.add(hairPlane);

    const shadowBlob = new THREE.Mesh(
        new THREE.CircleGeometry(0.42, 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
    );
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = 0.01;
    group.add(shadowBlob);

    const jetpack = new THREE.Group();
    jetpack.position.set(0, 0.55, -0.12);
    const jetBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.34, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.35 })
    );
    jetpack.add(jetBody);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6eb4 });
    [-0.1, 0.1].forEach((x) => {
        const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 8), flameMat);
        n.position.set(x, -0.2, 0);
        jetpack.add(n);
    });
    jetpack.visible = false;
    group.add(jetpack);

    const boardMesh = new THREE.Group();
    boardMesh.position.set(0, -0.58, 0.06);
    boardMesh.add(new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.07, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4 })
    ));
    const neon = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.03, 1.35),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    neon.position.y = -0.04;
    boardMesh.add(neon);
    boardMesh.visible = false;
    group.add(boardMesh);

    const parts = {
        bodyPlane,
        legPlane,
        hairPlane,
        jetpack,
        boardMesh,
        torso: bodyPlane,
        headGroup: hairPlane,
        leftArm: bodyPlane,
        rightArm: bodyPlane,
        leftLeg: legPlane,
        rightLeg: legPlane,
        skirt: bodyPlane,
        hairBack: hairPlane
    };

    group.userData.parts = parts;
    group.userData.isPhotoRig = true;
    return group;
}

async function tryLoadGLB(path) {
    try {
        const mod = await import('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js');
        const loader = new mod.GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
        });
    } catch (_) {
        return null;
    }
}

async function buildPreethiRunner() {
    // Prefer a real rigged GLB model if one has been dropped into /models,
    // otherwise build the true stylized 3D toon character (real geometry,
    // toon shading, and a likeness texture from preethi.png) — this is the
    // real in-game body, not a flat photo cutout.
    let mesh = await tryLoadGLB('models/preethi_runner.glb');
    let parts = {};

    if (mesh) {
        mesh.scale.set(0.85, 0.85, 0.85);
        mesh.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
        parts = {
            torso: mesh,
            headGroup: mesh,
            leftArm: mesh,
            rightArm: mesh,
            leftLeg: mesh,
            rightLeg: mesh,
            jetpack: { visible: false },
            boardMesh: { visible: false }
        };
    } else {
        mesh = buildPreethiCharacter();
        parts = mesh.userData.parts;
    }

    const anim = new AnimationController(parts);

    return {
        mesh,
        parts,
        anim,
        setAnimState(name) {
            anim.setState(name);
        }
    };
}

function applySkinColors(mesh, skinId) {
    if (!mesh) return;
    if (mesh.userData?.isPhotoRig) return;
    applyToonSkinColors(mesh, skinId);
}

export {
    buildPreethiRunner,
    buildPhotoRiggedRunner,
    applySkinColors,
    STATE_RUN,
    STATE_JUMP,
    STATE_SLIDE,
    STATE_JETPACK,
    STATE_LAND
};
