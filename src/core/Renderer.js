import { TILE_W, TILE_H, H_SCALE } from './Constants.js';
import { isoToScreen } from '../math/Isometric.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize
        this.width = 0;
        this.height = 0;

        // Camera position (Screen coordinates)
        this.camX = 0;
        this.camY = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Disable smoothing for pixel art
        this.ctx.imageSmoothingEnabled = false;

        // Center camera initially
        this.camX = this.width / 2;
        this.camY = this.height / 4;
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawChunk(chunk) {
        const size = chunk.size;

        // Painter's Algorithm: Back-to-Front
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = chunk.getIndex(x, y);
                const h = chunk.heightMap[i];
                const type = chunk.typeMap[i];
                const liquid = chunk.liquidLevel[i];

                // Calculate screen position
                const pos = isoToScreen(x, y, h, this.camX, this.camY);

                // Draw Terrain
                this.drawBlock(pos.x, pos.y, h, type);

                // Draw Liquid Overlay
                if (liquid > 0) {
                    this.drawFluid(pos.x, pos.y, liquid);
                }
            }
        }
    }

    drawBlock(sx, sy, h, type) {
        const ctx = this.ctx;

        let topColor = '#555';
        if (type === 1) { topColor = '#6d6d6d'; } // Stone

        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(sx, sy); // Top
        ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2); // Right
        ctx.lineTo(sx, sy + TILE_H); // Bottom
        ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2); // Left
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.stroke();
    }

    drawFluid(sx, sy, amount) {
        const ctx = this.ctx;
        // Blood color with transparency based on amount
        const alpha = Math.min(amount / 5, 1.0); // 1 to 10 scale
        ctx.fillStyle = `rgba(138, 3, 3, ${alpha})`;

        ctx.beginPath();
        ctx.moveTo(sx, sy); // Top
        ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2); // Right
        ctx.lineTo(sx, sy + TILE_H); // Bottom
        ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2); // Left
        ctx.closePath();
        ctx.fill();

        // Optional: Draw droplets/particles?
        // For now, a simple overlay is enough for phase 1.5
    }
}
