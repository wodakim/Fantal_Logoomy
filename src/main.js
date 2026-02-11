import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './core/Renderer.js';
import { InputSystem } from './core/InputSystem.js';
import { MapGenerator } from './world/MapGenerator.js';
import { FluidEngine } from './world/FluidEngine.js';
import { TurnManager } from './logic/TurnManager.js';
import { CombatOverlay } from './ui/CombatOverlay.js';
import { EntityManager } from './entities/EntityManager.js';
import { COMPONENT_STATS } from './entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from './entities/components/Transform.js';
import { COMPONENT_SPRITE, SPRITE_CACHE } from './entities/components/Sprite.js';
import { SpriteGenerator } from './assets/SpriteGenerator.js';
import { ActionSystem } from './logic/ActionSystem.js';

console.log("Initializing VERMILION...");

const renderer = new Renderer('game-canvas');

// Generate Map
const mapGen = new MapGenerator();
const chunk = mapGen.generate(Math.random() * 1000);
const fluidEngine = new FluidEngine(chunk);

// Entities
const em = new EntityManager();

// Create Hero
const heroId = em.createEntity();
COMPONENT_STATS.speed[heroId] = 12;
COMPONENT_STATS.hp[heroId] = 100;
COMPONENT_TRANSFORM.x[heroId] = 8;
COMPONENT_TRANSFORM.y[heroId] = 8;
COMPONENT_TRANSFORM.z[heroId] = chunk.heightMap[chunk.getIndex(8,8)];
COMPONENT_SPRITE.active[heroId] = 1;
COMPONENT_SPRITE.spriteId[heroId] = 0; // Hero Sprite

// Create Enemy
const enemyId = em.createEntity();
COMPONENT_STATS.speed[enemyId] = 8;
COMPONENT_STATS.hp[enemyId] = 50;
COMPONENT_TRANSFORM.x[enemyId] = 10;
COMPONENT_TRANSFORM.y[enemyId] = 10;
COMPONENT_TRANSFORM.z[enemyId] = chunk.heightMap[chunk.getIndex(10,10)];
COMPONENT_SPRITE.active[enemyId] = 1;
COMPONENT_SPRITE.spriteId[enemyId] = 1; // Enemy Sprite

// Generate Assets
const spriteGen = new SpriteGenerator();
spriteGen.generateSprite(123, { color: '#3498db' }).then(bmp => SPRITE_CACHE[0] = bmp); // Blue Hero
spriteGen.generateSprite(666, { color: '#e74c3c' }).then(bmp => SPRITE_CACHE[1] = bmp); // Red Enemy

// Systems
const input = new InputSystem(renderer);
const turnManager = new TurnManager(em);
const ui = new CombatOverlay(turnManager);
const actionSystem = new ActionSystem(chunk, em);

// State Machine for UI
let gameState = 'IDLE'; // IDLE, MOVE_SELECTION, ACT_SELECTION
let highlightedTiles = [];

// Override UI Move Click
ui.onMoveClicked = (unitId) => {
    console.log("Entering Move Selection Mode");
    gameState = 'MOVE_SELECTION';
    highlightedTiles = actionSystem.getMovementRange(unitId);
};

input.onPan = (dx, dy) => {
    renderer.camX += dx;
    renderer.camY += dy;
};

input.onTap = (pos) => {
    if (gameState === 'MOVE_SELECTION') {
        // Check if tapped tile is valid
        const isValid = highlightedTiles.some(t => t.x === pos.x && t.y === pos.y);

        if (isValid) {
            actionSystem.moveUnit(turnManager.activeUnit, pos.x, pos.y);
            gameState = 'IDLE';
            highlightedTiles = [];
            // Re-open menu? Or auto-open Act?
            // For now, re-open menu
            ui.showActionMenu(turnManager.activeUnit);
        } else {
            console.log("Invalid Move Target");
            // Optional: Cancel move?
        }
    }
};

const loop = new GameLoop(
    (dt) => {
        fluidEngine.update(dt);
        turnManager.tick();
    },
    (dt) => {
        renderer.clear();

        // Pass EntityManager to Render for Entities
        renderer.render(chunk, em);

        // Draw Highlights
        if (highlightedTiles.length > 0) {
            renderer.drawHighlight(chunk, highlightedTiles, 'rgba(0, 100, 255, 0.4)');
        }
    }
);

loop.start();
