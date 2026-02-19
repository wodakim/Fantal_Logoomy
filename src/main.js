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
import { COMPONENT_STATUS } from './entities/components/Status.js';
import { COMPONENT_SPRITE, SPRITE_CACHE } from './entities/components/Sprite.js';
import { SpriteGenerator } from './assets/SpriteGenerator.js';
import { ActionSystem } from './logic/ActionSystem.js';
import { CombatResolver } from './logic/CombatResolver.js';
import { SkillSystem } from './logic/SkillSystem.js';
import { Pathfinding } from './logic/Pathfinding.js';
import { SaveSystem } from './core/SaveSystem.js';
import { isoToScreen } from './math/Isometric.js';
import { InventorySystem } from './logic/InventorySystem.js';
import { MainMenu } from './ui/MainMenu.js';
import { HubOverlay } from './ui/HubOverlay.js';
import { DebugWindow } from './ui/DebugWindow.js';
import { ITEMS } from './data/Items.js';
import { IdleSystem } from './logic/IdleSystem.js';
import { IdleOverlay } from './ui/IdleOverlay.js';

console.log('Initializing VERMILION...');

const renderer = new Renderer('game-canvas');
const saveSystem = new SaveSystem();
const inventorySystem = new InventorySystem();
const mapGen = new MapGenerator();
const spriteGen = new SpriteGenerator();
const victoryUI = new VictoryOverlay();
const input = new InputSystem(renderer);

const GAME = {
    mode: 'MENU', // MENU | HUB | BATTLE
    chunk: null,
    em: null,
    heroId: 0,
    lootCollected: [],
    hubPoints: [],
    debugGold: 0,
    debugResources: 0
};

let fluidEngine, turnManager, ui, unitInfo, combatResolver, actionSystem, skillSystem, pathfinder, aiSystem, loop;
let mainMenu, hubOverlay, debugWindow, idleOverlay;
let selectedHeroColor = '#3498db';
const idleSystem = new IdleSystem();

let gameState = 'IDLE';
let highlightedTiles = [];
let cursor = null;
let activeSkill = null;

async function preloadSprites(heroColor = selectedHeroColor) {
    const [heroBmp, enemyBmp, npcA, npcB, npcC, npcD] = await Promise.all([
        spriteGen.generateSprite(123, { color: heroColor }),
        spriteGen.generateSprite(666, { color: '#e74c3c' }),
        spriteGen.generateSprite(10, { color: '#f1c40f' }),
        spriteGen.generateSprite(11, { color: '#2ecc71' }),
        spriteGen.generateSprite(12, { color: '#9b59b6' }),
        spriteGen.generateSprite(13, { color: '#ecf0f1' })
    ]);
    SPRITE_CACHE[0] = heroBmp;
    SPRITE_CACHE[1] = enemyBmp;
    SPRITE_CACHE[2] = npcA;
    SPRITE_CACHE[3] = npcB;
    SPRITE_CACHE[4] = npcC;
    SPRITE_CACHE[5] = npcD;
}

function stopLoop() {
    if (loop && loop.stop) loop.stop();
}

function showToast(text, color = '#ffffff') {
    const div = document.createElement('div');
    div.className = 'hub-toast';
    div.textContent = text;
    div.style.color = color;
    document.getElementById('ui-layer').appendChild(div);
    setTimeout(() => div.remove(), 1500);
}

function ensureDebugWindow() {
    if (debugWindow) {
        debugWindow.show();
        return;
    }

    debugWindow = new DebugWindow();
    debugWindow.onCommand = (cmd) => {
        if (cmd === 'kill') {
            let killed = 0;
            if (combatResolver && GAME.mode === 'BATTLE') {
                for (let id = 1; id < GAME.em.activeMap.length; id++) {
                    if (!GAME.em.activeMap[id]) continue;
                    if (COMPONENT_STATS.hp[id] <= 0) continue;
                    combatResolver.applyDamage(id, 9999, GAME.heroId);
                    killed++;
                }
            }
            showToast(`Debug: ${killed} monsters supprimés`, '#f39c12');
        }

        if (cmd === 'suicide') {
            if (combatResolver && GAME.mode === 'BATTLE') {
                combatResolver.applyDamage(GAME.heroId, 9999, -1);
            } else {
                COMPONENT_STATS.hp[GAME.heroId] = 0;
            }
            showToast('Debug: Hero KO', '#e74c3c');
        }

        if (cmd === 'money') {
            GAME.debugGold = 999999;
            showToast('Debug: Argent infini', '#f1c40f');
        }

        if (cmd === 'resources') {
            GAME.debugResources = 9999;
            [901, 902, 903].forEach((id) => {
                for (let i = 0; i < 20; i++) inventorySystem.addItem(id);
            });
            showToast('Debug: Ressources max', '#2ecc71');
        }

        if (cmd === 'inventory') {
            Object.keys(ITEMS).forEach((id) => inventorySystem.addItem(Number(id)));
            inventorySystem.equipItem(104);
            showToast('Debug: Inventaire complet', '#9b59b6');
        }

        if (cmd === 'idleboost') {
            idleSystem.boostAll(500);
            idleSystem.save();
            showToast('Debug: Boost idle +500', '#1abc9c');
        }
    };
}

