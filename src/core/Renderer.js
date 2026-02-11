import { TILE_W, TILE_H, H_SCALE } from './Constants.js';
import { isoToScreen } from '../math/Isometric.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_SPRITE, SPRITE_CACHE } from '../entities/components/Sprite.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.width = 0;
        this.height = 0;

        // Camera position
        this.camX = 0;
        this.camY = 0;

        // Mobile: Zoom factor
        this.zoom = 1.0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false;
        this.camX = this.width / 2;
        this.camY = this.height / 4;
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    render(chunk, entityManager) {
        const ctx = this.ctx;
        const size = chunk.size;

        const entities = [];
        const maxUnits = entityManager.activeMap.length;

        for (let id = 0; id < maxUnits; id++) {
            if (entityManager.activeMap[id] === 0) continue;
            if (COMPONENT_SPRITE.active[id]) {
                entities.push({
                    id: id,
                    x: COMPONENT_TRANSFORM.x[id],
                    y: COMPONENT_TRANSFORM.y[id],
                    z: COMPONENT_TRANSFORM.z[id],
                    spriteId: COMPONENT_SPRITE.spriteId[id]
                });
            }
        }

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = chunk.getIndex(x, y);
                const h = chunk.heightMap[i];
                const type = chunk.typeMap[i];
                const liquid = chunk.liquidLevel[i];
                const obj = chunk.objIndex[i]; // Prop ID

                const pos = isoToScreen(x, y, h, this.camX, this.camY);

                this.drawBlock(pos.x, pos.y, h, type);

                if (liquid > 0) {
                    this.drawFluid(pos.x, pos.y, liquid);
                }

                // Draw Prop
                if (obj > 0) {
                    this.drawProp(pos.x, pos.y, obj);
                }

                // Draw Entities
                for (let e of entities) {
                    if (e.x === x && e.y === y) {
                        const ePos = isoToScreen(e.x, e.y, e.z, this.camX, this.camY);
                        this.drawEntity(ePos.x, ePos.y, e.spriteId);
                    }
                }
            }
        }
    }

    drawBlock(sx, sy, h, type) {
        const ctx = this.ctx;
        let topColor = '#555';
        if (type === 1) topColor = '#6d6d6d'; // Stone
        if (type === 2) topColor = '#3498db'; // Water base
        if (type === 3) topColor = '#e3DAC9'; // Bone

        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
        ctx.lineTo(sx, sy + TILE_H);
        ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.stroke();
    }

    drawFluid(sx, sy, amount) {
        const ctx = this.ctx;
        const alpha = Math.min(amount / 5, 1.0);
        ctx.fillStyle = `rgba(138, 3, 3, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
        ctx.lineTo(sx, sy + TILE_H);
        ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
        ctx.closePath();
        ctx.fill();
    }

    drawProp(sx, sy, type) {
        const ctx = this.ctx;
        // Simple visual placeholder for props
        // Rock = Dark Grey, Tree/Bone = Light Grey
        ctx.fillStyle = (type === 1) ? '#444' : '#ccc';

        // Draw a smaller block or shape
        const w = TILE_W / 2;
        const h = TILE_H;
        const ox = sx + (TILE_W - w)/2 - 16; // Center horizontally roughly
        const oy = sy - h/2; // Shift up

        // Draw a "Pillar"
        ctx.fillRect(sx - w/4, sy - h/2, w/2, h);
    }

    drawEntity(sx, sy, spriteId) {
        const ctx = this.ctx;
        const img = SPRITE_CACHE[spriteId];

        if (img) {
            const scale = 2;
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const dx = sx - (drawW / 2);
            const dy = (sy + TILE_H / 2) - drawH + 4;
            ctx.drawImage(img, dx, dy, drawW, drawH);
        } else {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(sx, sy + 16, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHighlight(chunk, tileList, color = 'rgba(0, 0, 255, 0.4)') {
        const ctx = this.ctx;
        ctx.fillStyle = color;

        for (let t of tileList) {
            const i = chunk.getIndex(t.x, t.y);
            const h = chunk.heightMap[i];
            const scr = isoToScreen(t.x, t.y, h, this.camX, this.camY);

            ctx.beginPath();
            ctx.moveTo(scr.x, scr.y);
            ctx.lineTo(scr.x + TILE_W / 2, scr.y + TILE_H / 2);
            ctx.lineTo(scr.x, scr.y + TILE_H);
            ctx.lineTo(scr.x - TILE_W / 2, scr.y + TILE_H / 2);
            ctx.closePath();
            ctx.fill();
        }
    }
}
