export class CombatOverlay {
    constructor(turnManager) {
        this.tm = turnManager;
        this.root = document.getElementById('ui-layer');
        this.menu = null;

        this.tm.onTurnStart = (unitId) => this.showActionMenu(unitId);

        this.onMoveClicked = null;
        this.onAttackClicked = null; // Standard Attack
        this.onSkillClicked = null;  // New: Skill selected
        this.onWaitClicked = null;

        this.skillSystem = null; // To be linked
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
