import { Chunk } from './Chunk.js';

export class BiomeGenerator {
    constructor(chunk) {
        this.chunk = chunk;
        this.size = chunk.size;

        // Moore Neighborhood offsets
        this.offsets = [
            {x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0},
            {x:-1, y:-1}, {x:1, y:-1}, {x:-1, y:1}, {x:1, y:1}
        ];
    }

    // Cellular Automata for Organic Biomes (Section 2.2)
    simulate(iterations = 3) {
        // Init Seeds
        this.placeSeeds();

        for (let i = 0; i < iterations; i++) {
            this.step();
        }
    }

    placeSeeds() {
        const bloodSeeds = 5;
        const boneSeeds = 3;

        for (let i = 0; i < bloodSeeds; i++) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            const idx = this.chunk.getIndex(x, y);
            this.chunk.liquidLevel[idx] = 5; // Start with some blood
        }

        for (let i = 0; i < boneSeeds; i++) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            const idx = this.chunk.getIndex(x, y);
            this.chunk.typeMap[idx] = 3; // Bone
        }
    }

    step() {
        // We need a temp buffer for updates to avoid race conditions
        const nextType = new Uint8Array(this.chunk.typeMap);
        const nextLiquid = new Uint8Array(this.chunk.liquidLevel);

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const idx = this.chunk.getIndex(x, y);

                // Rules for Blood Propagation
                // If Neighbors_blood >= 3, become Blood (Liquid)
                let bloodCount = 0;
                let boneCount = 0;

                // Loop over neighbors without allocation
                for (let k = 0; k < 8; k++) {
                    const nx = x + this.offsets[k].x;
                    const ny = y + this.offsets[k].y;

                    if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                        const ni = this.chunk.getIndex(nx, ny);
                        if (this.chunk.liquidLevel[ni] > 0) bloodCount++;
                        if (this.chunk.typeMap[ni] === 3) boneCount++;
                    }
                }

                // Rule: Blood Spreads if surrounded
                if (this.chunk.liquidLevel[idx] === 0 && bloodCount >= 3) {
                    if (this.chunk.typeMap[idx] !== 3) { // Don't replace bone
                        nextLiquid[idx] = 2; // New blood
                    }
                }

                // Rule: Bone Walls Grow (Obstacles)
                // If Neighbors_bone >= 4, become Bone Wall
                if (this.chunk.typeMap[idx] !== 3 && boneCount >= 4) {
                    nextType[idx] = 3;
                    // Raise height to make it a wall?
                    // Optional: this.chunk.heightMap[idx] += 1;
                }
            }
        }

        this.chunk.typeMap.set(nextType);
        this.chunk.liquidLevel.set(nextLiquid);
    }
}
