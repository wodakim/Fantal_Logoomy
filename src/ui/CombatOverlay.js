export class CombatOverlay {
    constructor(turnManager) {
        this.tm = turnManager;
        this.root = document.getElementById('ui-layer');
        this.menu = null;

        // Listen to Turn Manager
        this.tm.onTurnStart = (unitId) => this.showActionMenu(unitId);
    }

    showActionMenu(unitId) {
        // Clear existing
        if (this.menu) this.menu.remove();

        // Create Glass Panel
        this.menu = document.createElement('div');
        this.menu.className = 'action-menu glass-panel ui-interactive';

        // Style (should be in CSS, but inline for safety here)
        Object.assign(this.menu.style, {
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        });

        // Title
        const title = document.createElement('div');
        title.innerText = `Unit ${unitId} Active`;
        title.style.color = '#c5a059'; // Gold
        title.style.marginBottom = '5px';
        this.menu.appendChild(title);

        // Buttons
        this.createButton('MOVE', () => this.onMoveClicked(unitId));
        this.createButton('ACT', () => this.onActClicked(unitId));
        this.createButton('WAIT', () => this.onWaitClicked(unitId));

        this.root.appendChild(this.menu);
    }

    createButton(text, callback) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'ui-interactive'; // Allow clicks

        // Mobile friendly style
        Object.assign(btn.style, {
            padding: '12px 24px',
            background: 'rgba(50, 0, 0, 0.9)',
            border: '1px solid #8a0303',
            color: '#e0e0e0',
            fontSize: '16px',
            fontFamily: 'monospace',
            cursor: 'pointer'
        });

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            callback();
        });
        btn.addEventListener('click', (e) => callback()); // Fallback

        this.menu.appendChild(btn);
    }

    onMoveClicked(unitId) {
        console.log("Move clicked for", unitId);
        // Trigger move state in InputSystem?
    }

    onActClicked(unitId) {
        console.log("Act clicked for", unitId);
    }

    onWaitClicked(unitId) {
        console.log("Wait clicked for", unitId);
        this.menu.remove();
        this.menu = null;
        this.tm.endTurn(unitId);
    }
}
