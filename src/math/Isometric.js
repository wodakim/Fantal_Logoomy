import { TILE_W, TILE_H, H_SCALE } from '../core/Constants.js';

export function isoToScreen(x, y, z, camX, camY) {
    return {
        x: (x - y) * (TILE_W / 2) + camX,
        y: (x + y) * (TILE_H / 2) - (z * H_SCALE) + camY
    };
}

// Improved precise picking with diamond intersection
export function pickTile(sx, sy, camX, camY, chunk) {
    // We iterate from the camera perspective (Front to Back? Top to Bottom?)
    // Actually, we want the "Front-most" tile that contains the point.
    // In Painter's algo, we draw Back to Front.
    // So for picking, we should check Front to Back (Reverse draw order) to find the first hit.
    // Draw order was: Y 0->Size, X 0->Size.
    // So Reverse order: Y Size-1 -> 0, X Size-1 -> 0.

    // However, height complicates this. A high tile at Y=0 might Occlude a low tile at Y=1.
    // So we must check ALL tiles and find the one with the highest "Sort Depth" that contains the point?
    // Or just iterate Z levels?

    // Robust approach: Point-in-Rhombus check for every visible tile surface.
    // Optimization: Only check tiles within screen bounds.

    let bestCandidate = null;
    let minDistToCenter = Infinity; // To break ties, center of tile is best

    // We iterate broadly around the estimated flat position
    // Flat estimate:
    const flatIso = screenToIsoFlat(sx, sy, camX, camY);
    const searchRadius = 8; // Check 8 tiles around estimate to account for height

    const startX = Math.max(0, flatIso.x - searchRadius);
    const endX = Math.min(chunk.size, flatIso.x + searchRadius);
    const startY = Math.max(0, flatIso.y - searchRadius);
    const endY = Math.min(chunk.size, flatIso.y + searchRadius);

    // We want the tile that is "visually on top".
    // Visually on top = Drawn last.
    // Drawn last = Highest (X + Y) + Z factor?
    // Let's iterate in Draw Order (Back to Front) and keep updating "hit".
    // The last hit is the one on top.

    for (let y = 0; y < chunk.size; y++) {
        for (let x = 0; x < chunk.size; x++) {
            // Optimization: Skip if far from mouse
            // (Optional)

            const i = chunk.getIndex(x, y);
            const h = chunk.heightMap[i];

            // Get Screen Box for Top Face
            const scr = isoToScreen(x, y, h, camX, camY);

            // Check if point (sx, sy) is inside the diamond at scr
            if (pointInDiamond(sx, sy, scr.x, scr.y, TILE_W, TILE_H)) {
                bestCandidate = { x: x, y: y };
            }

            // Check vertical wall (Front faces: South and East walls)
            // If this tile is high, it has a wall going down.
            // But usually we just click the top.
            // Let's stick to Top Face for now, it's usually enough if Z logic is correct.
            // If we want "Intelligent" clicking, we should check if we clicked the "Body" of the block.
            // Body extends from Top Face Y to Top Face Y + Height.
            // But we only see walls if neighbor is lower.
            // Let's implement Top Face hit only first, as it's standard FFT.
        }
    }

    if (bestCandidate) return bestCandidate;

    // Fallback
    return flatIso;
}

// Basic flat plane projection
function screenToIsoFlat(sx, sy, camX, camY) {
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
    // cx, cy is Top Corner of diamond in my engine?
    // Let's verify isoToScreen logic.
    // x: (x - y) * (W / 2) + camX
    // If x=0, y=0 -> camX.
    // If x=1, y=0 -> camX + W/2.
    // If x=0, y=1 -> camX - W/2.
    // If x=1, y=1 -> camX.
    // So (0,0) is Top. (1,1) is Bottom.
    // The center of the diamond is actually cx, cy + h/2.

    const dx = Math.abs(px - cx);
    const dy = Math.abs(py - (cy + h/2)); // Center Y relative

    // Diamond formula: |dx|/W + |dy|/H <= 0.5 ?
    // Half Width = w/2. Half Height = h/2.
    // |dx|/(w/2) + |dy|/(h/2) <= 1

    return (dx / (w/2) + dy / (h/2)) <= 1;
}