function resetCombatUi() {
    gameState = 'IDLE';
    highlightedTiles = [];
    cursor = null;
    activeSkill = null;
}

function isEnemyUnit(attackerId, targetId) {
    return (attackerId === 0 && targetId > 0) || (attackerId > 0 && targetId === 0);
}

function clearEntities() {
    COMPONENT_STATUS.flags.fill(0);
    COMPONENT_STATS.hp.fill(0);
    COMPONENT_STATS.maxHp.fill(0);
    COMPONENT_STATS.ct.fill(0);
    COMPONENT_STATS.speed.fill(0);
    COMPONENT_STATS.limbs.fill(0);
    COMPONENT_SPRITE.active.fill(0);
    GAME.em = new EntityManager();
}

function placeUnit(id, x, y, spriteId) {
    COMPONENT_TRANSFORM.x[id] = x;
    COMPONENT_TRANSFORM.y[id] = y;
    COMPONENT_TRANSFORM.z[id] = GAME.chunk.heightMap[GAME.chunk.getIndex(x, y)];
    COMPONENT_TRANSFORM.dir[id] = 2;
    COMPONENT_SPRITE.active[id] = 1;
    COMPONENT_SPRITE.spriteId[id] = spriteId;
}

function bootMenu() {
    mainMenu = new MainMenu(saveSystem, spriteGen);

    mainMenu.onSkinSelected = async (color) => {
        selectedHeroColor = color;
        await preloadSprites(color);
    };

    mainMenu.onPlay = async (color) => {
        selectedHeroColor = color;
        await preloadSprites(color);
        mainMenu.hide();
        initHub();
    };

    mainMenu.onLoad = async (color) => {
        selectedHeroColor = color;
        await preloadSprites(color);
        mainMenu.hide();
        initHub();
    };
}

