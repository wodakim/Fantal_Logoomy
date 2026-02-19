import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { PROP_LOOT_BAG, STATUS_DEAD, PROP_CORPSE } from '../core/Constants.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';

export class TurnManager {
    constructor(entityManager, chunk) {
        this.em = entityManager;
        this.chunk = chunk;
        this.activeUnit = null;
        this.paused = false;
        this.onTurnStart = null;
        this.onBattleEnd = null; // Callback for Victory/Defeat

        this.corpses = [];

        // Turn State (AP Logic)
        this.turnState = {
            moved: false,
            acted: false
        };
    }

    registerCorpse(x, y, timer) {
        this.corpses.push({ x, y, timer, processed: false });
    }

    tick() {
        if (this.activeUnit !== null || this.paused) return;

        // Check Win Condition
        const result = this.checkWinCondition();
        if (result) {
            this.paused = true;
            if (this.onBattleEnd) this.onBattleEnd(result);
            return;
        }

        const stats = COMPONENT_STATS;
        const status = COMPONENT_STATUS;
        const maxUnits = this.em.activeMap.length;

        let readyUnits = [];

        for (let id = 0; id < maxUnits; id++) {
            if (this.em.activeMap[id] === 0) continue;
            if ((status.flags[id] & STATUS_DEAD) !== 0) continue;

            let spd = stats.speed[id];
            if (spd < 1) spd = 1;

            stats.ct[id] += spd;

            if (stats.ct[id] >= 100) {
                readyUnits.push(id);
            }
        }

        if (readyUnits.length > 0) {
            readyUnits.sort((a, b) => {
                const ctDiff = stats.ct[b] - stats.ct[a];
                if (ctDiff !== 0) return ctDiff;
                return stats.speed[b] - stats.speed[a];
            });

            this.startTurn(readyUnits[0]);
        }
    }

    checkWinCondition() {
        // Hero is ID 0
        // Enemies are ID > 0
        const status = COMPONENT_STATUS;
        const maxUnits = this.em.activeMap.length;

        let heroAlive = false;
        let enemiesAlive = 0;

        // Check Hero (ID 0)
        if (this.em.activeMap[0] === 1 && (status.flags[0] & STATUS_DEAD) === 0) {
            heroAlive = true;
        }

        // Check Enemies
        for (let id = 1; id < maxUnits; id++) {
            if (this.em.activeMap[id] === 1 && (status.flags[id] & STATUS_DEAD) === 0) {
                enemiesAlive++;
            }
        }

        if (!heroAlive) return "DEFEAT";
        if (enemiesAlive === 0) return "VICTORY";

        return null; // Battle continues
    }

    startTurn(unitId) {
        this.activeUnit = unitId;

        // Reset Turn State
        this.turnState.moved = false;
        this.turnState.acted = false;

        this.corpses.forEach(c => {
            if (c.processed) return;
            if (c.timer > 0) c.timer--;
            if (c.timer === 0) {
                c.processed = true;
                this.transformCorpseToLoot(c.x, c.y);
            }
        });

        if (this.onTurnStart) this.onTurnStart(unitId);
    }

    transformCorpseToLoot(x, y) {
        const idx = this.chunk.getIndex(x, y);
        // Only if still a corpse (e.g. not devoured)
        if (this.chunk.objIndex[idx] === PROP_CORPSE) {
            this.chunk.objIndex[idx] = PROP_LOOT_BAG;
        }
    }

    endTurn(unitId) {
        if (this.activeUnit !== unitId) return;

        // Calculate CT usage? For now full reset.
        COMPONENT_STATS.ct[unitId] = 0;

        this.activeUnit = null;
        // Turn state is reset in startTurn next time
    }

    // Actions
    canMove() {
        return !this.turnState.moved;
    }

    canAct() {
        return !this.turnState.acted;
    }

    recordMove() {
        this.turnState.moved = true;
    }

    recordAction() {
        this.turnState.acted = true;
    }

    getTurnPreview(maxUnits = 5, maxTicks = 50) {
        const stats = COMPONENT_STATS;
        const status = COMPONENT_STATUS;
        const preview = [];
        const ctBuffer = new Uint16Array(stats.ct.length);
        ctBuffer.set(stats.ct);

        for (let tick = 0; tick < maxTicks && preview.length < maxUnits; tick++) {
            let bestId = -1;
            let bestCt = -1;
            let bestSpeed = -1;

            for (let id = 0; id < this.em.activeMap.length; id++) {
                if (this.em.activeMap[id] === 0) continue;
                if ((status.flags[id] & STATUS_DEAD) !== 0) continue;

                const speed = Math.max(1, stats.speed[id]);
                ctBuffer[id] += speed;

                if (ctBuffer[id] >= 100) {
                    if (ctBuffer[id] > bestCt || (ctBuffer[id] === bestCt && speed > bestSpeed)) {
                        bestId = id;
                        bestCt = ctBuffer[id];
                        bestSpeed = speed;
                    }
                }
            }

            if (bestId !== -1) {
                preview.push(bestId);
                ctBuffer[bestId] = 0;
            }
        }

        return preview;
    }

    // Helper for UI
    checkForNearbyCorpse(unitId) {
        const x = COMPONENT_TRANSFORM.x[unitId];
        const y = COMPONENT_TRANSFORM.y[unitId];

        // Check Self
        const idx = this.chunk.getIndex(x, y);
        if (this.chunk.objIndex[idx] === PROP_CORPSE) return true;

        // Check Neighbors
        const neighbors = [{x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0}];
        for (let n of neighbors) {
            const nx = x + n.x;
            const ny = y + n.y;
            if (nx>=0 && nx<this.chunk.size && ny>=0 && ny<this.chunk.size) {
                const ni = this.chunk.getIndex(nx, ny);
                if (this.chunk.objIndex[ni] === PROP_CORPSE) return true;
            }
        }
        return false;
    }
}
