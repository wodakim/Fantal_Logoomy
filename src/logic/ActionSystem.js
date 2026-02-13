import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { PROP_ROCK, PROP_TREE, PROP_LOOT_BAG } from '../core/Constants.js';

export class ActionSystem {
    constructor(chunk, entityManager, combatResolver, inventorySystem) {
        this.chunk = chunk;
        this.em = entityManager;
        this.combatResolver = combatResolver;
        this.inventorySystem = inventorySystem;
    }

    getMovementRange(unitId) {
        const startX = COMPONENT_TRANSFORM.x[unitId];
        const startY = COMPONENT_TRANSFORM.y[unitId];
        const moveStat = 4;
        const jumpStat = 2;

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

                // Prop Obstacle Check
                const idxNext = this.chunk.getIndex(n.x, n.y);
                const obj = this.chunk.objIndex[idxNext];
                // Walkable? 0=None, 3=Corpse(Walkable), 4=Loot(Walkable). 1,2 blocked.
                if (obj === PROP_ROCK || obj === PROP_TREE) continue;

                const idxCurr = this.chunk.getIndex(current.x, current.y);
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
        const size = this.chunk.size;

        for (let y = -range; y <= range; y++) {
            for (let x = -range; x <= range; x++) {
                if (Math.abs(x) + Math.abs(y) <= range) {
                    const tx = startX + x;
                    const ty = startY + y;
                    if (tx >= 0 && tx < size && ty >= 0 && ty < size) {
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

        // Loot Check
        if (this.chunk.objIndex[idx] === PROP_LOOT_BAG) {
            console.log(`Unit ${unitId} picked up LOOT!`);

            // Random Loot Logic
            if (this.inventorySystem) {
                // Mock random item ID: 101, 102, 104, 201
                const lootTable = [101, 102, 104, 201];
                const item = lootTable[Math.floor(Math.random() * lootTable.length)];
                this.inventorySystem.addItem(item);
            }

            // Remove Bag
            this.chunk.objIndex[idx] = 0;
        }

        console.log(`Unit ${unitId} moved to ${targetX}, ${targetY}`);
    }

    performAttack(attackerId, targetId) {
        if (!this.combatResolver) return;
        const dmg = this.combatResolver.calculateDamage(attackerId, targetId);
        this.combatResolver.applyDamage(targetId, dmg, attackerId);
        return dmg;
    }
}
