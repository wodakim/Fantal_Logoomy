import { TILE_W, TILE_H, H_SCALE, PROP_ROCK, PROP_TREE, PROP_CORPSE, PROP_LOOT_BAG } from './Constants.js';
import { isoToScreen } from '../math/Isometric.js';
import { COMPONENT_TRANSFORM } from '../entities/components/Transform.js';
import { COMPONENT_SPRITE, SPRITE_CACHE } from '../entities/components/Sprite.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.width = 0;
        this.height = 0;

        this.camX = 0;
        this.camY = 0;
        this.targetCamX = 0;
        this.targetCamY = 0;

        this.time = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false;

        if (this.camX === 0) {
            this.camX = this.width / 2;
            this.camY = this.height / 4;
            this.targetCamX = this.camX;
            this.targetCamY = this.camY;
        }
    }

    shake(intensity, duration) {}

    updateCamera(dt) {
        this.time += dt;
        const speed = 5.0;
        this.camX += (this.targetCamX - this.camX) * speed * dt;
        this.camY += (this.targetCamY - this.camY) * speed * dt;
        return { x: this.camX, y: this.camY };
    }

    clear() {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#2c3a60');
        grad.addColorStop(0.35, '#18243c');
        grad.addColorStop(1, '#090d19');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    render(chunk, entityManager, dt) {
        const cam = this.updateCamera(dt);
        const size = chunk.size;

        const entities = [];
        const maxUnits = entityManager.activeMap.length;

        for (let id = 0; id < maxUnits; id++) {
            if (entityManager.activeMap[id] === 0) continue;
            if (COMPONENT_SPRITE.active[id]) {
                entities.push({
                    id,
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
                const obj = chunk.objIndex[i];
                const pos = isoToScreen(x, y, h, cam.x, cam.y);

                this.drawBlock(pos.x, pos.y, h, type);
                if (liquid > 0) this.drawFluid(pos.x, pos.y, liquid);
                if (obj > 0) this.drawProp(pos.x, pos.y, obj);

                for (let e of entities) {
                    if (e.x === x && e.y === y) {
                        const ePos = isoToScreen(e.x, e.y, e.z, cam.x, cam.y);
                        this.drawEntity(ePos.x, ePos.y, e.spriteId, e.id);
                    }
                }
            }
        }
    }

    drawBlock(sx, sy, h, type) {
        const ctx = this.ctx;
        const heightPx = Math.max(0, h * H_SCALE);

        let topA = '#8f8d86';
        let topB = '#6f6b63';
        let left = '#4d4a44';
        let right = '#3f3b35';

        if (type === 2) {
            topA = '#6f8bb6'; topB = '#4f698e'; left = '#334a68'; right = '#293e5a';
        }
        if (type === 3) {
            topA = '#c7b89c'; topB = '#a39278'; left = '#74664f'; right = '#635742';
        }

        // vertical faces
        if (heightPx > 0) {
            ctx.fillStyle = left;
            ctx.beginPath();
            ctx.moveTo(sx - TILE_W / 2, sy + TILE_H / 2);
            ctx.lineTo(sx, sy + TILE_H);
            ctx.lineTo(sx, sy + TILE_H + heightPx);
            ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2 + heightPx);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = right;
            ctx.beginPath();
            ctx.moveTo(sx + TILE_W / 2, sy + TILE_H / 2);
            ctx.lineTo(sx, sy + TILE_H);
            ctx.lineTo(sx, sy + TILE_H + heightPx);
            ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2 + heightPx);
            ctx.closePath();
            ctx.fill();
        }

        // top
        const grad = ctx.createLinearGradient(sx, sy, sx, sy + TILE_H);
        grad.addColorStop(0, topA);
        grad.addColorStop(1, topB);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
        ctx.lineTo(sx, sy + TILE_H);
        ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.stroke();
    }

    drawFluid(sx, sy, amount) {
        const ctx = this.ctx;
        const pulse = 0.65 + Math.sin(this.time * 2.5 + sx * 0.01 + sy * 0.01) * 0.2;
        const alpha = Math.min(0.95, (amount / 8) * pulse);

        ctx.fillStyle = `rgba(167, 28, 43, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 1);
        ctx.lineTo(sx + TILE_W / 2 - 2, sy + TILE_H / 2);
        ctx.lineTo(sx, sy + TILE_H - 2);
        ctx.lineTo(sx - TILE_W / 2 + 2, sy + TILE_H / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `rgba(250, 180, 180, ${Math.min(0.45, alpha)})`;
        ctx.stroke();
    }

    drawProp(sx, sy, type) {
        const ctx = this.ctx;
        const cx = sx;
        const cy = sy + TILE_H / 2;

        if (type === PROP_ROCK) {
            ctx.fillStyle = '#5f646b';
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy - 2);
            ctx.lineTo(cx - 6, cy - 20);
            ctx.lineTo(cx + 8, cy - 18);
            ctx.lineTo(cx + 12, cy - 4);
            ctx.lineTo(cx + 2, cy + 4);
            ctx.closePath();
            ctx.fill();
        } else if (type === PROP_TREE) {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(cx - 6, cy - 30, 12, 30);
            const leaf = ctx.createRadialGradient(cx, cy - 34, 3, cx, cy - 34, 18);
            leaf.addColorStop(0, '#66bb6a');
            leaf.addColorStop(1, '#1b5e20');
            ctx.fillStyle = leaf;
            ctx.beginPath();
            ctx.arc(cx, cy - 35, 16, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === PROP_CORPSE) {
            ctx.fillStyle = '#d9d9d9';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 3, 10, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(cx - 4, cy - 7, 2, 2);
            ctx.fillRect(cx + 2, cy - 7, 2, 2);
            ctx.fillStyle = 'rgba(138,3,3,0.55)';
            ctx.fillRect(cx - 8, cy + 1, 16, 3);
        } else if (type === PROP_LOOT_BAG) {
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 4, 11, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(cx - 2, cy - 12, 4, 5);
            ctx.fillRect(cx - 4, cy - 2, 8, 2);
        }
    }

    drawEntity(sx, sy, spriteId, entityId = 0) {
        const ctx = this.ctx;
        const img = SPRITE_CACHE[spriteId];
        const bob = Math.sin(this.time * 3 + entityId * 0.7) * 1.5;

        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + TILE_H / 2 + 8, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (img) {
            const scale = 2;
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const dx = sx - (drawW / 2);
            const dy = (sy + TILE_H / 2) - drawH + 4 + bob;

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 4;
            ctx.drawImage(img, dx, dy, drawW, drawH);
            ctx.restore();
        } else {
            ctx.fillStyle = '#f5f5f5';
            ctx.beginPath();
            ctx.arc(sx, sy + 16 + bob, 10, 0, Math.PI * 2);
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

            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.stroke();
        }
    }
}
