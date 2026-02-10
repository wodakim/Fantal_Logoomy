import { screenToIso } from '../math/Isometric.js';
import { TILE_W, TILE_H } from './Constants.js';

export class InputSystem {
    constructor(renderer) {
        this.renderer = renderer; // Need renderer for camera/scaling
        this.canvas = renderer.canvas;

        // State
        this.activeTouch = null;
        this.lastTapTime = 0;
        this.longPressTimer = null;

        // Output events
        this.onTap = null;        // (x, y) - Grid coordinates
        this.onDoubleTap = null;  // (x, y)
        this.onLongPress = null;  // (x, y)
        this.onPan = null;        // (dx, dy) - Screen pixels

        this._initListeners();
    }

    _initListeners() {
        const c = this.canvas;

        // Touch Events
        c.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });
        c.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
        c.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: false });

        // Mouse fallback (for testing)
        c.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        c.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        c.addEventListener('mouseup', (e) => this._handleMouseUp(e));
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
                moved: false
            };

            // Start Long Press Timer (e.g., 500ms)
            this.longPressTimer = setTimeout(() => {
                if (this.activeTouch && !this.activeTouch.moved) {
                     this._triggerAction('LONG_PRESS', this.activeTouch.startX, this.activeTouch.startY);
                     this.activeTouch.suppressTap = true; // Don't trigger tap on release
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

            // Trigger Pan
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
                // Double Tap
                this._triggerAction('DOUBLE_TAP', this.activeTouch.startX, this.activeTouch.startY);
                this.lastTapTime = 0;
            } else {
                // Single Tap
                this._triggerAction('TAP', this.activeTouch.startX, this.activeTouch.startY);
                this.lastTapTime = now;
            }
        }

        this.activeTouch = null;
    }

    // Mouse Fallbacks (simplified)
    _handleMouseDown(e) {
        this._handleTouchStart({
            preventDefault: () => {},
            touches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }]
        });
    }
    _handleMouseMove(e) {
        if (!this.activeTouch) return;
        this._handleTouchMove({
            preventDefault: () => {},
            changedTouches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }]
        });
    }
    _handleMouseUp(e) {
        this._handleTouchEnd({ preventDefault: () => {} });
    }

    _triggerAction(type, sx, sy) {
        // Convert screen coords to Iso Grid
        const iso = screenToIso(sx, sy, this.renderer.camX, this.renderer.camY);

        if (type === 'TAP' && this.onTap) this.onTap(iso);
        if (type === 'DOUBLE_TAP' && this.onDoubleTap) this.onDoubleTap(iso);
        if (type === 'LONG_PRESS' && this.onLongPress) this.onLongPress(iso);

        console.log(`Input Action: ${type} at Screen(${sx}, ${sy}) -> Iso(${iso.x}, ${iso.y})`);
    }
}
