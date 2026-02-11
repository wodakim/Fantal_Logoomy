import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { PROP_LOOT_BAG, STATUS_DEAD } from '../core/Constants.js';

export class TurnManager {
    constructor(entityManager, chunk) {
        this.em = entityManager;
        this.chunk = chunk;
        this.activeUnit = null;
        this.paused = false;
        this.onTurnStart = null;
        this.onBattleEnd = null; // Callback for Victory/Defeat

        this.corpses = [];
    }

    registerCorpse(x, y, timer) {
        this.corpses.push({ x, y, timer });
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

        this.corpses.forEach(c => {
            if (c.timer > 0) c.timer--;
            if (c.timer === 0 && !c.processed) {
                c.processed = true;
                this.transformCorpseToLoot(c.x, c.y);
            }
        });

        if (this.onTurnStart) this.onTurnStart(unitId);
    }

    transformCorpseToLoot(x, y) {
        const idx = this.chunk.getIndex(x, y);
        this.chunk.objIndex[idx] = PROP_LOOT_BAG;
    }

    endTurn(unitId) {
        if (this.activeUnit !== unitId) return;
        COMPONENT_STATS.ct[unitId] = 0;
        this.activeUnit = null;
    }
}
