import { screenToIso, pickTile } from '../math/Isometric.js';
import { TILE_W, TILE_H } from './Constants.js';

export class InputSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.canvas = renderer.canvas;
        this.activeTouch = null;
        this.lastTapTime = 0;
        this.longPressTimer = null;

        this.onTap = null;
        this.onDoubleTap = null;
        this.onLongPress = null;
        this.onPan = null;

        // Optional: Reference to Chunk for height-aware picking
        // Since InputSystem is core, we might need to pass chunk in picking
        this.currentChunk = null; // To be set by Main

        this._initListeners();
    }

    // ... (Existing Listener Code Omitted for brevity, assuming it works well) ...
    // Wait, I need to ensure the full class is preserved.
    // I will rewrite the listeners to be safe.

    _initListeners() {
        const c = this.canvas;
        c.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });
        c.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
        c.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: false });
        c.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        c.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        c.addEventListener('mouseup', (e) => this._handleMouseUp(e));

        // Prevent context menu on right click
        c.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const t = e.touches[0];
            this.activeTouch = {
                id: t.identifier,
                startX: t.clientX,
                startY: t.clientY,
                curX: t.clientX,
                curY: t.clientY,
                startTime: performance.now(),
                moved: false,
                suppressTap: false
            };
            this.longPressTimer = setTimeout(() => {
                if (this.activeTouch && !this.activeTouch.moved) {
                     this._triggerAction('LONG_PRESS', this.activeTouch.startX, this.activeTouch.startY);
                     this.activeTouch.suppressTap = true;
                }
            }, 500);
        }
    }

    _handleTouchMove(e) {
        e.preventDefault();
        if (!this.activeTouch) return;
        const t = e.changedTouches[0];
        if (t.identifier !== this.activeTouch.id) return;

        const dx = t.clientX - this.activeTouch.curX;
        const dy = t.clientY - this.activeTouch.curY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            this.activeTouch.moved = true;
            clearTimeout(this.longPressTimer);
            if (this.onPan) this.onPan(dx, dy);
        }
        this.activeTouch.curX = t.clientX;
        this.activeTouch.curY = t.clientY;
    }

    _handleTouchEnd(e) {
        e.preventDefault();
        if (!this.activeTouch) return;
        clearTimeout(this.longPressTimer);

        if (!this.activeTouch.moved && !this.activeTouch.suppressTap) {
            const now = performance.now();
            if (now - this.lastTapTime < 300) {
                this._triggerAction('DOUBLE_TAP', this.activeTouch.startX, this.activeTouch.startY);
                this.lastTapTime = 0;
            } else {
                this._triggerAction('TAP', this.activeTouch.startX, this.activeTouch.startY);
                this.lastTapTime = now;
            }
        }
        this.activeTouch = null;
    }

    _handleMouseDown(e) {
        this._handleTouchStart({ preventDefault: ()=>{}, touches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }] });
    }
    _handleMouseMove(e) {
        if (!this.activeTouch) return;
        this._handleTouchMove({ preventDefault: ()=>{}, changedTouches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }] });
    }
    _handleMouseUp(e) {
        this._handleTouchEnd({ preventDefault: ()=>{} });
    }

    _triggerAction(type, sx, sy) {
        let iso;
        if (this.currentChunk) {
            // Use precise picking if chunk is available
            iso = pickTile(sx, sy, this.renderer.camX, this.renderer.camY, this.currentChunk);
        } else {
            // Fallback to flat plane
            iso = screenToIso(sx, sy, this.renderer.camX, this.renderer.camY);
        }

        if (type === 'TAP' && this.onTap) this.onTap(iso);
        if (type === 'DOUBLE_TAP' && this.onDoubleTap) this.onDoubleTap(iso);
        if (type === 'LONG_PRESS' && this.onLongPress) this.onLongPress(iso);

        console.log(`Input Action: ${type} at Screen(${sx}, ${sy}) -> Iso(${iso.x}, ${iso.y})`);
    }
}
