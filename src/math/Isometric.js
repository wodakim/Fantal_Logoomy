import { TILE_W, TILE_H, H_SCALE } from '../core/Constants.js';

export function isoToScreen(x, y, z, camX, camY) {
    return {
        x: (x - y) * (TILE_W / 2) + camX,
        y: (x + y) * (TILE_H / 2) - (z * H_SCALE) + camY
    };
}

// Improved screenToIso with Z-Plane intersection
export function screenToIso(sx, sy, camX, camY) {
    // 1. Adjust for Camera
    const adjX = sx - camX;
    const adjY = sy - camY;

    // 2. We need to solve for x, y assuming z = 0 (Base Plane picking)
    // Formula derivation:
    // adjX = (x - y) * (W/2)
    // adjY = (x + y) * (H/2)  (if z=0)
    //
    // x - y = adjX / (W/2)
    // x + y = adjY / (H/2)
    //
    // 2x = adjX/(W/2) + adjY/(H/2)
    // x = (adjX/(W/2) + adjY/(H/2)) / 2

    // However, the previous implementation might have had a Y-offset issue.
    // Let's be precise.
    // The "center" of the tile (0,0) in isoToScreen is at (camX, camY).
    // Usually iso engines center the top-left corner or the center of the diamond.
    // With current formula: (0,0,0) -> (camX, camY).
    // So if I click exactly at (camX, camY), I should get (0,0).

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

// Raycast helper to find tile at screen pos considering Height
// Iterates from top height down to find the first tile under cursor
export function pickTile(sx, sy, camX, camY, chunk) {
    // We check every tile? No, too slow.
    // We can cast a ray. Or simpler:
    // Project every visible tile to screen (bounding box) and check pointInPoly.
    // Or: iterate Z levels.

    // Simple heuristic:
    // 1. Get base coordinate (Z=0)
    // 2. Check Z=MaxHeight to Z=0.
    // For a tile at (x,y,z), the screen Y is higher (smaller value) by z*H_SCALE.

    // Let's brute force a bit around the base coord.
    // The "true" tile might be at x+1, y+1 but high up?
    // Actually, increasing Z moves the sprite UP (lower Y screen).

    // Let's stick to the Z=0 plane for movement selection if the map is flat-ish.
    // But for "Flesh-Carver" with height 6, clicking the top of a hill (Z=6)
    // will register as a tile "behind" it at Z=0.
    // Offset is Y + z*H_SCALE.

    // Inverse with Z:
    // adjY + z*H = (x+y)*halfH

    // Improved Picker:
    // Cast a ray "down" the screen Y axis?
    // Actually, just loop through candidates.
    // The clicked pixel (sx, sy) could correspond to (x,y) at height Z.
    // So screenToIso(sx, sy + Z*H_SCALE) would give the x,y.

    const candidates = [];
    const maxZ = 16; // Max height

    for (let z = 0; z <= maxZ; z++) {
        // Shift screen Y "down" to compensate for Z height lifting it up
        // If I click a pixel, and it was a tile at height Z, then the "base" projection
        // would have been lower by Z*H_SCALE.
        const projectedSY = sy + (z * H_SCALE);

        const coord = screenToIso(sx, projectedSY, camX, camY);

        // Check if this coordinate exists in chunk and matches height
        if (coord.x >= 0 && coord.x < chunk.size && coord.y >= 0 && coord.y < chunk.size) {
            const idx = chunk.getIndex(coord.x, coord.y);
            const actualH = chunk.heightMap[idx];

            // If the calculated tile actually has this Z (or close to it)
            // We use a tolerance because steps are discrete
            if (Math.abs(actualH - z) < 1) { // Strict match
                 // Found a tile!
                 // But multiple Z levels could align. We want the "closest" to camera?
                 // In iso, highest Z is drawn last (on top). So we want the highest Z match.
                 return coord;
            }
        }
    }

    // Fallback to base plane if no high tile found
    return screenToIso(sx, sy, camX, camY);
}
