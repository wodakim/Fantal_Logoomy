import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';

export class TurnManager {
    constructor(entityManager) {
        this.em = entityManager;
        this.activeUnit = null;
        this.paused = false;

        // Callbacks
        this.onTurnStart = null;
    }

    tick() {
        if (this.activeUnit !== null) return; // Wait for current turn to end

        const stats = COMPONENT_STATS;
        const status = COMPONENT_STATUS;
        const maxUnits = this.em.activeMap.length; // 256

        // Increment CT for all active units
        let readyUnits = [];

        for (let id = 0; id < maxUnits; id++) {
            if (this.em.activeMap[id] === 0) continue; // Inactive
            if ((status.flags[id] & 1) !== 0) continue; // Dead (Bit 0)
            // TODO: Check Stun/Stop status

            let spd = stats.speed[id];
            // Safety clamp
            if (spd < 1) spd = 1;

            stats.ct[id] += spd;

            if (stats.ct[id] >= 100) {
                readyUnits.push(id);
            }
        }

        if (readyUnits.length > 0) {
            // Priority: Highest CT, then Speed as tie breaker
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
        if (this.onTurnStart) this.onTurnStart(unitId);
    }

    endTurn(unitId, actionCost = 0) {
        if (this.activeUnit !== unitId) return;

        // Reset CT
        // In FFT, Moving consumes 20 CT, Acting consumes 30 CT, etc.
        // If Wait (No Move, No Act), CT becomes 60?
        // Let's use simplified: Reset to 0 for now, or sub 100.
        // TDD says: "L'unité agit quand CT >= 100".
        // Usually CT resets to 0 or keeps overflow. Let's reset to 0.

        COMPONENT_STATS.ct[unitId] = 0; // Simple reset
        this.activeUnit = null;
    }
}
