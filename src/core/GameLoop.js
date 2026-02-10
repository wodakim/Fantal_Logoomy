import { CONFIG } from './Constants.js';

export class GameLoop {
    constructor(updateFn, renderFn) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;
        this.lastTime = 0;
        this.accumulator = 0;
        this.step = 1 / 60; // 60 FPS fixed step
        this.running = false;
        this.rafId = null;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    loop(timestamp) {
        if (!this.running) return;

        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap dt to avoid spiral of death
        if (dt > 0.25) dt = 0.25;

        this.accumulator += dt;

        while (this.accumulator >= this.step) {
            this.updateFn(this.step);
            this.accumulator -= this.step;
        }

        this.renderFn(dt); // Pass interpolation factor if needed

        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }
}
