import { Chunk } from './Chunk.js';
import { Noise } from '../math/Noise.js';

export class MapGenerator {
    constructor() {
        this.noise = new Noise();
    }

    generate(seed = Math.random()) {
        this.noise.seed(seed);
        const chunk = new Chunk(16);

        const frequency = 0.15;
        const amplitude = 6;
        const baseHeight = 1;

        for (let y = 0; y < chunk.size; y++) {
            for (let x = 0; x < chunk.size; x++) {
                let n = this.noise.fbm(x * frequency, y * frequency, 3);
                n = (n + 1) * 0.5;
                let h = Math.floor(n * amplitude) + baseHeight;

                const idx = chunk.getIndex(x, y);
                chunk.heightMap[idx] = h;

                if (h <= 1) {
                    chunk.typeMap[idx] = 2; // Water
                } else if (h >= 5) {
                    chunk.typeMap[idx] = 3; // Bone
                } else {
                    chunk.typeMap[idx] = 1; // Stone
                }

                // Add Props (Density ~10%)
                // Only on empty ground (not water)
                if (h > 1 && Math.random() < 0.10) {
                    // Prop Types: 1=Rock, 2=Tree/Pillar
                    chunk.objIndex[idx] = (Math.random() < 0.5) ? 1 : 2;
                    // Mark as blocked in wallMap? Or handle in Logic?
                    // For now, simple visual prop.
                }
            }
        }
        return chunk;
    }
}
