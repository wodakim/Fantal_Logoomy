import { ActionSystem } from './ActionSystem.js';
import { COMPONENT_STATS } from '../entities/components/Stats.js';

export class SkillSystem {
    constructor(actionSystem) {
        this.actionSystem = actionSystem;
        this.jobs = {};
    }

    async loadDefinitions() {
        // In a real buildless env, we fetch JSON.
        // For simplicity/mock, we might just require it or fetch relative
        try {
            const response = await fetch('src/assets/definitions/jobs.json');
            this.jobs = await response.json();
        } catch (e) {
            console.error("Failed to load jobs", e);
            // Fallback for Phase 14 if fetch fails locally without server
            this.jobs = {
                "FLESH_CARVER": {
                    "name": "Flesh-Carver",
                    "skills": [
                        { "id": "STONE_THROW", "name": "Stone Throw", "range": 3, "damage_mod": 0.5 },
                        { "id": "BANDAGE", "name": "Bandage", "range": 0, "heal": 30 }
                    ]
                }
            };
        }
    }

    getUnitSkills(unitId) {
        // Placeholder: All units are Flesh-Carvers
        return this.jobs["FLESH_CARVER"].skills;
    }

    executeSkill(attackerId, targetId, skill) {
        console.log(`Unit ${attackerId} uses ${skill.name} on ${targetId}`);

        if (skill.heal) {
            COMPONENT_STATS.hp[targetId] += skill.heal;
            if(COMPONENT_STATS.hp[targetId] > COMPONENT_STATS.maxHp[targetId])
               COMPONENT_STATS.hp[targetId] = COMPONENT_STATS.maxHp[targetId]; // Clamp? We don't have MaxHP yet fully wired.
            return `+${skill.heal}`;
        }

        // Damage Skill
        if (skill.damage_mod) {
            // Use CombatResolver via ActionSystem
            const baseDmg = this.actionSystem.performAttack(attackerId, targetId);
            // Mod damage
            // Ideally performAttack should accept a multiplier.
            // Phase 14 simplified: just return baseDmg for now.
            return `-${baseDmg}`;
        }

        return "OK";
    }
}
