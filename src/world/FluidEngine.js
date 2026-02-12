import { Chunk } from './Chunk.js';

export class FluidEngine {
    constructor(chunk) {
        this.chunk = chunk;
        this.updateInterval = 0.1; // Update fluids every 0.1s
        this.timer = 0;

        // Pre-allocate neighbor offsets to avoid GC
        this.offsets = [
            { x: 0, y: -1 }, // N
            { x: 0, y: 1 },  // S
            { x: -1, y: 0 }, // W
            { x: 1, y: 0 }   // E
        ];
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.updateInterval) {
            this.step();
            this.timer = 0;
        }
    }

    step() {
        const size = this.chunk.size;
        const liquid = this.chunk.liquidLevel;
        const heights = this.chunk.heightMap;

        // Clone current state to avoid race conditions during update
        const nextLiquid = new Uint8Array(liquid);

        // Simple fluid cellular automata
        // Iterate over every cell
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = this.chunk.getIndex(x, y);
                const val = liquid[i];

                if (val <= 0) continue; // No fluid here

                // Try to flow down (Gravity)
                let flowed = false;

                for (let k = 0; k < 4; k++) {
                    const nx = x + this.offsets[k].x;
                    const ny = y + this.offsets[k].y;

                    if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;

                    const ni = this.chunk.getIndex(nx, ny);

                    // Check height difference
                    // Fluid flows to lower ground
                    if (heights[ni] < heights[i]) {
                        // Flow to neighbor
                        // Move 1 unit of fluid
                        if (nextLiquid[ni] < 10) { // Max liquid 10
                            nextLiquid[ni]++;
                            nextLiquid[i]--;
                            flowed = true;
                            if (nextLiquid[i] <= 0) break; // Emptied
                        }
                    }
                    // Equal height spreading (Diffusion)
                    else if (heights[ni] === heights[i] && liquid[ni] < val - 1) {
                         // Balance fluid: if neighbor has significantly less, flow there
                         nextLiquid[ni]++;
                         nextLiquid[i]--;
                         flowed = true;
                         if (nextLiquid[i] <= 0) break;
                    }
                }
            }
        }

        // Apply updates
        this.chunk.liquidLevel.set(nextLiquid);
    }

    // Helper to spawn blood
    spawnFluid(x, y, amount) {
        const i = this.chunk.getIndex(x, y);
        if (i >= 0 && i < this.chunk.area) {
            this.chunk.liquidLevel[i] = Math.min(this.chunk.liquidLevel[i] + amount, 10);
        }
    }
}
