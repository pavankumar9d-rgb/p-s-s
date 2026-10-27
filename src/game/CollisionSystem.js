/**
 * CollisionSystem.js — Type-aware hitboxes for Subway Surfers-style obstacles.
 */

const LANES_X = [-2.0, 0.0, 2.0];

function laneX(lane) {
    return LANES_X[lane] ?? 0;
}

function getPlayerHitBox(player) {
    const x = player.position.x;
    const y = player.position.y;
    const z = player.position.z;

    if (player.isJetpacking) {
        return new THREE.Box3(
            new THREE.Vector3(x - 0.32, y - 0.4, z - 0.28),
            new THREE.Vector3(x + 0.32, y + 0.55, z + 0.28)
        );
    }

    if (player.isSliding) {
        return new THREE.Box3(
            new THREE.Vector3(x - 0.34, y - 0.62, z - 0.22),
            new THREE.Vector3(x + 0.34, y - 0.08, z + 0.22)
        );
    }

    if (!player.isGrounded) {
        return new THREE.Box3(
            new THREE.Vector3(x - 0.34, y - 0.5, z - 0.28),
            new THREE.Vector3(x + 0.34, y + 0.55, z + 0.28)
        );
    }

    return new THREE.Box3(
        new THREE.Vector3(x - 0.36, y - 0.72, z - 0.3),
        new THREE.Vector3(x + 0.36, y + 0.58, z + 0.3)
    );
}

function getObstacleHitBox(obstacle) {
    const x = laneX(obstacle.lane);
    const z = obstacle.mesh.position.z;

    switch (obstacle.type) {
        case 'barrierHigh':
            return new THREE.Box3(
                new THREE.Vector3(x - 0.85, 1.02, z - 0.55),
                new THREE.Vector3(x + 0.85, 1.72, z + 0.55)
            );
        case 'barrierLow':
            return new THREE.Box3(
                new THREE.Vector3(x - 0.85, 0.0, z - 0.45),
                new THREE.Vector3(x + 0.85, 0.58, z + 0.45)
            );
        case 'train':
            return new THREE.Box3(
                new THREE.Vector3(x - 0.85, 0.0, z - 6.2),
                new THREE.Vector3(x + 0.85, 2.35, z + 6.2)
            );
        case 'ramp':
            return new THREE.Box3(
                new THREE.Vector3(x - 0.85, 0.0, z - 2.2),
                new THREE.Vector3(x + 0.85, 1.2, z + 2.2)
            );
        default:
            return new THREE.Box3().setFromObject(obstacle.mesh);
    }
}

function canPlayerPass(player, obstacle) {
    if (obstacle.lane !== player.currentLane) return true;

    if (obstacle.type === 'barrierHigh') {
        return player.isSliding;
    }
        if (obstacle.type === 'barrierLow') {
            return !player.isGrounded;
        }
    if (obstacle.type === 'ramp') {
        return true;
    }
    if (obstacle.type === 'train') {
        if (player.position.y >= 2.05) return true;
        return false;
    }
    return false;
}

function boxesOverlap(a, b) {
    return a.intersectsBox(b);
}

export { getPlayerHitBox, getObstacleHitBox, canPlayerPass, boxesOverlap };
