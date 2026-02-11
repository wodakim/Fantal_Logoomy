import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { COMPONENT_SPRITE } from '../entities/components/Sprite.js';
import { PROP_CORPSE, STATUS_DEAD } from '../core/Constants.js';

export class CombatResolver {
    constructor(chunk, turnManager) {
        this.chunk = chunk;
        this.tm = turnManager; // Need ref to register corpses
    }

    getDirectionMod(attackerId, targetId) {
        return 1.0;
    }

    calculateDamage(attackerId, targetId, weaponPower = 10) {
        const pa = 10;
        const adr = 1.0;
        let damage = pa * weaponPower * adr * 0.1; // Reduced for gameplay balance
        return Math.max(1, Math.floor(damage));
    }

    applyDamage(targetId, amount) {
        COMPONENT_STATS.hp[targetId] -= amount;

        if (COMPONENT_STATS.hp[targetId] <= 0) {
            COMPONENT_STATS.hp[targetId] = 0;
            this.killUnit(targetId);
        }
    }

    killUnit(unitId) {
        if ((COMPONENT_STATUS.flags[unitId] & STATUS_DEAD) !== 0) return; // Already dead

        console.log(`Unit ${unitId} died.`);

        // 1. Set Status
        COMPONENT_STATUS.flags[unitId] |= STATUS_DEAD;

        // 2. Hide Unit Sprite (It will be replaced by Corpse Prop)
        COMPONENT_SPRITE.active[unitId] = 0;

        // 3. Spawn Corpse Prop at location
        const x = COMPONENT_TRANSFORM.x[unitId];
        const y = COMPONENT_TRANSFORM.y[unitId];
        const idx = this.chunk.getIndex(x, y);
        this.chunk.objIndex[idx] = PROP_CORPSE;

        // 4. Register Corpse Timer in TurnManager
        if (this.tm) {
            this.tm.registerCorpse(x, y, 3); // 3 turns before crystal/loot
        }
    }
}
