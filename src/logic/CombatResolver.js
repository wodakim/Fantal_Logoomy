import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { COMPONENT_SPRITE } from '../entities/components/Sprite.js';
import { PROP_CORPSE, STATUS_DEAD } from '../core/Constants.js';
import { StatsCalculator, LIMB_LEGS, LIMB_RIGHT_ARM, LIMB_LEFT_ARM, LIMB_HEAD } from './StatsCalculator.js';

export class CombatResolver {
    constructor(chunk, turnManager, inventorySystem) {
        this.chunk = chunk;
        this.tm = turnManager;
        this.inventory = inventorySystem; // Store reference
        this.calculator = new StatsCalculator();
    }

    calculateDamage(attackerId, targetId, weaponPower = 10) {
        // Retrieve weapon power from inventory if available and if attacker is the Hero (Unit 0 usually)
        // For Alpha, only Hero has inventory.
        if (attackerId === 0 && this.inventory) {
            const wp = this.inventory.getWeaponPower();
            if (wp > 0) weaponPower = wp;
        }

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
        // Assume simplified XP model for Alpha (stored in Speed or temp var)
        // Since we don't have a dedicated exp array in COMPONENT_STATS yet (unless I missed it being added),
        // we will mock the "read" and just log it.
        // If exp array exists, we use it.
        let currentExp = COMPONENT_STATS.exp ? COMPONENT_STATS.exp[unitId] : 0;
        const result = this.calculator.gainExperience(currentExp, amount);

        if (COMPONENT_STATS.exp) COMPONENT_STATS.exp[unitId] = result.exp;

        console.log(`Unit ${unitId} gains ${amount} XP (Total: ${result.exp})`);

        if (result.levelUp) {
            console.log(`Unit ${unitId} LEVELED UP!`);
            // Apply Growth
            // For now, assume Level 1 -> 2. In real game, store Level component.
            // Mock Level:
            let level = 1;
            const newStats = this.calculator.calculateStatsForLevel(level + 1, 'FLESH_CARVER');

            COMPONENT_STATS.maxHp[unitId] = newStats.maxHp;
            COMPONENT_STATS.hp[unitId] = newStats.maxHp; // Full heal on level up?
            COMPONENT_STATS.speed[unitId] = newStats.speed;
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
