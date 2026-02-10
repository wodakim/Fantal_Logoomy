export class SpriteGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // Generates a symmetrical sprite (8x8 or 16x16)
    generateSprite(seed, options = {}) {
        const width = options.width || 16;
        const height = options.height || 16;
        const mirror = options.mirror !== undefined ? options.mirror : true;
        const color = options.color || '#e0e0e0';

        this.canvas.width = width;
        this.canvas.height = height;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, width, height);

        const halfWidth = mirror ? Math.ceil(width / 2) : width;

        // Simple seeded RNG for this sprite
        let rngState = seed;
        const random = () => {
            rngState = (rngState * 9301 + 49297) % 233280;
            return rngState / 233280;
        };

        ctx.fillStyle = color;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < halfWidth; x++) {
                // Determine if pixel is active based on noise/random
                // Density decreases towards edges
                const distFromCenter = x / halfWidth;
                const threshold = 0.5 + (distFromCenter * 0.3);

                if (random() > threshold) {
                    ctx.fillRect(x, y, 1, 1);
                    if (mirror) {
                        ctx.fillRect(width - 1 - x, y, 1, 1);
                    }
                }
            }
        }

        // Return ImageBitmap for performance
        return createImageBitmap(this.canvas);
    }
}
