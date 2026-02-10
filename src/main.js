import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './core/Renderer.js';
import { InputSystem } from './core/InputSystem.js';
import { Chunk } from './world/Chunk.js';
import { FluidEngine } from './world/FluidEngine.js';
import { Pathfinding } from './logic/Pathfinding.js';

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
    },
    (dt) => {
        renderer.clear();
        renderer.drawChunk(chunk);

        // Visualize Path
        renderer.ctx.fillStyle = 'yellow';
        for (let p of currentPath) {
             const scr = import('./math/Isometric.js').then(m => {
                 // Async import inside loop is bad, but for quick visual test:
                 // Actually renderer has isoToScreen, but it's internal logic mostly.
                 // Let's add a drawHighlight to renderer
             });
        }
    }
);

loop.start();
