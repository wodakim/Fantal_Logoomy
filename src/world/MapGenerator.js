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

        while (!valid && attempts < 10) {
            this.noise.seed(seed + attempts);
            chunk = this.generateHeightMap(16);

            // Apply Biomes (Cellular Automata)
            const biomeGen = new BiomeGenerator(chunk);
            biomeGen.simulate(3); // 3 iterations of growth

            // Check Connectivity
            if (this.validateConnectivity(chunk)) {
                valid = true;
                console.log(`Map Generated (Seed: ${seed}, Attempts: ${attempts + 1})`);
            } else {
                console.warn(`Map Generation Failed (Attempt ${attempts + 1}) - Retrying...`);
                attempts++;
            }
        }

        if (!valid) {
            console.error("Failed to generate a valid map after 10 attempts. Returning last attempt.");
        }

        return chunk;
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
            const h = chunk.heightMap[i];
            const obj = chunk.objIndex[i];
            // Treat Water (Type 2) and High Walls as non-walkable for spawn logic?
            // Actually, let's assume standard walk logic:
            // Walkable if not a blocking Prop.
            // But we need to check if we can reach most other tiles.

            // Count total potentially walkable tiles
            // Assume Water is walkable but slow? Or deep water blocks?
            // Let's assume Deep Water (h<=1) is walkable for now but discouraged.
            // Let's count non-blocked tiles.
            // Actually, let's just pick the first non-obstacle tile.
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
}
