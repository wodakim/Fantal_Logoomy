import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { PROP_LOOT_BAG, STATUS_DEAD } from '../core/Constants.js';

export class TurnManager {
    constructor(entityManager, chunk) {
        this.em = entityManager;
        this.chunk = chunk; // Need chunk to update props
        this.activeUnit = null;
        this.paused = false;
        this.onTurnStart = null;

        this.corpses = []; // {x, y, timer}
    }

    registerCorpse(x, y, timer) {
        this.corpses.push({ x, y, timer });
        console.log("Corpse registered at", x, y);
    }

    tick() {
        if (this.activeUnit !== null) return;

        const stats = COMPONENT_STATS;
        const status = COMPONENT_STATUS;
        const maxUnits = this.em.activeMap.length;

        let readyUnits = [];

        for (let id = 0; id < maxUnits; id++) {
            if (this.em.activeMap[id] === 0) continue;

            // Skip Dead Units
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

    startTurn(unitId) {
        this.activeUnit = unitId;
        console.log(`Unit ${unitId} Turn Start!`);

        // Tick Corpses
        // (Usually happens at Global Tick or Round start, but here per turn is fine for "Tick-based decay")
        // Actually FFT corpses decay on their own CT? Simplified: Decay every unit turn? Too fast.
        // Decay every "Round"? Hard to define in CT system.
        // Let's Decay every time CT accumulator loops?
        // Simplest: Decay when the Unit who died WOULD have had a turn?
        // Or just flat decay for now every time any turn starts (Fast decay).
        // Let's do: Decay 1 tick every turn. 3 turns = very fast.
        // Let's set timer to 10 turns.

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
        console.log("Corpse decayed to Loot at", x, y);
        const idx = this.chunk.getIndex(x, y);
        this.chunk.objIndex[idx] = PROP_LOOT_BAG;
    }

    endTurn(unitId) {
        if (this.activeUnit !== unitId) return;
        COMPONENT_STATS.ct[unitId] = 0;
        this.activeUnit = null;
    }
}
