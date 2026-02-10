import { Chunk } from './Chunk.js';

export class FluidEngine {
    constructor(chunk) {
        this.chunk = chunk;
        this.updateInterval = 0.1; // Update fluids every 0.1s
        this.timer = 0;
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
                // Check neighbors: N, S, E, W
                const neighbors = [
                    { x: x, y: y - 1 }, // N
                    { x: x, y: y + 1 }, // S
                    { x: x - 1, y: y }, // W
                    { x: x + 1, y: y }  // E
                ];

                let flowed = false;

                for (let n of neighbors) {
                    if (n.x < 0 || n.x >= size || n.y < 0 || n.y >= size) continue;

                    const ni = this.chunk.getIndex(n.x, n.y);

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
