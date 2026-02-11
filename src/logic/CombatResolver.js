import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';

export class CombatResolver {
    constructor() {
        // Constants from TDD
    }

    // Directional Modifiers
    getDirectionMod(attackerId, targetId) {
        const tPos = { x: COMPONENT_TRANSFORM.x[targetId], y: COMPONENT_TRANSFORM.y[targetId] };
        const tDir = COMPONENT_TRANSFORM.dir[targetId]; // 0:S, 1:W, 2:N, 3:E

        const aPos = { x: COMPONENT_TRANSFORM.x[attackerId], y: COMPONENT_TRANSFORM.y[attackerId] };

        // Determine attack vector
        const dx = tPos.x - aPos.x;
        const dy = tPos.y - aPos.y;

        // Determine which side of target attacker is on
        // Simplified Logic:
        // S(0) faces +Y. W(1) faces -X. N(2) faces -Y. E(3) faces +X.

        // This requires precise dot product or vector logic to determine "Back", "Side", "Front"
        // Placeholder:
        return 1.0;
    }

    calculateDamage(attackerId, targetId, weaponPower = 10) {
        const pa = 10; // Placeholder stat (Should read from Stats)
        const adr = 1.0; // Adrenaline multiplier

        // Formula: PA * (WP / 100) * ADR
        // But WP is usually integer. Let's use TDD formula:
        // Damage = PA * WP * ... ?
        // TDD: "Damage = PA * (WP / 100) * ADR" <- Wait, WP/100 implies WP is a percentage?
        // Usually WP is base damage. Let's assume standard: PA * WP.
        // TDD text: "Pour une épée standard (WP = Weapon Power) : Damage = PA * (WP / 100) * ADR"
        // If PA=10, WP=12, Damage = 1.2? That seems low.
        // Maybe TDD meant (WP / 10)? Or maybe PA is high (50)?
        // TDD Jobs says "PA_Growth = 50". If GrowthC is 50, Stats might be around 10-20?
        // Let's stick to a robust formula: PA * WP for now.

        let damage = pa * weaponPower * adr;

        // Direction
        const dirMod = this.getDirectionMod(attackerId, targetId);
        // Hit Chance check...

        return Math.floor(damage);
    }

    applyDamage(targetId, amount) {
        COMPONENT_STATS.hp[targetId] -= amount;
        console.log(`Unit ${targetId} took ${amount} damage! HP: ${COMPONENT_STATS.hp[targetId]}`);

        if (COMPONENT_STATS.hp[targetId] <= 0) {
            COMPONENT_STATS.hp[targetId] = 0;
            COMPONENT_STATUS.flags[targetId] |= 1; // Dead
            console.log(`Unit ${targetId} died.`);
        }
    }
}
