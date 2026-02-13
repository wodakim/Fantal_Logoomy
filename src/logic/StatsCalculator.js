// 3.2. Stats Primaires et Formules Dérivées
// 3.3. Limb Loss System
// 3.5. Level Up Logic

export const LIMB_LEFT_ARM  = 1 << 0;
export const LIMB_RIGHT_ARM = 1 << 1;
export const LIMB_LEGS      = 1 << 2;
export const LIMB_HEAD      = 1 << 3;

export class StatsCalculator {
    constructor() {
        this.baseWeaponPower = 10;

        // Growth Constants (Lower is better) - PROJECT.md 3.5
        this.GROWTH = {
            FLESH_CARVER: { HP: 10, PA: 45, SPD: 100 },
            BULWARK: { HP: 6, PA: 40, SPD: 120 }
        };
    }

    calculatePhysicalDamage(attackerStats, defenderStats, weaponPower = this.baseWeaponPower) {
        const pa = attackerStats.pa || 10;
        const adr = attackerStats.adr || 50;

        // Apply Limb Modifiers (Attacker)
        let paMod = 1.0;
        if (attackerStats.limbs & LIMB_RIGHT_ARM) paMod *= 0.5; // Right Arm lost = 50% PA

        const rawDmg = (pa * paMod) * (weaponPower / 10) * (adr / 100);
        return Math.floor(Math.max(1, rawDmg));
    }

    checkLimbLoss(damage, maxHP, currentLimbs) {
        const severity = damage / maxHP;
        if (severity > 0.30) {
            if (Math.random() < severity) {
                const roll = Math.random();
                let limb = 0;
                if (roll < 0.4) limb = LIMB_LEFT_ARM;
                else if (roll < 0.8) limb = LIMB_RIGHT_ARM;
                else if (roll < 0.95) limb = LIMB_LEGS;
                else limb = LIMB_HEAD;

                if ((currentLimbs & limb) === 0) return limb;
            }
        }
        return 0;
    }

    // 3.5 Experience & Growth
    gainExperience(currentExp, amount) {
        let newExp = currentExp + amount;
        let leveledUp = false;

        // Simple 100 XP per level for Alpha
        if (newExp >= 100) {
            newExp -= 100;
            leveledUp = true;
        }
        return { exp: newExp, levelUp: leveledUp };
    }

    // Calculate stats for a specific level based on Job Growth
    calculateStatsForLevel(level, jobKey = 'FLESH_CARVER') {
        const G = this.GROWTH[jobKey] || this.GROWTH.FLESH_CARVER;

        // Formula: Stat = Base * (Level / GrowthC * Multiplier)
        // Tuning for Alpha:
        // HP = Level * (100 / HP_C) * 5
        // PA = Level * (100 / PA_C) * 2

        return {
            maxHp: Math.floor(level * (100 / G.HP) * 5),
            pa: Math.floor(level * (100 / G.PA) * 2),
            speed: Math.floor(10 + level * (100 / G.SPD))
        };
    }
}
