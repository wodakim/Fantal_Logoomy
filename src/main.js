import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './core/Renderer.js';
import { InputSystem } from './core/InputSystem.js';
import { MapGenerator } from './world/MapGenerator.js';
import { FluidEngine } from './world/FluidEngine.js';
import { TurnManager } from './logic/TurnManager.js';
import { CombatOverlay } from './ui/CombatOverlay.js';
import { UnitInfo } from './ui/UnitInfo.js';
import { VictoryOverlay } from './ui/VictoryOverlay.js';
import { EntityManager } from './entities/EntityManager.js';
import { COMPONENT_STATS } from './entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from './entities/components/Transform.js';
import { COMPONENT_SPRITE, SPRITE_CACHE } from './entities/components/Sprite.js';
import { SpriteGenerator } from './assets/SpriteGenerator.js';
import { ActionSystem } from './logic/ActionSystem.js';
import { CombatResolver } from './logic/CombatResolver.js';
import { SkillSystem } from './logic/SkillSystem.js';
import { Pathfinding } from './logic/Pathfinding.js';
import { SaveSystem } from './core/SaveSystem.js';
import { isoToScreen } from './math/Isometric.js';

console.log("Initializing VERMILION...");

const renderer = new Renderer('game-canvas');
const saveSystem = new SaveSystem();

// Global Game State Container
const GAME = {
    chunk: null,
    em: null,
    heroId: 0,
    lootCollected: []
};

// --- Systems Initialization ---
const mapGen = new MapGenerator();
const spriteGen = new SpriteGenerator();
const victoryUI = new VictoryOverlay();
const input = new InputSystem(renderer);
let fluidEngine, turnManager, ui, unitInfo, combatResolver, actionSystem, skillSystem, pathfinder, aiSystem, loop;

// --- Load Assets ---
Promise.all([
    spriteGen.generateSprite(123, { color: '#3498db' }),
    spriteGen.generateSprite(666, { color: '#e74c3c' })
]).then(([heroBmp, enemyBmp]) => {
    SPRITE_CACHE[0] = heroBmp;
    SPRITE_CACHE[1] = enemyBmp;
    initGame();
});

function initGame() {
    // 1. Generate World
    GAME.chunk = mapGen.generate(Math.random() * 1000);
    fluidEngine = new FluidEngine(GAME.chunk);
    input.currentChunk = GAME.chunk;

    // 2. Entities
    GAME.em = new EntityManager();
    GAME.lootCollected = [];

    // Hero
    const savedData = saveSystem.load();
    GAME.heroId = GAME.em.createEntity();

    // Restore or Init Stats
    if (savedData && savedData.hero) {
        COMPONENT_STATS.hp[GAME.heroId] = savedData.hero.hp;
        COMPONENT_STATS.maxHp[GAME.heroId] = savedData.hero.maxHp;
        COMPONENT_STATS.speed[GAME.heroId] = savedData.hero.speed;
        console.log("Loaded Hero Stats", savedData.hero);
    } else {
        COMPONENT_STATS.maxHp[GAME.heroId] = 100;
        COMPONENT_STATS.hp[GAME.heroId] = 100;
        COMPONENT_STATS.speed[GAME.heroId] = 12;
    }

    COMPONENT_TRANSFORM.x[GAME.heroId] = 8;
    COMPONENT_TRANSFORM.y[GAME.heroId] = 8;
    COMPONENT_TRANSFORM.z[GAME.heroId] = GAME.chunk.heightMap[GAME.chunk.getIndex(8,8)];
    COMPONENT_SPRITE.active[GAME.heroId] = 1;
    COMPONENT_SPRITE.spriteId[GAME.heroId] = 0;

    // Enemy
    const enemyId = GAME.em.createEntity();
    COMPONENT_STATS.maxHp[enemyId] = 50;
    COMPONENT_STATS.hp[enemyId] = 50;
    COMPONENT_STATS.speed[enemyId] = 8;
    COMPONENT_TRANSFORM.x[enemyId] = 10;
    COMPONENT_TRANSFORM.y[enemyId] = 10;
    COMPONENT_TRANSFORM.z[enemyId] = GAME.chunk.heightMap[GAME.chunk.getIndex(10,10)];
    COMPONENT_SPRITE.active[enemyId] = 1;
    COMPONENT_SPRITE.spriteId[enemyId] = 1;

    // 3. Logic Systems
    turnManager = new TurnManager(GAME.em, GAME.chunk);
    ui = new CombatOverlay(turnManager);
    unitInfo = new UnitInfo();
    combatResolver = new CombatResolver(GAME.chunk, turnManager);
    actionSystem = new ActionSystem(GAME.chunk, GAME.em, combatResolver);
    skillSystem = new SkillSystem(actionSystem);
    skillSystem.loadDefinitions();
    ui.skillSystem = skillSystem;
    pathfinder = new Pathfinding(GAME.chunk);

    // AI Logic
    aiSystem = {
        executeTurn: (unitId) => {
            if (turnManager.paused) return; // Don't act if game ended

            console.log(`AI (Unit ${unitId}) Thinking...`);
            const targetId = GAME.heroId;
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
                const h = GAME.chunk.heightMap[GAME.chunk.getIndex(tx, ty)];
                const scr = isoToScreen(tx, ty, h, renderer.camX, renderer.camY);
                ui.showFloatingText(scr.x, scr.y, `-${dmg}`, '#ff0000');
            }

            setTimeout(() => turnManager.endTurn(unitId), 1000);
        }
    };

    // Wiring
    turnManager.onTurnStart = (unitId) => {
        if (unitId === GAME.heroId) ui.showActionMenu(unitId);
        else aiSystem.executeTurn(unitId);
    };

    turnManager.onBattleEnd = (result) => {
        console.log("Battle End:", result);
        // Save if Victory
        if (result === "VICTORY") {
            saveSystem.save(COMPONENT_STATS, GAME.lootCollected);
        } else {
            saveSystem.clear(); // Roguelite death
        }
        victoryUI.show(result, GAME.lootCollected);
    };

    victoryUI.onNextBattle = () => {
        // Simple Reset
        location.reload(); // Cleanest way to reset strict state for Alpha
    };

    setupInput();

    // Start Loop
    loop = new GameLoop(
        (dt) => {
            fluidEngine.update(dt);
            turnManager.tick();
        },
        (dt) => {
            renderer.clear();
            renderer.render(GAME.chunk, GAME.em, dt);
            if (highlightedTiles.length > 0) {
                const color = (gameState === 'ATTACK_SELECTION') ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 100, 255, 0.4)';
                renderer.drawHighlight(GAME.chunk, highlightedTiles, color);
            }
            if (cursor) {
                renderer.drawHighlight(GAME.chunk, [cursor], 'rgba(255, 255, 0, 0.6)');
            }
        }
    );
    loop.start();
}

let gameState = 'IDLE';
let highlightedTiles = [];
let cursor = null;
let activeSkill = null;

function setupInput() {
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

        let clickedUnit = -1;
        for(let id=0; id<GAME.em.activeMap.length; id++) {
            if(GAME.em.activeMap[id] && COMPONENT_TRANSFORM.x[id] === pos.x && COMPONENT_TRANSFORM.y[id] === pos.y) {
                clickedUnit = id;
                break;
            }
        }

        if (clickedUnit !== -1) {
            unitInfo.show(clickedUnit, COMPONENT_STATS, (clickedUnit===0)?"Hero":"Monster");
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
                    const h = GAME.chunk.heightMap[GAME.chunk.getIndex(pos.x, pos.y)];
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
}