function initHub() {
    GAME.mode = 'HUB';
    stopLoop();
    resetCombatUi();

    const mapData = mapGen.generate(Math.random() * 1000);
    GAME.chunk = mapData.chunk;
    GAME.lootCollected = [];

    fluidEngine = new FluidEngine(GAME.chunk);
    input.currentChunk = GAME.chunk;
    clearEntities();

    const pSpawn = mapData.spawns.player[0] || { x: 8, y: 8 };
    const savedData = saveSystem.load();

    GAME.heroId = GAME.em.createEntity();
    if (savedData) inventorySystem.loadState(savedData);
    if (inventorySystem.inventory.length === 0 && !inventorySystem.equipment.mainHand) {
        inventorySystem.addItem(101);
        inventorySystem.equipItem(101);
    }

    COMPONENT_STATS.maxHp[GAME.heroId] = savedData?.hero?.maxHp || 100;
    COMPONENT_STATS.hp[GAME.heroId] = savedData?.hero?.hp || 100;
    COMPONENT_STATS.speed[GAME.heroId] = savedData?.hero?.speed || 12;
    placeUnit(GAME.heroId, pSpawn.x, pSpawn.y, 0);

    pathfinder = new Pathfinding(GAME.chunk);

    GAME.hubPoints = [
        { id: 'quest', x: pSpawn.x + 1, y: pSpawn.y, name: 'Donneur de quêtes', spriteId: 2, text: 'Des monstres rôdent derrière la grande porte.' },
        { id: 'craft', x: pSpawn.x - 1, y: pSpawn.y, name: 'Forgeron/Craft', spriteId: 3, text: 'Ramène des matériaux et je forge ton avenir.' },
        { id: 'alchemist', x: pSpawn.x, y: pSpawn.y + 1, name: 'Alchimiste', spriteId: 4, text: 'Je transforme le sang et les organes en pouvoir.' },
        { id: 'recruit', x: pSpawn.x, y: pSpawn.y - 1, name: 'Recruteur', spriteId: 5, text: 'Bientôt: recruter d\'autres héros pour l\'escouade.' },
        { id: 'idle', x: pSpawn.x - 2, y: pSpawn.y + 1, name: 'Camp de Récolte', spriteId: 3, text: 'Zone non-combat: métiers passifs et ressources de craft.' },
        { id: 'gate', x: pSpawn.x + 2, y: pSpawn.y + 2, name: 'Grande Porte', spriteId: 2, text: 'Prêt à partir en mission tactique ?' }
    ];

    GAME.hubPoints.forEach((p) => {
        if (p.x < 0 || p.y < 0 || p.x >= GAME.chunk.size || p.y >= GAME.chunk.size) return;
        const id = GAME.em.createEntity();
        placeUnit(id, p.x, p.y, p.spriteId);
        COMPONENT_STATS.maxHp[id] = 999;
        COMPONENT_STATS.hp[id] = 999;
    });

    if (!hubOverlay) {
        hubOverlay = new HubOverlay();
        hubOverlay.onAction = (action) => {
            if (action === 'gate') {
                hubOverlay.hide();
                initGame();
                return;
            }
            if (action === 'craft') showToast('Craft: système avancé à connecter.', '#2ecc71');
            if (action === 'alchemist') showToast('Alchimie: potions bientôt disponibles.', '#9b59b6');
            if (action === 'recruit') showToast('Recrutement: feature équipe en cours.', '#3498db');
            if (action === 'quest') showToast('Quête: éliminer les monstres à la porte.', '#f1c40f');
            if (action === 'idle' && idleOverlay) idleOverlay.show();
            hubOverlay.hide();
        };
    }
    hubOverlay.hide();

    if (!idleOverlay) {
        idleOverlay = new IdleOverlay(idleSystem);
        idleOverlay.onClose = () => idleSystem.save();
    }

    idleSystem.applyOfflineProgress();
    ensureDebugWindow();
    setupHubInput();

    loop = new GameLoop(
        (dt) => {
            fluidEngine.update(dt);
            idleSystem.tick(dt);
            if ((Math.random() < 0.02) && GAME.mode === 'HUB') idleSystem.save();
        },
        (dt) => {
            renderer.clear();
            renderer.render(GAME.chunk, GAME.em, dt);
        }
    );
    loop.start();

    showToast('Hub chargé: explore les PNJ puis utilise la Grande Porte.', '#c5a059');
}

function setupHubInput() {
    input.onPan = (dx, dy) => {
        renderer.targetCamX += dx;
        renderer.targetCamY += dy;
    };

    input.onTap = (pos) => {
        const hx = COMPONENT_TRANSFORM.x[GAME.heroId];
        const hy = COMPONENT_TRANSFORM.y[GAME.heroId];

        const point = GAME.hubPoints.find((p) => p.x === pos.x && p.y === pos.y);
        const dist = Math.abs(hx - pos.x) + Math.abs(hy - pos.y);

        if (point && dist <= 1) {
            const actions = point.id === 'gate'
                ? [{ id: 'gate', label: 'PARTIR À L\'AVENTURE' }, { id: 'cancel', label: 'PLUS TARD' }]
                : [{ id: point.id, label: 'INTERAGIR' }, { id: 'cancel', label: 'FERMER' }];

            hubOverlay.show(point.name, point.text, actions);
            return;
        }

        hubOverlay.hide();
        const path = pathfinder.findPath(hx, hy, pos.x, pos.y, 2);
        if (path && path.length > 1) {
            const step = path[1];
            placeUnit(GAME.heroId, step.x, step.y, 0);
        }
    };
}

