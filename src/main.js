import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './core/Renderer.js';
import { InputSystem } from './core/InputSystem.js';
import { MapGenerator } from './world/MapGenerator.js';
import { FluidEngine } from './world/FluidEngine.js';
import { TurnManager } from './logic/TurnManager.js';
import { CombatOverlay } from './ui/CombatOverlay.js';
import { UnitInfo } from './ui/UnitInfo.js';
import { EntityManager } from './entities/EntityManager.js';
import { COMPONENT_STATS } from './entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from './entities/components/Transform.js';
import { COMPONENT_SPRITE, SPRITE_CACHE } from './entities/components/Sprite.js';
import { SpriteGenerator } from './assets/SpriteGenerator.js';
import { ActionSystem } from './logic/ActionSystem.js';
import { CombatResolver } from './logic/CombatResolver.js';
import { SkillSystem } from './logic/SkillSystem.js';
import { Pathfinding } from './logic/Pathfinding.js';
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
COMPONENT_STATS.maxHp[heroId] = 100;
COMPONENT_STATS.hp[heroId] = 100;
COMPONENT_STATS.speed[heroId] = 12;
COMPONENT_TRANSFORM.x[heroId] = 8;
COMPONENT_TRANSFORM.y[heroId] = 8;
COMPONENT_TRANSFORM.z[heroId] = chunk.heightMap[chunk.getIndex(8,8)];
COMPONENT_SPRITE.active[heroId] = 1;
COMPONENT_SPRITE.spriteId[heroId] = 0;

const enemyId = em.createEntity();
COMPONENT_STATS.maxHp[enemyId] = 50;
COMPONENT_STATS.hp[enemyId] = 50;
COMPONENT_STATS.speed[enemyId] = 8;
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
input.currentChunk = chunk;

// Need correct instantiation order
const turnManager = new TurnManager(em, chunk); // Passed chunk for corpse props
const ui = new CombatOverlay(turnManager);
const unitInfo = new UnitInfo();
const combatResolver = new CombatResolver(chunk, turnManager); // Passed TM for registering corpses
const actionSystem = new ActionSystem(chunk, em, combatResolver);
const skillSystem = new SkillSystem(actionSystem);
skillSystem.loadDefinitions();
ui.skillSystem = skillSystem;

const pathfinder = new Pathfinding(chunk);

// AI Stub
const aiSystem = {
    executeTurn: (unitId) => {
        console.log(`AI (Unit ${unitId}) Thinking...`);
        const targetId = 0;
        const tx = COMPONENT_TRANSFORM.x[targetId];
        const ty = COMPONENT_TRANSFORM.y[targetId];
        const ux = COMPONENT_TRANSFORM.x[unitId];
        const uy = COMPONENT_TRANSFORM.y[unitId];

        const path = pathfinder.findPath(ux, uy, tx, ty, 2);

        if (path && path.length > 1) {
            const dest = path[path.length - 2];
            actionSystem.moveUnit(unitId, dest.x, dest.y);
        }

        const dmg = actionSystem.performAttack(unitId, targetId);
        if (dmg) {
            const h = chunk.heightMap[chunk.getIndex(tx, ty)];
            const scr = isoToScreen(tx, ty, h, renderer.camX, renderer.camY);
            ui.showFloatingText(scr.x, scr.y, `-${dmg}`, '#ff0000');
        }

        setTimeout(() => turnManager.endTurn(unitId), 1000);
    }
};

turnManager.onTurnStart = (unitId) => {
    if (unitId === 0) ui.showActionMenu(unitId);
    else aiSystem.executeTurn(unitId);
};

// State Machine
let gameState = 'IDLE';
let highlightedTiles = [];
let cursor = null;
let activeSkill = null;

ui.onMoveClicked = (unitId) => {
    gameState = 'MOVE_SELECTION';
    highlightedTiles = actionSystem.getMovementRange(unitId);
    cursor = null;
};

ui.onAttackClicked = (unitId) => {
    gameState = 'ATTACK_SELECTION';
    highlightedTiles = actionSystem.getAttackRange(unitId, 1);
    cursor = null;
    activeSkill = null;
};

ui.onSkillClicked = (unitId, skill) => {
    gameState = 'ATTACK_SELECTION';
    highlightedTiles = actionSystem.getAttackRange(unitId, skill.range);
    cursor = null;
    activeSkill = skill;
};

ui.onWaitClicked = (unitId) => {
    ui.menu.remove();
    ui.menu = null;
    turnManager.endTurn(unitId);
};

input.onPan = (dx, dy) => {
    renderer.targetCamX += dx;
    renderer.targetCamY += dy;
};

input.onTap = (pos) => {
    const activeUnit = turnManager.activeUnit;
    const isValid = highlightedTiles.some(t => t.x === pos.x && t.y === pos.y);

    // Show Info on Tap
    let clickedUnit = -1;
    for(let id=0; id<em.activeMap.length; id++) {
        if(em.activeMap[id] && COMPONENT_TRANSFORM.x[id] === pos.x && COMPONENT_TRANSFORM.y[id] === pos.y) {
            clickedUnit = id;
            break;
        }
    }
    // Don't show info for dead units? (Sprite active check is handled in renderer, here we check activeMap)
    // We should check if Dead bit is set?

    if (clickedUnit !== -1) {
        unitInfo.show(clickedUnit, COMPONENT_STATS, (clickedUnit===0)?"Hero":"Monster");
    } else {
        // Hide info logic?
    }

    if (gameState === 'MOVE_SELECTION') {
        if (!isValid) { cursor = null; return; }
        if (!cursor || cursor.x !== pos.x || cursor.y !== pos.y) {
            cursor = { x: pos.x, y: pos.y };
        } else {
            actionSystem.moveUnit(activeUnit, pos.x, pos.y);
            gameState = 'IDLE';
            highlightedTiles = [];
            cursor = null;
            ui.showActionMenu(activeUnit);
        }
    }
    else if (gameState === 'ATTACK_SELECTION') {
        if (!isValid) { cursor = null; return; }
        if (!cursor || cursor.x !== pos.x || cursor.y !== pos.y) {
            cursor = { x: pos.x, y: pos.y };
        } else {
            let targetId = clickedUnit;
            if (activeSkill && activeSkill.heal && targetId === -1 && pos.x === COMPONENT_TRANSFORM.x[activeUnit] && pos.y === COMPONENT_TRANSFORM.y[activeUnit]) {
                targetId = activeUnit;
            }

            if (targetId !== -1) {
                let txt = "";
                let color = "#ff0000";

                if (activeSkill) {
                    txt = skillSystem.executeSkill(activeUnit, targetId, activeSkill);
                    if (activeSkill.heal) color = "#00ff00";
                } else {
                    const dmg = actionSystem.performAttack(activeUnit, targetId);
                    txt = `-${dmg}`;
                }

                const h = chunk.heightMap[chunk.getIndex(pos.x, pos.y)];
                const scr = isoToScreen(pos.x, pos.y, h, renderer.camX, renderer.camY);
                ui.showFloatingText(scr.x, scr.y, txt, color);

                gameState = 'IDLE';
                highlightedTiles = [];
                cursor = null;
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
        renderer.render(chunk, em, dt);
        if (highlightedTiles.length > 0) {
            const color = (gameState === 'ATTACK_SELECTION') ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 100, 255, 0.4)';
            renderer.drawHighlight(chunk, highlightedTiles, color);
        }
        if (cursor) {
            renderer.drawHighlight(chunk, [cursor], 'rgba(255, 255, 0, 0.6)');
        }
    }
);

loop.start();
