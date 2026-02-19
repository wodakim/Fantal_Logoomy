export class DebugWindow {
    constructor() {
        this.root = document.getElementById('ui-layer');
        this.el = document.createElement('div');
        this.el.className = 'debug-window glass-panel ui-interactive';
        this.el.innerHTML = `
            <div class="debug-header" data-drag-handle>DEBUG PANEL</div>
            <button data-debug="kill">KILL ALL MONSTERS</button>
            <button data-debug="suicide">SUICIDE HERO</button>
            <button data-debug="money">INFINITE GOLD</button>
            <button data-debug="resources">MAX RESOURCES</button>
            <button data-debug="inventory">FULL INVENTORY</button>
            <button data-debug="idleboost">BOOST IDLE +500</button>
            <button data-debug="close">HIDE</button>
        `;

        this.root.appendChild(this.el);

        this.onCommand = null;
        this.drag = null;

        this.el.querySelectorAll('[data-debug]').forEach((btn) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._emit(btn.dataset.debug);
            });
            btn.addEventListener('click', () => this._emit(btn.dataset.debug));
        });

        const handle = this.el.querySelector('[data-drag-handle]');
        handle.addEventListener('touchstart', (e) => this._startDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        handle.addEventListener('mousedown', (e) => this._startDrag(e.clientX, e.clientY));

        window.addEventListener('touchmove', (e) => {
            if (!this.drag) return;
            this._moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('mousemove', (e) => this._moveDrag(e.clientX, e.clientY));
        window.addEventListener('touchend', () => this._endDrag());
        window.addEventListener('mouseup', () => this._endDrag());
    }

    _emit(cmd) {
        if (cmd === 'close') {
            this.hide();
            return;
        }
        if (this.onCommand) this.onCommand(cmd);
    }

    _startDrag(x, y) {
        const r = this.el.getBoundingClientRect();
        this.drag = { ox: x - r.left, oy: y - r.top };
    }

    _moveDrag(x, y) {
        if (!this.drag) return;
        const nx = Math.max(4, Math.min(window.innerWidth - this.el.offsetWidth - 4, x - this.drag.ox));
        const ny = Math.max(4, Math.min(window.innerHeight - this.el.offsetHeight - 4, y - this.drag.oy));
        this.el.style.left = `${nx}px`;
        this.el.style.top = `${ny}px`;
        this.el.style.right = 'auto';
        this.el.style.bottom = 'auto';
    }

    _endDrag() {
        this.drag = null;
    }

    show() { this.el.style.display = 'grid'; }
    hide() { this.el.style.display = 'none'; }
}
