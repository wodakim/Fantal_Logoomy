import { TILE_W, TILE_H, H_SCALE } from '../core/Constants.js';

export function isoToScreen(x, y, z, camX, camY) {
    return {
        x: (x - y) * (TILE_W / 2) + camX,
        y: (x + y) * (TILE_H / 2) - (z * H_SCALE) + camY
    };
}

export function screenToIso(sx, sy, camX, camY) {
    // 1. Adjust for Camera
    const adjX = sx - camX;
    const adjY = sy - camY;

    const halfW = TILE_W / 2;
    const halfH = TILE_H / 2;

    // Solve linear system
    const dy = adjY / halfH;
    const dx = adjX / halfW;

    const rawX = (dy + dx) / 2;
    const rawY = (dy - dx) / 2;

    return {
        x: Math.round(rawX),
        y: Math.round(rawY)
    };
}

export function pickTile(sx, sy, camX, camY, chunk) {
    let bestCandidate = null;

    // Flat estimate:
    const flatIso = screenToIsoFlat(sx, sy, camX, camY);
    const searchRadius = 8;

    const startX = Math.max(0, flatIso.x - searchRadius);
    const endX = Math.min(chunk.size, flatIso.x + searchRadius);
    const startY = Math.max(0, flatIso.y - searchRadius);
    const endY = Math.min(chunk.size, flatIso.y + searchRadius);

    // Iterate to find the visually top-most tile
    for (let y = 0; y < chunk.size; y++) {
        for (let x = 0; x < chunk.size; x++) {
            const i = chunk.getIndex(x, y);
            const h = chunk.heightMap[i];
            const scr = isoToScreen(x, y, h, camX, camY);

            if (pointInDiamond(sx, sy, scr.x, scr.y, TILE_W, TILE_H)) {
                bestCandidate = { x: x, y: y };
            }
        }
    }

    if (bestCandidate) return bestCandidate;
    return flatIso;
}

// Basic flat plane projection
export function screenToIsoFlat(sx, sy, camX, camY) {
    const adjX = sx - camX;
    const adjY = sy - camY;
    const halfW = TILE_W / 2;
    const halfH = TILE_H / 2;
    const dy = adjY / halfH;
    const dx = adjX / halfW;
    return {
        x: Math.round((dy + dx) / 2),
        y: Math.round((dy - dx) / 2)
    };
}

function pointInDiamond(px, py, cx, cy, w, h) {
    const dx = Math.abs(px - cx);
    const dy = Math.abs(py - (cy + h/2));
    return (dx / (w/2) + dy / (h/2)) <= 1;
}