function initGame() {
    GAME.mode = 'BATTLE';
    stopLoop();
    resetCombatUi();
    if (hubOverlay) hubOverlay.hide();
    if (idleOverlay) idleOverlay.hide();

    const mapData = mapGen.generate(Math.random() * 1000);
    GAME.chunk = mapData.chunk;
    const spawns = mapData.spawns;

    fluidEngine = new FluidEngine(GAME.chunk);
    input.currentChunk = GAME.chunk;
    clearEntities();
    GAME.lootCollected = [];

    const pSpawn = spawns.player[0] || { x: 8, y: 8, z: 0 };
    const savedData = saveSystem.load();

    GAME.heroId = GAME.em.createEntity();
    if (savedData) inventorySystem.loadState(savedData);
    if (inventorySystem.inventory.length === 0 && !inventorySystem.equipment.mainHand) {
        inventorySystem.addItem(101);
        inventorySystem.equipItem(101);
    }

    COMPONENT_STATS.maxHp[GAME.heroId] = savedData?.hero?.maxHp || 100;
    COMPONENT_STATS.hp[GAME.heroId] = savedData?.hero?.hp || 100;
    COMPONENT_STATS.speed[GAME.heroId] = savedData?.hero?.speed || 12;
    placeUnit(GAME.heroId, pSpawn.x, pSpawn.y, 0);

    const enemyCount = Math.min(3, spawns.enemy.length);
    for (let i = 0; i < enemyCount; i++) {
        const eSpawn = spawns.enemy[i];
        const enemyId = GAME.em.createEntity();
        COMPONENT_STATS.maxHp[enemyId] = 50;
        COMPONENT_STATS.hp[enemyId] = 50;
        COMPONENT_STATS.speed[enemyId] = 8;
        placeUnit(enemyId, eSpawn.x, eSpawn.y, 1);
        COMPONENT_TRANSFORM.dir[enemyId] = 0;
    }

    turnManager = new TurnManager(GAME.em, GAME.chunk);
    ui = new CombatOverlay(turnManager);
    unitInfo = new UnitInfo();
    combatResolver = new CombatResolver(GAME.chunk, turnManager, inventorySystem);
    actionSystem = new ActionSystem(GAME.chunk, GAME.em, combatResolver, inventorySystem);
    skillSystem = new SkillSystem(actionSystem);
    skillSystem.loadDefinitions();
    ui.skillSystem = skillSystem;
    pathfinder = new Pathfinding(GAME.chunk);

    aiSystem = {
        executeTurn: (unitId) => {
            if (turnManager.paused) return;
            const targetId = GAME.heroId;
            const tx = COMPONENT_TRANSFORM.x[targetId];
            const ty = COMPONENT_TRANSFORM.y[targetId];
            const ux = COMPONENT_TRANSFORM.x[unitId];
            const uy = COMPONENT_TRANSFORM.y[unitId];

            let moved = false;
            let attacked = false;

            const path = pathfinder.findPath(ux, uy, tx, ty, 2);
            if (path && path.length > 1) {
                const nextStep = path[1];
                if (nextStep && (nextStep.x !== tx || nextStep.y !== ty)) {
                    const moveResult = actionSystem.moveUnit(unitId, nextStep.x, nextStep.y);
                    if (moveResult.reactionDamage > 0) {
                        const h = GAME.chunk.heightMap[GAME.chunk.getIndex(nextStep.x, nextStep.y)];
                        const scr = isoToScreen(nextStep.x, nextStep.y, h, renderer.camX, renderer.camY);
                        ui.showFloatingText(scr.x, scr.y, `Counter -${moveResult.reactionDamage}`, '#e67e22');
                    }
                    moved = true;
                }
            }

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

            if (!moved && !attacked) console.log(`AI (Unit ${unitId}) waiting...`);
            setTimeout(() => turnManager.endTurn(unitId), 1000);
        }
    };

    turnManager.onTurnStart = (unitId) => {
        ui.renderTurnPreview(unitId);
        if (unitId === GAME.heroId) ui.showActionMenu(unitId);
        else aiSystem.executeTurn(unitId);
    };

    turnManager.onBattleEnd = (result) => {
        idleSystem.save();
        if (result === 'VICTORY') saveSystem.save(COMPONENT_STATS, GAME.lootCollected);
        else saveSystem.clear();
        victoryUI.show(result, GAME.lootCollected);
    };

    victoryUI.onNextBattle = () => {
        initHub();
    };

    setupBattleInput();
    ensureDebugWindow();

    loop = new GameLoop(
        (dt) => {
            fluidEngine.update(dt);
            turnManager.tick();
        },
        (dt) => {
            renderer.clear();
            renderer.render(GAME.chunk, GAME.em, dt);
            if (highlightedTiles.length > 0) {
                const color = (gameState === 'ATTACK_SELECTION') ? 'rgba(255,0,0,0.4)' : 'rgba(0,100,255,0.4)';
                renderer.drawHighlight(GAME.chunk, highlightedTiles, color);
            }
            if (cursor) renderer.drawHighlight(GAME.chunk, [cursor], 'rgba(255,255,0,0.6)');
        }
    );
    loop.start();
}

