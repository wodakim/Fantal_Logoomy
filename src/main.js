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
import { CombatResolver } from './logic/CombatResolver.js';
import { isoToScreen } from './math/Isometric.js';

console.log("Initializing VERMILION...");

const renderer = new Renderer('game-canvas');

// Generate Map
const mapGen = new MapGenerator();
const chunk = mapGen.generate(Math.random() * 1000);
const fluidEngine = new FluidEngine(chunk);

// Entities
const em = new EntityManager();
const heroId = em.createEntity();
COMPONENT_STATS.speed[heroId] = 12;
COMPONENT_STATS.hp[heroId] = 100;
COMPONENT_TRANSFORM.x[heroId] = 8;
COMPONENT_TRANSFORM.y[heroId] = 8;
COMPONENT_TRANSFORM.z[heroId] = chunk.heightMap[chunk.getIndex(8,8)];
COMPONENT_SPRITE.active[heroId] = 1;
COMPONENT_SPRITE.spriteId[heroId] = 0;

const enemyId = em.createEntity();
COMPONENT_STATS.speed[enemyId] = 8;
COMPONENT_STATS.hp[enemyId] = 50;
COMPONENT_TRANSFORM.x[enemyId] = 10;
COMPONENT_TRANSFORM.y[enemyId] = 10;
COMPONENT_TRANSFORM.z[enemyId] = chunk.heightMap[chunk.getIndex(10,10)];
COMPONENT_SPRITE.active[enemyId] = 1;
COMPONENT_SPRITE.spriteId[enemyId] = 1;

// Assets
const spriteGen = new SpriteGenerator();
spriteGen.generateSprite(123, { color: '#3498db' }).then(bmp => SPRITE_CACHE[0] = bmp);
spriteGen.generateSprite(666, { color: '#e74c3c' }).then(bmp => SPRITE_CACHE[1] = bmp);

// Systems
const input = new InputSystem(renderer);
input.currentChunk = chunk; // Link chunk for height-aware picking

const turnManager = new TurnManager(em);
const ui = new CombatOverlay(turnManager);
const combatResolver = new CombatResolver();
const actionSystem = new ActionSystem(chunk, em, combatResolver);

const aiSystem = {
    executeTurn: (unitId) => {
        console.log(`AI (Unit ${unitId}) Thinking...`);
        const targetId = 0; // Hero
        const tx = COMPONENT_TRANSFORM.x[targetId];
        const ty = COMPONENT_TRANSFORM.y[targetId];

        let moveX = tx + 1;
        let moveY = ty;

        if (moveX < chunk.size) {
            actionSystem.moveUnit(unitId, moveX, moveY);
        }

        const dmg = actionSystem.performAttack(unitId, targetId);

        const h = chunk.heightMap[chunk.getIndex(tx, ty)];
        const scr = isoToScreen(tx, ty, h, renderer.camX, renderer.camY);
        ui.showFloatingText(scr.x, scr.y, `-${dmg}`, '#ff0000');

        setTimeout(() => turnManager.endTurn(unitId), 1000);
    }
};

turnManager.onTurnStart = (unitId) => {
    if (unitId === 0) ui.showActionMenu(unitId);
    else aiSystem.executeTurn(unitId);
};

let gameState = 'IDLE';
let highlightedTiles = [];

ui.onMoveClicked = (unitId) => {
    gameState = 'MOVE_SELECTION';
    highlightedTiles = actionSystem.getMovementRange(unitId);
};

ui.onAttackClicked = (unitId) => {
    gameState = 'ATTACK_SELECTION';
    highlightedTiles = actionSystem.getAttackRange(unitId, 1);
};

ui.onWaitClicked = (unitId) => {
    ui.menu.remove();
    ui.menu = null;
    turnManager.endTurn(unitId);
};

input.onPan = (dx, dy) => {
    renderer.camX += dx;
    renderer.camY += dy;
};

input.onTap = (pos) => {
    // Pos is now Height-Corrected thanks to pickTile
    const activeUnit = turnManager.activeUnit;

    console.log("Tap on Tile:", pos);

    if (gameState === 'MOVE_SELECTION') {
        const isValid = highlightedTiles.some(t => t.x === pos.x && t.y === pos.y);
        if (isValid) {
            actionSystem.moveUnit(activeUnit, pos.x, pos.y);
            gameState = 'IDLE';
            highlightedTiles = [];
            ui.showActionMenu(activeUnit);
        }
    }
    else if (gameState === 'ATTACK_SELECTION') {
        const isValid = highlightedTiles.some(t => t.x === pos.x && t.y === pos.y);
        if (isValid) {
            let targetId = -1;
            const maxUnits = em.activeMap.length;
            for(let id=0; id<maxUnits; id++) {
                if(em.activeMap[id] && COMPONENT_TRANSFORM.x[id] === pos.x && COMPONENT_TRANSFORM.y[id] === pos.y && id !== activeUnit) {
                    targetId = id;
                    break;
                }
            }

            if (targetId !== -1) {
                const dmg = actionSystem.performAttack(activeUnit, targetId);
                const h = chunk.heightMap[chunk.getIndex(pos.x, pos.y)];
                const scr = isoToScreen(pos.x, pos.y, h, renderer.camX, renderer.camY);
                ui.showFloatingText(scr.x, scr.y, `-${dmg}`, '#ff0000');

                gameState = 'IDLE';
                highlightedTiles = [];
                turnManager.endTurn(activeUnit);
            }
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
        renderer.render(chunk, em);

        if (highlightedTiles.length > 0) {
            const color = (gameState === 'ATTACK_SELECTION') ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 100, 255, 0.4)';
            renderer.drawHighlight(chunk, highlightedTiles, color);
        }
    }
);

loop.start();
