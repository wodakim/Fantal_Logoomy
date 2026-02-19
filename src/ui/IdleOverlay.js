export class IdleOverlay {
    constructor(idleSystem) {
        this.idle = idleSystem;
        this.root = document.getElementById('ui-layer');
        this.panel = document.createElement('div');
        this.panel.className = 'idle-overlay glass-panel ui-interactive';
        this.panel.style.display = 'none';
        this.root.appendChild(this.panel);

        this.interval = null;
        this.onClose = null;
    }

    show() {
        this.render();
        this.panel.style.display = 'grid';
        this.interval = setInterval(() => this.render(), 1000);
    }

    hide() {
        this.panel.style.display = 'none';
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        if (this.onClose) this.onClose();
    }

    render() {
        const st = this.idle.getState();
        this.panel.innerHTML = `
            <div class="idle-title">Zone IDLE - Récolte Passive</div>
            <div class="idle-sub">Les métiers progressent même quand tu n'es pas en combat.</div>
            <div class="idle-grid">
                ${this._line('Bois', st.resources.wood, st.jobs.lumber.level, st.jobs.lumber.xp, st.jobs.lumber.xpNeed)}
                ${this._line('Pierre', st.resources.stone, st.jobs.mining.level, st.jobs.mining.xp, st.jobs.mining.xpNeed)}
                ${this._line('Herbes', st.resources.herb, st.jobs.herbalism.level, st.jobs.herbalism.xp, st.jobs.herbalism.xpNeed)}
                ${this._line('Insectes', st.resources.insect, st.jobs.entomology.level, st.jobs.entomology.xp, st.jobs.entomology.xpNeed)}
            </div>
            <div class="idle-actions">
                <button data-idle-action="close">FERMER</button>
            </div>
        `;

        const closeBtn = this.panel.querySelector('[data-idle-action="close"]');
        closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.hide(); });
        closeBtn.addEventListener('click', () => this.hide());
    }

    _line(name, amount, level, xp, xpNeed) {
        const pct = Math.min(100, Math.floor((xp / Math.max(1, xpNeed)) * 100));
        return `
            <div class="idle-row">
                <div class="idle-row-head">
                    <span>${name}</span>
                    <span>Lv.${level} · ${amount}</span>
                </div>
                <div class="idle-bar"><div class="idle-fill" style="width:${pct}%"></div></div>
            </div>
        `;
    }
}
