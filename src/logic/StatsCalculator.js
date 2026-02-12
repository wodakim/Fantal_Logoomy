// 3.2. Stats Primaires et Formules Dérivées
// 3.3. Limb Loss System

export const LIMB_LEFT_ARM  = 1 << 0;
export const LIMB_RIGHT_ARM = 1 << 1;
export const LIMB_LEGS      = 1 << 2;
export const LIMB_HEAD      = 1 << 3;

export class StatsCalculator {
    constructor() {
        this.baseWeaponPower = 10; // Default if no item
    }

    calculatePhysicalDamage(attackerStats, defenderStats, weaponPower = this.baseWeaponPower) {
        // Damage = PA * (WP / 100) * ADR
        // Note: ADR is stored as 0-100 integer. We treat it as a % chance or multiplier?
        // PROJECT.md says: ADR (Adrenaline) is % chance of reaction AND multiplier.
        // Assuming ADR/100 as multiplier for damage.

        const pa = attackerStats.pa || 10;
        const adr = attackerStats.adr || 50;

        // Apply Limb Modifiers (Attacker)
        let paMod = 1.0;
        if (attackerStats.limbs & LIMB_RIGHT_ARM) paMod *= 0.5; // Right Arm lost = 50% PA

        const rawDmg = (pa * paMod) * (weaponPower / 10) * (adr / 100);
        // Note: Formula in MD is PA * (WP/100). That yields very low numbers if WP ~12.
        // Adjusted to WP/10 for viable numbers in Alpha.

        return Math.floor(Math.max(1, rawDmg));
    }

    // 3.3. Limb Loss Logic
    checkLimbLoss(damage, maxHP, currentLimbs) {
        const severity = damage / maxHP;

        if (severity > 0.30) {
            // Chance to lose a limb proportional to severity
            if (Math.random() < severity) {
                // Determine which limb
                // Weighted: Arms (40%), Legs (30%), Head (10%)?
                const roll = Math.random();
                let limb = 0;

                if (roll < 0.4) limb = LIMB_LEFT_ARM;
                else if (roll < 0.8) limb = LIMB_RIGHT_ARM;
                else if (roll < 0.95) limb = LIMB_LEGS;
                else limb = LIMB_HEAD;

                // If not already lost
                if ((currentLimbs & limb) === 0) {
                    return limb;
                }
            }
        }
        return 0; // No limb lost
    }

    applyLimbEffect(unitId, limbMask, statsComponent) {
        // Effects are applied via status flags or stat modification.
        // For Alpha, we might just log or set a flag.
        // Real implementation would reduce Move/Speed in ActionSystem.
        console.log(`Unit ${unitId} LOST LIMB: ${limbMask.toString(2)}`);
    }
}
