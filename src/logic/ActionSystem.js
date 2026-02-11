import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';

export class ActionSystem {
    constructor(chunk, entityManager, combatResolver) {
        this.chunk = chunk;
        this.em = entityManager;
        this.combatResolver = combatResolver;
    }

    // FloodFill to find all reachable tiles
    getMovementRange(unitId) {
        // ... (Existing Implementation) ...
        // Re-pasting for context if needed, but assuming previous file content exists.
        // Actually I need to re-write the file or append to it.
        // I will re-implement the full class with new methods.
        const startX = COMPONENT_TRANSFORM.x[unitId];
        const startY = COMPONENT_TRANSFORM.y[unitId];
        const moveStat = 4; // Placeholder
        const jumpStat = 2; // Placeholder

        let openSet = [{ x: startX, y: startY, cost: 0 }];
        let closedSet = new Map();
        let validTiles = [];

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.cost - b.cost);
            let current = openSet.shift();

            const key = `${current.x},${current.y}`;
            if (closedSet.has(key) && closedSet.get(key) <= current.cost) continue;
            closedSet.set(key, current.cost);

            if (current.cost <= moveStat) {
                validTiles.push({ x: current.x, y: current.y });
            } else {
                continue;
            }

            const neighbors = [
                {x: current.x, y: current.y-1}, {x: current.x, y: current.y+1},
                {x: current.x-1, y: current.y}, {x: current.x+1, y: current.y}
            ];

            for (let n of neighbors) {
                if (n.x < 0 || n.x >= this.chunk.size || n.y < 0 || n.y >= this.chunk.size) continue;
                const idxCurr = this.chunk.getIndex(current.x, current.y);
                const idxNext = this.chunk.getIndex(n.x, n.y);
                const h1 = this.chunk.heightMap[idxCurr];
                const h2 = this.chunk.heightMap[idxNext];
                if (Math.abs(h1 - h2) > jumpStat) continue;
                const liquid = this.chunk.liquidLevel[idxNext];
                const tileCost = (liquid > 0) ? 2 : 1;
                const newCost = current.cost + tileCost;
                if (newCost <= moveStat) {
                    openSet.push({ x: n.x, y: n.y, cost: newCost });
                }
            }
        }
        return validTiles;
    }

    getAttackRange(unitId, range = 1) {
        const startX = COMPONENT_TRANSFORM.x[unitId];
        const startY = COMPONENT_TRANSFORM.y[unitId];
        let tiles = [];

        // Simple Diamond shape for Range 1
        // |dx| + |dy| <= range
        const size = this.chunk.size;

        for (let y = -range; y <= range; y++) {
            for (let x = -range; x <= range; x++) {
                if (Math.abs(x) + Math.abs(y) <= range) {
                    const tx = startX + x;
                    const ty = startY + y;
                    if (tx >= 0 && tx < size && ty >= 0 && ty < size) {
                        // Check height tolerance? (Vertical=2)
                        // For now, ignore height for attack range vis
                        tiles.push({ x: tx, y: ty });
                    }
                }
            }
        }
        return tiles;
    }

    moveUnit(unitId, targetX, targetY) {
        COMPONENT_TRANSFORM.x[unitId] = targetX;
        COMPONENT_TRANSFORM.y[unitId] = targetY;
        const idx = this.chunk.getIndex(targetX, targetY);
        COMPONENT_TRANSFORM.z[unitId] = this.chunk.heightMap[idx];
        console.log(`Unit ${unitId} moved to ${targetX}, ${targetY}`);
    }

    performAttack(attackerId, targetId) {
        if (!this.combatResolver) {
            console.error("CombatResolver not linked!");
            return;
        }

        const dmg = this.combatResolver.calculateDamage(attackerId, targetId);
        this.combatResolver.applyDamage(targetId, dmg);

        return dmg;
    }
}
