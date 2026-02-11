export class CombatOverlay {
    constructor(turnManager) {
        this.tm = turnManager;
        this.root = document.getElementById('ui-layer');
        this.menu = null;

        // Listen to Turn Manager
        this.tm.onTurnStart = (unitId) => this.showActionMenu(unitId);

        // Callbacks to be set by Main
        this.onMoveClicked = null;
        this.onActClicked = null; // General Act menu
        this.onAttackClicked = null; // Specific Attack action
        this.onWaitClicked = null;
    }

    showActionMenu(unitId) {
        if (this.menu) this.menu.remove();

        this.menu = document.createElement('div');
        this.menu.className = 'action-menu glass-panel ui-interactive';
        Object.assign(this.menu.style, {
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        });

        const title = document.createElement('div');
        title.innerText = `Unit ${unitId}`;
        title.style.color = '#c5a059';
        this.menu.appendChild(title);

        this.createButton('MOVE', () => this.onMoveClicked && this.onMoveClicked(unitId));
        this.createButton('ACT', () => this.showActSubMenu(unitId));
        this.createButton('WAIT', () => this.onWaitClicked && this.onWaitClicked(unitId));

        this.root.appendChild(this.menu);
    }

    showActSubMenu(unitId) {
        // Clear buttons, show skills
        // Simplified: Just show "ATTACK"
        this.menu.innerHTML = '';

        const title = document.createElement('div');
        title.innerText = `Actions`;
        title.style.color = '#c5a059';
        this.menu.appendChild(title);

        this.createButton('ATTACK', () => {
             // Close menu to allow selection
             this.menu.remove();
             this.menu = null;
             if (this.onAttackClicked) this.onAttackClicked(unitId);
        });

        this.createButton('BACK', () => this.showActionMenu(unitId));
    }

    createButton(text, callback) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'ui-interactive';
        Object.assign(btn.style, {
            padding: '12px 24px',
            background: 'rgba(50, 0, 0, 0.9)',
            border: '1px solid #8a0303',
            color: '#e0e0e0',
            fontSize: '16px',
            fontFamily: 'monospace',
            cursor: 'pointer'
        });
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); callback(); });
        btn.addEventListener('click', (e) => callback());
        this.menu.appendChild(btn);
    }

    showFloatingText(x, y, text, color = 'white') {
        const el = document.createElement('div');
        el.innerText = text;
        Object.assign(el.style, {
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            color: color,
            fontSize: '20px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            textShadow: '1px 1px 0 #000',
            transition: 'top 1s, opacity 1s'
        });
        this.root.appendChild(el);

        // Animate
        requestAnimationFrame(() => {
            el.style.top = `${y - 50}px`;
            el.style.opacity = '0';
        });

        setTimeout(() => el.remove(), 1000);
    }
}
