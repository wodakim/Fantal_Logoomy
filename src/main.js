import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './core/Renderer.js';
import { InputSystem } from './core/InputSystem.js';
import { Chunk } from './world/Chunk.js';
import { FluidEngine } from './world/FluidEngine.js';
import { Pathfinding } from './logic/Pathfinding.js';
import { isoToScreen } from './math/Isometric.js';

console.log("Initializing VERMILION...");

const renderer = new Renderer('game-canvas');
const chunk = new Chunk(16);
chunk.randomize();
const fluidEngine = new FluidEngine(chunk);
fluidEngine.spawnFluid(7, 7, 10);

const input = new InputSystem(renderer);
const pathfinder = new Pathfinding(chunk);

let currentPath = [];

input.onPan = (dx, dy) => {
    renderer.camX += dx;
    renderer.camY += dy;
};

input.onTap = (pos) => {
    // Test Pathfinding: Path from (0,0) to Tapped
    console.log("Pathfinding to:", pos);
    const path = pathfinder.findPath(0, 0, pos.x, pos.y, 2);
    console.log("Path found:", path);
    currentPath = path;
};

const loop = new GameLoop(
    (dt) => {
        fluidEngine.update(dt);
        // Input system updates based on events, no tick needed unless continuous
    },
    (dt) => {
        renderer.clear();
        renderer.drawChunk(chunk);

        // Visualize Path
        if (currentPath.length > 0) {
            const ctx = renderer.ctx;
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < currentPath.length; i++) {
                const p = currentPath[i];
                // Get height from chunk map for accurate rendering
                const idx = chunk.getIndex(p.x, p.y);
                const h = chunk.heightMap[idx];

                const scr = isoToScreen(p.x, p.y, h, renderer.camX, renderer.camY);
                // Center on top face (tile center offset)
                // Assuming TILE_W=64, TILE_H=32. Center is +32, +16?
                // Actually isoToScreen returns top-left corner of the diamond?
                // Let's assume it returns top point or center. Based on implementation:
                // x: (x - y) * (TILE_W / 2) + camX
                // This is standard. The 'center' of the tile top face is effectively at (scr.x, scr.y + TILE_H/2) if we consider the diamond shape.

                if (i === 0) ctx.moveTo(scr.x, scr.y + 16);
                else ctx.lineTo(scr.x, scr.y + 16);
            }
            ctx.stroke();

            // Draw highlight on last tile
            const last = currentPath[currentPath.length - 1];
            const idx = chunk.getIndex(last.x, last.y);
            const h = chunk.heightMap[idx];
            const scr = isoToScreen(last.x, last.y, h, renderer.camX, renderer.camY);

            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.beginPath();
            ctx.moveTo(scr.x, scr.y);
            ctx.lineTo(scr.x + 32, scr.y + 16);
            ctx.lineTo(scr.x, scr.y + 32);
            ctx.lineTo(scr.x - 32, scr.y + 16);
            ctx.fill();
        }
    }
);

loop.start();
