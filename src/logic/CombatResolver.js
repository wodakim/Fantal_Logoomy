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

    applyDamage(targetId, amount, attackerId = -1) {
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
            }
        }

        COMPONENT_STATS.hp[targetId] -= amount;

        // XP Gain on Hit
        if (attackerId !== -1 && COMPONENT_STATS.hp[targetId] > 0) {
            this.awardExperience(attackerId, 10);
        }

        if (COMPONENT_STATS.hp[targetId] <= 0) {
            COMPONENT_STATS.hp[targetId] = 0;
            if (attackerId !== -1) {
                this.awardExperience(attackerId, 40); // Kill Bonus
            }
            this.killUnit(targetId);
        }
    }

    awardExperience(unitId, amount) {
        // Mock current EXP since not in component yet
        // In real impl, read from COMPONENT_STATS.exp[unitId]
        // For Alpha visualization:
        console.log(`Unit ${unitId} gains ${amount} XP`);

        // Check Level Up (Mock)
        // const result = this.calculator.gainExperience(currentExp, amount);
        // if (result.levelUp) ...
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
