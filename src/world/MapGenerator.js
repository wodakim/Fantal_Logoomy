import { Chunk } from './Chunk.js';
import { Noise } from '../math/Noise.js';

export class MapGenerator {
    constructor() {
        this.noise = new Noise();
    }

    generate(seed = Math.random()) {
        this.noise.seed(seed);
        const chunk = new Chunk(16);

        // "Flesh-Carver" Algorithm
        const frequency = 0.15;
        const amplitude = 6; // Max Height ~6
        const baseHeight = 1; // Minimum height

        for (let y = 0; y < chunk.size; y++) {
            for (let x = 0; x < chunk.size; x++) {
                // 1. Base Terrain (Octaves)
                let n = this.noise.fbm(x * frequency, y * frequency, 3);

                // Normalize n (usually -1 to 1) to 0 to 1
                n = (n + 1) * 0.5;

                // 2. Step Function (Terracing)
                // Vermilion requires "steps" for tactical height
                let h = Math.floor(n * amplitude) + baseHeight;

                // 3. Tactical Smoothing (Local Check)
                // We will do this in a second pass if needed, but for now linear logic:
                // If simple rounding creates too much noise, we can clamp.

                // Set Data
                const idx = chunk.getIndex(x, y);
                chunk.heightMap[idx] = h;

                // 4. Biome/Type Logic (Simple based on height)
                // Low = Water/Blood, Mid = Stone, High = Bone
                if (h <= 1) {
                    chunk.typeMap[idx] = 2; // Water/Blood Pool
                    // Random chance to be Blood
                    if (Math.random() < 0.3) {
                         // We don't set liquid here, we set the tile type.
                         // But let's spawn actual fluid.
                         chunk.liquidLevel[idx] = 5;
                    }
                } else if (h >= 5) {
                    chunk.typeMap[idx] = 3; // Bone/High ground
                } else {
                    chunk.typeMap[idx] = 1; // Stone/Flesh
                }
            }
        }

        // 5. Connectivity Check (Placeholder for Jump Check)
        // ...

        return chunk;
    }
}
