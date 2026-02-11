import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './core/Renderer.js';
import { InputSystem } from './core/InputSystem.js';
import { MapGenerator } from './world/MapGenerator.js';
import { FluidEngine } from './world/FluidEngine.js';
import { Pathfinding } from './logic/Pathfinding.js';
import { TurnManager } from './logic/TurnManager.js';
import { CombatOverlay } from './ui/CombatOverlay.js';
import { EntityManager } from './entities/EntityManager.js';
import { COMPONENT_STATS } from './entities/components/Stats.js';
import { isoToScreen } from './math/Isometric.js';

console.log("Initializing VERMILION...");

const renderer = new Renderer('game-canvas');

// Generate Map
const mapGen = new MapGenerator();
const chunk = mapGen.generate(Math.random() * 1000);
const fluidEngine = new FluidEngine(chunk);

// Entities
const em = new EntityManager();
// Create a dummy unit
const heroId = em.createEntity();
COMPONENT_STATS.speed[heroId] = 10;
COMPONENT_STATS.hp[heroId] = 100;
// Create an enemy
const enemyId = em.createEntity();
COMPONENT_STATS.speed[enemyId] = 8;
COMPONENT_STATS.hp[enemyId] = 50;

// Systems
const input = new InputSystem(renderer);
const pathfinder = new Pathfinding(chunk);
const turnManager = new TurnManager(em);
const ui = new CombatOverlay(turnManager);

let currentPath = [];

input.onPan = (dx, dy) => {
    renderer.camX += dx;
    renderer.camY += dy;
};

input.onTap = (pos) => {
    // If turn active, handle selection?
    // For now, keep pathfinding test but splash blood too
    const path = pathfinder.findPath(8, 8, pos.x, pos.y, 2);
    currentPath = path;
    fluidEngine.spawnFluid(pos.x, pos.y, 8);
};

const loop = new GameLoop(
    (dt) => {
        fluidEngine.update(dt);

        // Update Turn System
        turnManager.tick();
    },
    (dt) => {
        renderer.clear();
        renderer.drawChunk(chunk);

        // Draw Path highlight
        if (currentPath.length > 0) {
             const ctx = renderer.ctx;
             ctx.strokeStyle = 'gold';
             ctx.beginPath();
             currentPath.forEach((p, i) => {
                 const idx = chunk.getIndex(p.x, p.y);
                 const h = chunk.heightMap[idx];
                 const scr = isoToScreen(p.x, p.y, h, renderer.camX, renderer.camY);
                 if (i===0) ctx.moveTo(scr.x, scr.y + 16);
                 else ctx.lineTo(scr.x, scr.y + 16);
             });
             ctx.stroke();
        }
    }
);

loop.start();