function setupBattleInput() {
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
        if (ui.menu) ui.menu.remove();
        ui.menu = null;
        turnManager.endTurn(unitId);
    };

    ui.onDevourClicked = (unitId) => {
        const result = actionSystem.performDevour(unitId);
        if (result) {
            const x = COMPONENT_TRANSFORM.x[unitId];
            const y = COMPONENT_TRANSFORM.y[unitId];
            const h = GAME.chunk.heightMap[GAME.chunk.getIndex(x, y)];
            const scr = isoToScreen(x, y, h, renderer.camX, renderer.camY);
            ui.showFloatingText(scr.x, scr.y, `+${result.healed} ${result.item}`, '#2ecc71');
        }
        turnManager.recordAction();
        turnManager.endTurn(unitId);
    };

    input.onPan = (dx, dy) => {
        renderer.targetCamX += dx;
        renderer.targetCamY += dy;
    };

    input.onTap = (pos) => {
        const activeUnit = turnManager.activeUnit;
        const isValid = highlightedTiles.some((t) => t.x === pos.x && t.y === pos.y);

        let clickedUnit = -1;
        for (let id = 0; id < GAME.em.activeMap.length; id++) {
            if (GAME.em.activeMap[id] && COMPONENT_TRANSFORM.x[id] === pos.x && COMPONENT_TRANSFORM.y[id] === pos.y) {
                clickedUnit = id;
                break;
            }
        }

        if (clickedUnit !== -1) unitInfo.show(clickedUnit, COMPONENT_STATS, (clickedUnit === 0) ? 'Hero' : 'Monster');

        if (gameState === 'MOVE_SELECTION') {
            if (!isValid) {
                cursor = null;
                gameState = 'IDLE';
                highlightedTiles = [];
                ui.showActionMenu(activeUnit);
                return;
            }

            if (!cursor || cursor.x !== pos.x || cursor.y !== pos.y) cursor = { x: pos.x, y: pos.y };
            else {
                const moveResult = actionSystem.moveUnit(activeUnit, pos.x, pos.y);
                const h = GAME.chunk.heightMap[GAME.chunk.getIndex(pos.x, pos.y)];
                const scr = isoToScreen(pos.x, pos.y, h, renderer.camX, renderer.camY);

                if (moveResult.loot) ui.showFloatingText(scr.x, scr.y, `Found: ${moveResult.loot}`, '#f1c40f');
                if (moveResult.reactionDamage > 0) ui.showFloatingText(scr.x, scr.y, `Counter -${moveResult.reactionDamage}`, '#e67e22');

                turnManager.recordMove();
                gameState = 'IDLE';
                highlightedTiles = [];
                cursor = null;
                if (turnManager.canAct()) ui.showActionMenu(activeUnit);
                else turnManager.endTurn(activeUnit);
            }
        } else if (gameState === 'ATTACK_SELECTION') {
            if (!isValid) {
                cursor = null;
                gameState = 'IDLE';
                highlightedTiles = [];
                ui.showActionMenu(activeUnit);
                return;
            }

            if (!cursor || cursor.x !== pos.x || cursor.y !== pos.y) cursor = { x: pos.x, y: pos.y };
            else {
                let targetId = clickedUnit;
                if (activeSkill && activeSkill.heal && targetId === -1 && pos.x === COMPONENT_TRANSFORM.x[activeUnit] && pos.y === COMPONENT_TRANSFORM.y[activeUnit]) targetId = activeUnit;

                if (targetId !== -1) {
                    let txt = '';
                    let color = '#ff0000';
                    let actionResolved = false;

                    if (activeSkill) {
                        if (activeSkill.heal || isEnemyUnit(activeUnit, targetId)) {
                            txt = skillSystem.executeSkill(activeUnit, targetId, activeSkill);
                            if (activeSkill.heal) color = '#00ff00';
                            actionResolved = true;
                        }
                    } else if (isEnemyUnit(activeUnit, targetId)) {
                        const dmg = actionSystem.performAttack(activeUnit, targetId);
                        txt = `-${dmg}`;
                        actionResolved = true;
                    }

                    if (!actionResolved) {
                        ui.showFloatingText(renderer.canvas.width * 0.5, renderer.canvas.height * 0.25, 'Invalid Target', '#e67e22');
                        return;
                    }

                    const h = GAME.chunk.heightMap[GAME.chunk.getIndex(pos.x, pos.y)];
                    const scr = isoToScreen(pos.x, pos.y, h, renderer.camX, renderer.camY);
                    ui.showFloatingText(scr.x, scr.y, txt, color);

                    turnManager.recordAction();
                    gameState = 'IDLE';
                    highlightedTiles = [];
                    cursor = null;
                    turnManager.endTurn(activeUnit);
                }
            }
        }
    };
}

window.addEventListener('beforeunload', () => idleSystem.save());
bootMenu();
