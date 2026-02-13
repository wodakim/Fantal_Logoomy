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
import { InventorySystem } from './logic/InventorySystem.js';

console.log("Initializing VERMILION...");

const renderer = new Renderer('game-canvas');
const saveSystem = new SaveSystem();
const inventorySystem = new InventorySystem();

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
    const mapData = mapGen.generate(Math.random() * 1000);
    GAME.chunk = mapData.chunk;
    const spawns = mapData.spawns;

    fluidEngine = new FluidEngine(GAME.chunk);
    input.currentChunk = GAME.chunk;

    // 2. Entities
    GAME.em = new EntityManager();
    GAME.lootCollected = [];

    // Hero (Spawn at first valid Player POI)
    const pSpawn = spawns.player[0] || {x:8, y:8, z:0};

    const savedData = saveSystem.load();
    GAME.heroId = GAME.em.createEntity();

    // Restore Inventory
    if (savedData) {
        inventorySystem.loadState(savedData);
    }
    // Debug: Give starting weapon if empty
    if (inventorySystem.inventory.length === 0 && !inventorySystem.equipment.mainHand) {
        inventorySystem.addItem(101); // Shiv
        inventorySystem.equipItem(101);
    }

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

    COMPONENT_TRANSFORM.x[GAME.heroId] = pSpawn.x;
    COMPONENT_TRANSFORM.y[GAME.heroId] = pSpawn.y;
    COMPONENT_TRANSFORM.z[GAME.heroId] = GAME.chunk.heightMap[GAME.chunk.getIndex(pSpawn.x, pSpawn.y)];
    COMPONENT_SPRITE.active[GAME.heroId] = 1;
    COMPONENT_SPRITE.spriteId[GAME.heroId] = 0;

    // Enemies (Spawn at Enemy POIs, max 3 for Alpha)
    const enemyCount = Math.min(3, spawns.enemy.length);
    for(let i=0; i<enemyCount; i++) {
        const eSpawn = spawns.enemy[i];
        const enemyId = GAME.em.createEntity();
        COMPONENT_STATS.maxHp[enemyId] = 50;
        COMPONENT_STATS.hp[enemyId] = 50;
        COMPONENT_STATS.speed[enemyId] = 8;
        COMPONENT_TRANSFORM.x[enemyId] = eSpawn.x;
        COMPONENT_TRANSFORM.y[enemyId] = eSpawn.y;
        COMPONENT_TRANSFORM.z[enemyId] = GAME.chunk.heightMap[GAME.chunk.getIndex(eSpawn.x, eSpawn.y)];
        COMPONENT_SPRITE.active[enemyId] = 1;
        COMPONENT_SPRITE.spriteId[enemyId] = 1;
    }

    // 3. Logic Systems
    turnManager = new TurnManager(GAME.em, GAME.chunk);
    ui = new CombatOverlay(turnManager);
    unitInfo = new UnitInfo();
    combatResolver = new CombatResolver(GAME.chunk, turnManager, inventorySystem);
    actionSystem = new ActionSystem(GAME.chunk, GAME.em, combatResolver, inventorySystem);
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

            let moved = false;
            let attacked = false;

            // 1. Move
            const path = pathfinder.findPath(ux, uy, tx, ty, 2);
            if (path && path.length > 1) {
                // Determine step (Naive: just 1 step for now or path[length-2] if close?)
                // Actually pathfinder returns full path. path[0] is start. path[length-1] is target.
                // We want to move towards target but within move range.
                // For Alpha, let's just take one step towards player if far, or adjacent if close.
                // Simplified: Just try to move to the tile before the target if valid

                // Let's find the furthest reachable tile on the path
                // For now, keep the original simple logic: move to adjacent of target if possible?
                // Or just move 1 step along path?
                const nextStep = path[1]; // First step after start
                if (nextStep && (nextStep.x !== tx || nextStep.y !== ty)) {
                     // Check if nextStep is valid move (ActionSystem does check but let's assume pathfinder is correct-ish)
                     // Actually ActionSystem.moveUnit doesn't check range, it just moves.
                     // We should trust pathfinder.
                     actionSystem.moveUnit(unitId, nextStep.x, nextStep.y);
                     moved = true;
                }
            }

            // 2. Attack
            // Check distance
            const dist = Math.abs(COMPONENT_TRANSFORM.x[unitId] - tx) + Math.abs(COMPONENT_TRANSFORM.y[unitId] - ty);
            if (dist <= 1) {
                const dmg = actionSystem.performAttack(unitId, targetId);
                if (dmg) {
                    const h = GAME.chunk.heightMap[GAME.chunk.getIndex(tx, ty)];
                    const scr = isoToScreen(tx, ty, h, renderer.camX, renderer.camY);
                    ui.showFloatingText(scr.x, scr.y, `-${dmg}`, '#ff0000');
                    attacked = true;
                }
            }

            if (!moved && !attacked) {
                console.log(`AI (Unit ${unitId}) waiting...`);
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
            if (!isValid) {
                // Cancel Move
                cursor = null;
                gameState = 'IDLE';
                highlightedTiles = [];
                ui.showActionMenu(activeUnit);
                return;
            }
            if (!cursor || cursor.x !== pos.x || cursor.y !== pos.y) {
                cursor = { x: pos.x, y: pos.y };
            } else {
                const lootedItem = actionSystem.moveUnit(activeUnit, pos.x, pos.y);

                // Show loot popup if applicable
                if (lootedItem) {
                    const h = GAME.chunk.heightMap[GAME.chunk.getIndex(pos.x, pos.y)];
                    const scr = isoToScreen(pos.x, pos.y, h, renderer.camX, renderer.camY);
                    ui.showFloatingText(scr.x, scr.y, `Found: ${lootedItem}`, '#f1c40f');
                }

                // Record Move in TurnManager (Action Points)
                turnManager.recordMove();

                gameState = 'IDLE';
                highlightedTiles = [];
                cursor = null;

                // Check if turn should end or show menu again
                if (turnManager.canAct()) {
                    ui.showActionMenu(activeUnit);
                } else {
                    turnManager.endTurn(activeUnit);
                }
            }
        }
        else if (gameState === 'ATTACK_SELECTION') {
            if (!isValid) {
                // Cancel Attack
                cursor = null;
                gameState = 'IDLE';
                highlightedTiles = [];
                ui.showActionMenu(activeUnit);
                return;
            }
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

                    // Record Action
                    turnManager.recordAction();

                    gameState = 'IDLE';
                    highlightedTiles = [];
                    cursor = null;

                    // End turn immediately after action (standard tactic logic)
                    turnManager.endTurn(activeUnit);
                }
            }
        }
    };
}
