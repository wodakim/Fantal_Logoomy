// Improved Perlin/Simplex Noise Implementation
// Based on standard permutation table approach

export class Noise {
    constructor(seed = Math.random()) {
        this.p = new Uint8Array(512);
        this.perm = new Uint8Array(512);
        this.seed(seed);
    }

    seed(seed) {
        // Simple LCG to shuffle permutation table based on seed
        let next = seed;
        const lcg = () => {
            next = (next * 1664525 + 1013904223) % 4294967296;
            return next / 4294967296;
        };

        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }

        for (let i = 0; i < 256; i++) {
            let r = Math.floor(lcg() * 256);
            let temp = this.p[i];
            this.p[i] = this.p[r];
            this.p[r] = temp;
        }

        // Duplicate for overflow
        for (let i = 0; i < 256; i++) {
            this.perm[i] = this.p[i];
            this.perm[i + 256] = this.p[i];
        }
    }

    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }

    mix(a, b, t) {
        return (1 - t) * a + t * b;
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // 2D Perlin Noise
    get(x, y) {
        // Find unit grid cell containing point
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;

        // Get relative xy coordinates of point within that cell
        x -= Math.floor(x);
        y -= Math.floor(y);

        let u = this.fade(x);
        let v = this.fade(y);

        // Hash coordinates of the 4 square corners
        let A = this.perm[X] + Y;
        let AA = this.perm[A];
        let AB = this.perm[A + 1];
        let B = this.perm[X + 1] + Y;
        let BA = this.perm[B];
        let BB = this.perm[B + 1];

        // Gradient vectors
        const grads = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [1, 0], [-1, 0], // Duplicates to fill 8? simplified
            [0, 1], [0, -1], [0, 1], [0, -1]
        ];

        // Helper to get grad from hash (0-15)
        const grad = (hash, x, y) => {
            const h = hash & 3; // Use first 4 grads for 2D
            let u = h < 2 ? x : y;
            let v = h < 2 ? y : x;
            return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v); // Simplification
        };
        // Actually let's use a cleaner grad function for 2D
        const grad2 = (hash, x, y) => {
            const h = hash & 7; // 8 gradients
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
        };


        return this.mix(
            this.mix(grad2(this.perm[AA], x, y), grad2(this.perm[BA], x - 1, y), u),
            this.mix(grad2(this.perm[AB], x, y - 1), grad2(this.perm[BB], x - 1, y - 1), u),
            v
        );
    }

    // Fractal Brownian Motion (Octaves)
    fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2) {
        let total = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;  // Used for normalizing result to 0.0 - 1.0

        for(let i=0;i<octaves;i++) {
            total += this.get(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return total / maxValue;
    }
}
