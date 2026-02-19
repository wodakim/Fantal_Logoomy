export class CombatOverlay {
    constructor(turnManager) {
        this.tm = turnManager;
        this.root = document.getElementById('ui-layer');
        this.menu = null;
        this.turnPreview = document.createElement('div');
        this.turnPreview.className = 'turn-preview glass-panel';
        Object.assign(this.turnPreview.style, {
            position: 'absolute',
            top: '10px',
            left: '10px',
            minHeight: '48px',
            minWidth: '210px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 25
        });
        this.root.appendChild(this.turnPreview);

        this.onMoveClicked = null;
        this.onAttackClicked = null; // Standard Attack
        this.onSkillClicked = null;  // New: Skill selected
        this.onWaitClicked = null;
        this.onDevourClicked = null; // New: Cannibalize

        this.skillSystem = null; // To be linked
        this.renderTurnPreview();
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

        // Only show MOVE if unit hasn't moved yet
        if (this.tm.canMove()) {
            this.createButton('MOVE', () => this.onMoveClicked && this.onMoveClicked(unitId));
        }

        // Only show ACT if unit hasn't acted yet
        if (this.tm.canAct()) {
            this.createButton('ACT', () => this.showActSubMenu(unitId));
        }

        this.createButton('WAIT', () => this.onWaitClicked && this.onWaitClicked(unitId));

        this.root.appendChild(this.menu);
    }

    showActSubMenu(unitId) {
        this.menu.innerHTML = '';

        const title = document.createElement('div');
        title.innerText = `Actions`;
        title.style.color = '#c5a059';
        this.menu.appendChild(title);

        // Standard Attack
        this.createButton('ATTACK', () => {
             this.menu.remove();
             this.menu = null;
             if (this.onAttackClicked) this.onAttackClicked(unitId);
        });

        // DEVOUR (Contextual)
        // Check if there is a corpse nearby via TurnManager helper
        if (this.tm.checkForNearbyCorpse(unitId)) {
             this.createButton('DEVOUR', () => {
                 this.menu.remove();
                 this.menu = null;
                 if (this.onDevourClicked) this.onDevourClicked(unitId);
             }, '#8a0303'); // Red button for Gore action
        }

        // Job Skills
        if (this.skillSystem) {
            const skills = this.skillSystem.getUnitSkills(unitId);
            skills.forEach(skill => {
                this.createButton(skill.name.toUpperCase(), () => {
                    this.menu.remove();
                    this.menu = null;
                    if (this.onSkillClicked) this.onSkillClicked(unitId, skill);
                });
            });
        }

        this.createButton('BACK', () => this.showActionMenu(unitId));
    }

    renderTurnPreview(activeUnitId = -1) {
        const order = this.tm.getTurnPreview(5, 60);
        const chips = order.map((id, idx) => {
            const label = id === 0 ? 'HERO' : `EN${id}`;
            const active = (idx === 0 && id === activeUnitId);
            const color = id === 0 ? '#2ecc71' : '#e67e22';
            return `<div style="min-width:44px; min-height:44px; border:1px solid ${color}; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:11px; background:${active ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.35)'};">${label}</div>`;
        });

        this.turnPreview.innerHTML = `
            <div style="font-size:10px; color:#c5a059; margin-right:4px;">NEXT</div>
            ${chips.join('')}
        `;
    }

    createButton(text, callback, bgColor = 'rgba(50, 0, 0, 0.9)') {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'ui-interactive';
        Object.assign(btn.style, {
            padding: '12px 24px',
            background: bgColor,
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
            transition: 'top 1s, opacity 1s',
            zIndex: 100
        });
        this.root.appendChild(el);

        requestAnimationFrame(() => {
            el.style.top = `${y - 50}px`;
            el.style.opacity = '0';
        });

        setTimeout(() => el.remove(), 1000);
    }
}
