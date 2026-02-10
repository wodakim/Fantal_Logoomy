import { TILE_W, TILE_H, H_SCALE } from '../core/Constants.js';

export function isoToScreen(x, y, z, camX, camY) {
    return {
        x: (x - y) * (TILE_W / 2) + camX,
        y: (x + y) * (TILE_H / 2) - (z * H_SCALE) + camY
    };
}

export function screenToIso(sx, sy, camX, camY) {
    let adjX = sx - camX;
    let adjY = sy - camY;
    // Approximation, needs iteration for height
    return {
        x: Math.floor((adjY / (TILE_H/2) + adjX / (TILE_W/2)) / 2),
        y: Math.floor((adjY / (TILE_H/2) - adjX / (TILE_W/2)) / 2)
    };
}
