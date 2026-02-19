import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_STATUS } from '../entities/components/Status.js';
import { PROP_ROCK, PROP_TREE, PROP_LOOT_BAG, PROP_CORPSE } from '../core/Constants.js';
import { ITEMS } from '../data/Items.js';

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

    _isEnemyPair(aId, bId) {
        return (aId === 0 && bId > 0) || (aId > 0 && bId === 0);
    }

    _findReactionAttacker(moverId, fromX, fromY, toX, toY) {
        const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
        const fromSet = new Set();
        const toSet = new Set();

        for (const d of dirs) {
            const fx = fromX + d.x;
            const fy = fromY + d.y;
            if (fx >= 0 && fx < this.chunk.size && fy >= 0 && fy < this.chunk.size) fromSet.add(`${fx},${fy}`);

            const tx = toX + d.x;
            const ty = toY + d.y;
            if (tx >= 0 && tx < this.chunk.size && ty >= 0 && ty < this.chunk.size) toSet.add(`${tx},${ty}`);
        }

        // Find enemy adjacent before move but not after move (leaving melee range)
        for (let id = 0; id < this.em.activeMap.length; id++) {
            if (!this.em.activeMap[id] || id === moverId) continue;
            if (!this._isEnemyPair(id, moverId)) continue;
            if (COMPONENT_STATS.hp[id] <= 0) continue;

            const ex = COMPONENT_TRANSFORM.x[id];
            const ey = COMPONENT_TRANSFORM.y[id];
            const key = `${ex},${ey}`;
            if (fromSet.has(key) && !toSet.has(key)) return id;
        }

        return -1;
    }

    moveUnit(unitId, targetX, targetY) {
        const prevX = COMPONENT_TRANSFORM.x[unitId];
        const prevY = COMPONENT_TRANSFORM.y[unitId];
        const reactionAttackerId = this._findReactionAttacker(unitId, prevX, prevY, targetX, targetY);

        COMPONENT_TRANSFORM.x[unitId] = targetX;
        COMPONENT_TRANSFORM.y[unitId] = targetY;

        const dx = targetX - prevX;
        const dy = targetY - prevY;
        if (Math.abs(dx) > Math.abs(dy) && dx !== 0) COMPONENT_TRANSFORM.dir[unitId] = dx > 0 ? 1 : 3;
        else if (dy !== 0) COMPONENT_TRANSFORM.dir[unitId] = dy > 0 ? 2 : 0;
        const idx = this.chunk.getIndex(targetX, targetY);
        COMPONENT_TRANSFORM.z[unitId] = this.chunk.heightMap[idx];

        let lootedItemName = null;
        let reactionDamage = 0;

        // Loot Check
        if (this.chunk.objIndex[idx] === PROP_LOOT_BAG) {
            console.log(`Unit ${unitId} picked up LOOT!`);

            // Random Loot Logic
            if (this.inventorySystem) {
                // Mock random item ID: 101, 102, 104, 201
                const lootTable = [101, 102, 104, 201];
                const itemId = lootTable[Math.floor(Math.random() * lootTable.length)];
                this.inventorySystem.addItem(itemId);

                const item = ITEMS[itemId];
                if (item) lootedItemName = item.name;
            }

            // Remove Bag
            this.chunk.objIndex[idx] = 0;
        }

        if (reactionAttackerId !== -1 && this.combatResolver) {
            reactionDamage = this.combatResolver.calculateDamage(reactionAttackerId, unitId, 10, 0.6);
            this.combatResolver.applyDamage(unitId, reactionDamage, reactionAttackerId);
        }

        console.log(`Unit ${unitId} moved to ${targetX}, ${targetY}`);
        return { loot: lootedItemName, reactionDamage, reactionAttackerId };
    }

    performAttack(attackerId, targetId, damageMod = 1) {
        if (!this.combatResolver) return;

        const ax = COMPONENT_TRANSFORM.x[attackerId];
        const ay = COMPONENT_TRANSFORM.y[attackerId];
        const tx = COMPONENT_TRANSFORM.x[targetId];
        const ty = COMPONENT_TRANSFORM.y[targetId];
        const dx = tx - ax;
        const dy = ty - ay;

        if (Math.abs(dx) > Math.abs(dy) && dx !== 0) COMPONENT_TRANSFORM.dir[attackerId] = dx > 0 ? 1 : 3;
        else if (dy !== 0) COMPONENT_TRANSFORM.dir[attackerId] = dy > 0 ? 2 : 0;

        const dmg = this.combatResolver.calculateDamage(attackerId, targetId, 10, damageMod);
        this.combatResolver.applyDamage(targetId, dmg, attackerId);
        return dmg;
    }

    // Module 5.5: Cannibalize
    performDevour(unitId) {
        const x = COMPONENT_TRANSFORM.x[unitId];
        const y = COMPONENT_TRANSFORM.y[unitId];
        let targetIdx = -1;

        // Check center (priority)
        const idx = this.chunk.getIndex(x, y);
        if (this.chunk.objIndex[idx] === PROP_CORPSE) {
            targetIdx = idx;
        } else {
            // Check neighbors
            const neighbors = [{x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0}];
            for (let n of neighbors) {
                const nx = x + n.x;
                const ny = y + n.y;
                if (nx>=0 && nx<this.chunk.size && ny>=0 && ny<this.chunk.size) {
                    const ni = this.chunk.getIndex(nx, ny);
                    if (this.chunk.objIndex[ni] === PROP_CORPSE) {
                        targetIdx = ni;
                        break;
                    }
                }
            }
        }

        if (targetIdx !== -1) {
            // Remove Corpse
            this.chunk.objIndex[targetIdx] = 0;

            // Heal (25% MaxHP)
            const maxHp = COMPONENT_STATS.maxHp[unitId];
            const healAmount = Math.floor(maxHp * 0.25);
            COMPONENT_STATS.hp[unitId] = Math.min(maxHp, COMPONENT_STATS.hp[unitId] + healAmount);

            // Give Loot (Viscera)
            if (this.inventorySystem) {
                // 901: Flesh Scraps, 902: Intact Heart
                const viscera = (Math.random() < 0.3) ? 902 : 901;
                this.inventorySystem.addItem(viscera);
                return { healed: healAmount, item: ITEMS[viscera].name };
            }

            return { healed: healAmount, item: "Viscera" };
        }
        return null;
    }
}
