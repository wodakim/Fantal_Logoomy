import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { COMPONENT_SPRITE } from '../entities/components/Sprite.js';
import { PROP_CORPSE, STATUS_DEAD } from '../core/Constants.js';
import { StatsCalculator, LIMB_LEGS, LIMB_RIGHT_ARM, LIMB_LEFT_ARM, LIMB_HEAD } from './StatsCalculator.js';

export class CombatResolver {
    constructor(chunk, turnManager) {
        this.chunk = chunk;
        this.tm = turnManager;
        this.calculator = new StatsCalculator();
    }

    calculateDamage(attackerId, targetId, weaponPower = 10) {
        // Use StatsCalculator (3.2)
        const attackerStats = {
            pa: COMPONENT_STATS.speed[attackerId], // Using Speed as PA proxy for Alpha
            adr: 100, // Default ADR (Max)
            limbs: COMPONENT_STATS.limbs[attackerId] || 0
        };

        const damage = this.calculator.calculatePhysicalDamage(attackerStats, {}, weaponPower);
        return damage;
    }

    applyDamage(targetId, amount) {
        const maxHP = COMPONENT_STATS.maxHp[targetId];
        const currentLimbs = COMPONENT_STATS.limbs[targetId] || 0;

        // 3.3. Check Limb Loss
        const lostLimb = this.calculator.checkLimbLoss(amount, maxHP, currentLimbs);
        if (lostLimb > 0) {
            console.log(`Unit ${targetId} lost a limb! (${lostLimb})`);
            COMPONENT_STATS.limbs[targetId] = currentLimbs | lostLimb;

            // Immediate Gameplay Effects
            if (lostLimb & LIMB_LEGS) {
                // Reduce Speed drastically
                COMPONENT_STATS.speed[targetId] = Math.max(1, Math.floor(COMPONENT_STATS.speed[targetId] / 2));
                // TODO: Reduce Move Range in ActionSystem (needs Component flag check)
            }
            if (lostLimb & LIMB_HEAD) {
                // Blindness / Accuracy penalty (TODO)
            }
        }

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
