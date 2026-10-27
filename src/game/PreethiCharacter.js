/**
 * PreethiCharacter.js
 * Subway Surfers-style stylized 3D runner built from preethi.png reference.
 * Cartoon proportions, toon shading, and face likeness from photo texture.
 */

function createToonGradient() {
    const data = new Uint8Array([0, 128, 255]);
    const tex = new THREE.DataTexture(data, 3, 1, THREE.LuminanceFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
}

function makeToonMat(color, gradientMap) {
    return new THREE.MeshToonMaterial({
        color,
        gradientMap,
        emissive: new THREE.Color(color).multiplyScalar(0.04)
    });
}

function extractPhotoTexture(url, crop) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = crop?.size || 512;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffcca3';
            ctx.fillRect(0, 0, size, size);
            const sx = img.width * crop.x;
            const sy = img.height * crop.y;
            const sw = img.width * crop.w;
            const sh = img.height * crop.h;
            ctx.drawImage(img, sx, sy, sw, sh, 8, 8, size - 16, size - 16);
            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            resolve(tex);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function buildPreethiCharacter() {
    const group = new THREE.Group();
    const gradientMap = createToonGradient();

    const dressColor = 0x8a5d78;   // sampled from preethi.png torso/leg region (mauve/berry outfit)
    const dressDark = 0x4a2f42;    // sampled shadow tone of the same outfit
    const skinColor = 0xd4a883;    // sampled from preethi.png face region
    const hairColor = 0x2f2117;    // sampled from preethi.png hair region (dark brown/black)
    const blackColor = 0x1c1c1c;
    const sandalColor = 0x8a9098;
    const silverColor = 0xc8d0d8;
    const bindiColor = 0xe53935;

    const dressMat = makeToonMat(dressColor, gradientMap);
    const dressDarkMat = makeToonMat(dressDark, gradientMap);
    const skinMat = makeToonMat(skinColor, gradientMap);
    const hairMat = makeToonMat(hairColor, gradientMap);
    const blackMat = makeToonMat(blackColor, gradientMap);
    const sandalMat = makeToonMat(sandalColor, gradientMap);
    const silverMat = makeToonMat(silverColor, gradientMap);
    const bindiMat = new THREE.MeshBasicMaterial({ color: bindiColor });

    const parts = {
        torso: null,
        headGroup: null,
        leftArm: null,
        rightArm: null,
        leftLeg: null,
        rightLeg: null,
        skirt: null,
        hairBack: null,
        hairSide: null,
        jetpack: null,
        boardMesh: null,
        faceMesh: null
    };

    // ── Torso / bodice (fitted top of dress) ──
    parts.torso = new THREE.Group();
    parts.torso.position.y = 0.52;

    const bodice = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 0.38, 12),
        dressMat
    );
    bodice.position.y = 0.08;
    parts.torso.add(bodice);

    const neckline = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.025, 8, 16, Math.PI),
        dressDarkMat
    );
    neckline.position.set(0, 0.24, 0.04);
    neckline.rotation.x = Math.PI * 0.55;
    parts.torso.add(neckline);

    group.add(parts.torso);

    // ── Pleated skirt with ruffle hem ──
    parts.skirt = new THREE.Group();
    parts.skirt.position.y = 0.28;

    const skirtMain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.48, 0.42, 16, 1, true),
        dressMat
    );
    skirtMain.position.y = 0.08;
    parts.skirt.add(skirtMain);

    const ruffle = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.06, 8, 20),
        dressDarkMat
    );
    ruffle.rotation.x = Math.PI / 2;
    ruffle.position.y = -0.08;
    parts.skirt.add(ruffle);

    for (let i = 0; i < 8; i++) {
        const pleat = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.36, 0.42),
            dressDarkMat
        );
        const angle = (i / 8) * Math.PI * 2;
        pleat.position.set(Math.sin(angle) * 0.34, 0.08, Math.cos(angle) * 0.34);
        pleat.rotation.y = angle;
        parts.skirt.add(pleat);
    }
    group.add(parts.skirt);

    // ── Head (Subway Surfers big-head ratio) ──
    parts.headGroup = new THREE.Group();
    parts.headGroup.position.y = 1.05;

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 20, 20),
        skinMat
    );
    parts.headGroup.add(head);

    // Cartoon eyes (large, expressive)
    const eyeWhiteMat = makeToonMat(0xffffff, gradientMap);
    const pupilMat = makeToonMat(0x2d1810, gradientMap);
    const lashMat = makeToonMat(0x1a1008, gradientMap);

    [-1, 1].forEach((side) => {
        const eyeGrp = new THREE.Group();
        eyeGrp.position.set(side * 0.11, 0.04, 0.28);

        const eyeWhite = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 12, 12),
            eyeWhiteMat
        );
        eyeWhite.scale.set(1, 1.15, 0.55);
        eyeGrp.add(eyeWhite);

        const pupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 10, 10),
            pupilMat
        );
        pupil.position.set(side * 0.02, -0.01, 0.04);
        eyeGrp.add(pupil);

        const highlight = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        highlight.position.set(side * 0.03, 0.025, 0.06);
        eyeGrp.add(highlight);

        const lash = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.025, 0.02),
            lashMat
        );
        lash.position.set(0, 0.08, 0.02);
        lash.rotation.z = side * 0.15;
        eyeGrp.add(lash);

        parts.headGroup.add(eyeGrp);
    });

    // Smile
    const smile = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.012, 8, 12, Math.PI),
        makeToonMat(0xc97a6a, gradientMap)
    );
    smile.position.set(0, -0.06, 0.3);
    smile.rotation.x = Math.PI * 0.15;
    smile.rotation.z = Math.PI;
    parts.headGroup.add(smile);

    // Bindi
    const bindi = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        bindiMat
    );
    bindi.position.set(0, 0.18, 0.32);
    bindi.visible = false; // only an assumption — not confirmed in preethi.png
    parts.headGroup.add(bindi);

    // Hair cap
    const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
        hairMat
    );
    hairCap.position.y = 0.06;
    hairCap.rotation.x = -0.1;
    parts.headGroup.add(hairCap);

    // Long flowing hair (back)
    parts.hairBack = new THREE.Group();
    parts.hairBack.position.set(0, -0.08, -0.18);
    const hairStrand1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.06, 0.75, 10),
        hairMat
    );
    hairStrand1.rotation.x = 0.25;
    parts.hairBack.add(hairStrand1);
    const hairStrand2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.04, 0.58, 10),
        hairMat
    );
    hairStrand2.position.set(0.12, -0.05, -0.05);
    hairStrand2.rotation.x = 0.35;
    hairStrand2.rotation.z = -0.2;
    parts.hairBack.add(hairStrand2);
    parts.headGroup.add(parts.hairBack);

    // Side hair drape
    parts.hairSide = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.05, 0.48, 10),
        hairMat
    );
    parts.hairSide.position.set(-0.28, -0.15, 0.05);
    parts.hairSide.rotation.z = 0.4;
    parts.headGroup.add(parts.hairSide);

    // Earrings (jhumka style)
    [-1, 1].forEach((side) => {
        const earring = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 8, 8),
            silverMat
        );
        earring.position.set(side * 0.32, -0.05, 0.02);
        earring.scale.y = 1.4;
        parts.headGroup.add(earring);
    });

    // Necklace
    const necklace = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.012, 8, 20),
        silverMat
    );
    necklace.position.set(0, -0.28, 0.12);
    necklace.rotation.x = Math.PI / 2.8;
    parts.headGroup.add(necklace);

    group.add(parts.headGroup);

    // Face photo overlay (applied async): crop is the ACTUAL detected face
    // bounding box from preethi.png (hairline-to-chin), not a guess — this is
    // what makes the 3D head read as her specific face rather than a generic one.
    extractPhotoTexture('preethi.png', { x: 0.39, y: 0.02, w: 0.24, h: 0.28, size: 512 }).then((faceTex) => {
        if (!faceTex || !parts.headGroup) return;
        parts.headGroup.children.forEach((child) => {
            if (child.type === 'Group' && child.children.some(c => c.material && c.material.color && c.material.color.getHex() === 0xffffff)) {
                child.visible = false;
            }
        });
        const smile = parts.headGroup.children.find(c => c.geometry && c.geometry.type === 'TorusGeometry');
        if (smile) smile.visible = false;

        const facePlane = new THREE.Mesh(
            new THREE.PlaneGeometry(0.42, 0.48),
            new THREE.MeshBasicMaterial({
                map: faceTex,
                transparent: true,
                opacity: 0.97,
                depthWrite: false
            })
        );
        facePlane.position.set(0, 0.02, 0.31);
        parts.headGroup.add(facePlane);
        parts.faceMesh = facePlane;
    });

    // Outfit texture overlay from source image (real fabric detail/pattern on
    // top of the sampled base color) — cropped tight to the subject's torso
    // to avoid background bleeding into the texture.
    extractPhotoTexture('preethi.png', { x: 0.36, y: 0.20, w: 0.30, h: 0.42, size: 1024 }).then((dressTex) => {
        if (!dressTex) return;
        const dressPhotoMat = new THREE.MeshBasicMaterial({
            map: dressTex,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });
        const torsoPhoto = new THREE.Mesh(new THREE.CylinderGeometry(0.223, 0.281, 0.381, 14, 1, true), dressPhotoMat);
        torsoPhoto.position.set(0, 0.60, 0);
        group.add(torsoPhoto);
        const skirtPhoto = new THREE.Mesh(new THREE.CylinderGeometry(0.282, 0.482, 0.421, 16, 1, true), dressPhotoMat);
        skirtPhoto.position.set(0, 0.36, 0);
        group.add(skirtPhoto);
    });

    // ── Arms with puff sleeves ──
    function buildArm(side) {
        const arm = new THREE.Group();
        arm.position.set(side * 0.38, 0.58, 0);

        const puff = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 10, 10),
            dressMat
        );
        puff.scale.set(1, 0.9, 1);
        arm.add(puff);

        const forearm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.06, 0.3, 10),
            skinMat
        );
        forearm.position.y = -0.28;
        arm.add(forearm);

        const hand = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8),
            skinMat
        );
        hand.position.y = -0.48;
        arm.add(hand);

        return arm;
    }

    parts.leftArm = buildArm(-1);
    parts.rightArm = buildArm(1);
    group.add(parts.leftArm, parts.rightArm);

    // ── Legs (black leggings + platform sandals) ──
    function buildLeg(side) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.16, 0.02, 0);

        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.08, 0.26, 10),
            blackMat
        );
        thigh.position.y = -0.14;
        leg.add(thigh);

        const calf = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.07, 0.28, 10),
            blackMat
        );
        calf.position.y = -0.44;
        leg.add(calf);

        const shoe = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.08, 0.32),
            sandalMat
        );
        shoe.position.set(0, -0.62, 0.04);
        leg.add(shoe);

        const strap = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.03, 0.06),
            sandalMat
        );
        strap.position.set(0, -0.58, 0.12);
        leg.add(strap);

        return leg;
    }

    parts.leftLeg = buildLeg(-1);
    parts.rightLeg = buildLeg(1);
    group.add(parts.leftLeg, parts.rightLeg);

    // ── Jetpack ──
    parts.jetpack = new THREE.Group();
    parts.jetpack.position.set(0, 0.5, -0.22);

    const jetBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.36, 0.14),
        sandalMat
    );
    parts.jetpack.add(jetBody);

    const nozzleMat = new THREE.MeshBasicMaterial({ color: 0xff6eb4 });
    [-0.1, 0.1].forEach((x) => {
        const nozzle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.07, 0.16, 8),
            nozzleMat
        );
        nozzle.position.set(x, -0.22, 0);
        parts.jetpack.add(nozzle);
    });
    parts.jetpack.visible = false;
    group.add(parts.jetpack);

    // ── Hoverboard ──
    parts.boardMesh = new THREE.Group();
    parts.boardMesh.position.set(0, -0.68, 0.05);

    const boardBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.07, 1.35),
        sandalMat
    );
    parts.boardMesh.add(boardBase);

    const boardNeon = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.03, 1.4),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    boardNeon.position.y = -0.04;
    parts.boardMesh.add(boardNeon);
    parts.boardMesh.visible = false;
    group.add(parts.boardMesh);

    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    group.userData.parts = parts;
    return group;
}

function applySkinColors(mesh, skinId) {
    let dressColor = 0x9b7ec8;
    let dressDark = 0x7d64a8;
    let accent = 0x00f0ff;

    if (skinId === 'synth_raider') {
        dressColor = 0xc0392b;
        dressDark = 0x96281b;
        accent = 0xff69b4;
    } else if (skinId === 'cyber_ninja') {
        dressColor = 0x1a5276;
        dressDark = 0x154360;
        accent = 0x39ff14;
    }

    mesh.traverse((child) => {
        if (!child.isMesh || !child.material || !child.material.color) return;
        const hex = child.material.color.getHex();
        if (hex === 0x9b7ec8 || hex === 0xc0392b || hex === 0x1a5276) {
            child.material = child.material.clone();
            child.material.color.setHex(dressColor);
        }
        if (hex === 0x7d64a8 || hex === 0x96281b || hex === 0x154360) {
            child.material = child.material.clone();
            child.material.color.setHex(dressDark);
        }
        if (child.material.color && child.material.color.getHex() === 0x00f0ff) {
            child.material = child.material.clone();
            child.material.color.setHex(accent);
        }
    });
}

export { buildPreethiCharacter, applySkinColors };
