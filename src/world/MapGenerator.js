import { Chunk } from './Chunk.js';
import { Noise } from '../math/Noise.js';
import { BiomeGenerator } from './Biome.js';

export class MapGenerator {
    constructor() {
        this.noise = new Noise();
    }

    generate(seed = Math.random()) {
        let chunk;
        let valid = false;
        let attempts = 0;
        let spawns = { player: [], enemy: [] };

        while (!valid && attempts < 10) {
            this.noise.seed(seed + attempts);
            chunk = this.generateHeightMap(16);

            // Apply Biomes (Cellular Automata)
            const biomeGen = new BiomeGenerator(chunk);
            biomeGen.simulate(3); // 3 iterations of growth

            // Check Connectivity
            if (this.validateConnectivity(chunk)) {
                // Generate Spawn Points (POI)
                spawns = this.generateSpawns(chunk);
                if (spawns.player.length > 0 && spawns.enemy.length > 0) {
                    valid = true;
                    console.log(`Map Generated (Seed: ${seed}, Attempts: ${attempts + 1})`);
                } else {
                     console.warn(`Map Generation Failed (No Spawns) - Retrying...`);
                     attempts++;
                }
            } else {
                console.warn(`Map Generation Failed (Connectivity) - Retrying...`);
                attempts++;
            }
        }

        if (!valid) {
            console.error("Failed to generate a valid map after 10 attempts. Returning last attempt.");
        }

        return { chunk, spawns };
    }

    generateHeightMap(size) {
        const chunk = new Chunk(size);
        const frequency = 0.15;
        const amplitude = 6;
        const baseHeight = 1;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let n = this.noise.fbm(x * frequency, y * frequency, 3);
                n = (n + 1) * 0.5;
                let h = Math.floor(n * amplitude) + baseHeight;

                const idx = chunk.getIndex(x, y);
                chunk.heightMap[idx] = h;

                // Basic Types based on Height
                if (h <= 1) {
                    chunk.typeMap[idx] = 2; // Water (Low)
                } else if (h >= 5) {
                    chunk.typeMap[idx] = 3; // Bone (High)
                } else {
                    chunk.typeMap[idx] = 1; // Stone (Mid)
                }

                // Props
                if (h > 1 && Math.random() < 0.10) {
                    chunk.objIndex[idx] = (Math.random() < 0.5) ? 1 : 2;
                }
            }
        }
        return chunk;
    }

    // Flood Fill Algorithm to check % of accessible tiles
    validateConnectivity(chunk) {
        const size = chunk.size;
        const visited = new Uint8Array(size * size);
        let startNode = null;
        let totalWalkable = 0;

        // 1. Find a valid start node (Not water, Not blocked prop)
        for (let i = 0; i < size * size; i++) {
            const obj = chunk.objIndex[i];
            // Treat Water (Type 2) as walkable but slow.
            if (obj === 0) { // No prop
                if (!startNode) startNode = { x: i % size, y: Math.floor(i / size) };
                totalWalkable++;
            }
        }

        if (!startNode) return false; // Map is full of props?

        // 2. Flood Fill
        let queue = [startNode];
        let reached = 0;
        visited[chunk.getIndex(startNode.x, startNode.y)] = 1;
        reached++;

        const jumpHeight = 2; // Standard Jump

        while (queue.length > 0) {
            const current = queue.shift();
            const idxCurr = chunk.getIndex(current.x, current.y);
            const hCurr = chunk.heightMap[idxCurr];

            const neighbors = [
                {x: current.x, y: current.y - 1},
                {x: current.x, y: current.y + 1},
                {x: current.x - 1, y: current.y},
                {x: current.x + 1, y: current.y}
            ];

            for (let n of neighbors) {
                if (n.x < 0 || n.x >= size || n.y < 0 || n.y >= size) continue;

                const idxNext = chunk.getIndex(n.x, n.y);
                if (visited[idxNext]) continue;

                // Prop Check
                if (chunk.objIndex[idxNext] > 0) continue; // Blocked

                // Height Check
                const hNext = chunk.heightMap[idxNext];
                if (Math.abs(hNext - hCurr) <= jumpHeight) {
                    visited[idxNext] = 1;
                    reached++;
                    queue.push(n);
                }
            }
        }

        // 3. Check Ratio
        // We require 80% of open space to be connected.
        const ratio = reached / totalWalkable;
        console.log(`Map Connectivity: ${(ratio * 100).toFixed(1)}% (${reached}/${totalWalkable})`);

        return ratio >= 0.80;
    }

    // Identify POI (Points of Interest) for Spawns
    generateSpawns(chunk) {
        const size = chunk.size;
        const playerSpawns = [];
        const enemySpawns = [];

        let avgHeight = 0;
        for (let i=0; i<chunk.area; i++) avgHeight += chunk.heightMap[i];
        avgHeight /= chunk.area;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = chunk.getIndex(x, y);
                // Cannot spawn on props or deep liquid/water?
                if (chunk.objIndex[i] > 0) continue;
                if (chunk.typeMap[i] === 2) continue; // Avoid spawning on Water

                const h = chunk.heightMap[i];

                // Player Spawn: Low Ground / Flat (Blue Zone)
                if (h <= avgHeight && h > 1) {
                    // Check Flatness (Variance with neighbors)
                    if (this.isFlat(chunk, x, y)) {
                        playerSpawns.push({x, y, z: h});
                    }
                }

                // Enemy Spawn: High Ground (Red Zone)
                if (h > avgHeight + 1) {
                    enemySpawns.push({x, y, z: h});
                }
            }
        }

        // Sort Player Spawns by distance to edge? Or random?
        // Sort Enemy Spawns by height (highest first)
        enemySpawns.sort((a, b) => b.z - a.z);

        // Fallback if no specific spawns found
        if (playerSpawns.length === 0) playerSpawns.push({x:0, y:0, z: chunk.heightMap[0]});
        if (enemySpawns.length === 0) enemySpawns.push({x:15, y:15, z: chunk.heightMap[chunk.getIndex(15,15)]});

        return { player: playerSpawns, enemy: enemySpawns };
    }

    isFlat(chunk, x, y) {
        const h = chunk.heightMap[chunk.getIndex(x, y)];
        const neighbors = [
             {x:x+1, y:y}, {x:x-1, y:y}, {x:x, y:y+1}, {x:x, y:y-1}
        ];
        let variance = 0;
        for(let n of neighbors) {
            if(n.x>=0 && n.x<chunk.size && n.y>=0 && n.y<chunk.size) {
                 variance += Math.abs(chunk.heightMap[chunk.getIndex(n.x, n.y)] - h);
            }
        }
        return variance <= 1;
    }
}
