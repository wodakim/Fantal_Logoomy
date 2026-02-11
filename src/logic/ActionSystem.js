import { COMPONENT_STATS } from '../entities/components/Stats.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { Pathfinding } from './Pathfinding.js';

export class ActionSystem {
    constructor(chunk, entityManager) {
        this.chunk = chunk;
        this.em = entityManager;
        this.pathfinder = new Pathfinding(chunk);
    }

    // FloodFill to find all reachable tiles
    getMovementRange(unitId) {
        const startX = COMPONENT_TRANSFORM.x[unitId];
        const startY = COMPONENT_TRANSFORM.y[unitId];
        const moveStat = 4; // Placeholder, should get from Stats/Job
        const jumpStat = 2; // Placeholder

        // Use a modified Dijkstra/BFS
        let openSet = [{ x: startX, y: startY, cost: 0 }];
        let closedSet = new Map(); // "x,y" -> minCost
        let validTiles = [];

        while (openSet.length > 0) {
            // Sort by cost (low to high)
            openSet.sort((a, b) => a.cost - b.cost);
            let current = openSet.shift();

            const key = `${current.x},${current.y}`;
            if (closedSet.has(key) && closedSet.get(key) <= current.cost) continue;
            closedSet.set(key, current.cost);

            if (current.cost <= moveStat) {
                validTiles.push({ x: current.x, y: current.y });
            } else {
                continue; // Too far
            }

            // Neighbors
            const neighbors = [
                {x: current.x, y: current.y-1},
                {x: current.x, y: current.y+1},
                {x: current.x-1, y: current.y},
                {x: current.x+1, y: current.y}
            ];

            for (let n of neighbors) {
                if (n.x < 0 || n.x >= this.chunk.size || n.y < 0 || n.y >= this.chunk.size) continue;

                // Height check
                const idxCurr = this.chunk.getIndex(current.x, current.y);
                const idxNext = this.chunk.getIndex(n.x, n.y);
                const h1 = this.chunk.heightMap[idxCurr];
                const h2 = this.chunk.heightMap[idxNext];

                if (Math.abs(h1 - h2) > jumpStat) continue;

                // Fluid check (Cost +1)
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

    moveUnit(unitId, targetX, targetY) {
        // Teleport for now (Animation later)
        COMPONENT_TRANSFORM.x[unitId] = targetX;
        COMPONENT_TRANSFORM.y[unitId] = targetY;

        // Update Z based on terrain
        const idx = this.chunk.getIndex(targetX, targetY);
        COMPONENT_TRANSFORM.z[unitId] = this.chunk.heightMap[idx];

        console.log(`Unit ${unitId} moved to ${targetX}, ${targetY}`);
    }
}
