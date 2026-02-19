export class HubOverlay {
    constructor() {
        this.root = document.getElementById('ui-layer');
        this.panel = document.createElement('div');
        this.panel.className = 'hub-overlay glass-panel ui-interactive';
        this.panel.style.display = 'none';
        this.root.appendChild(this.panel);
        this.onAction = null;
    }

    show(title, text, actions = []) {
        this.panel.innerHTML = `
            <div class="hub-title">${title}</div>
            <div class="hub-text">${text}</div>
            <div class="hub-actions"></div>
        `;
        const actionsNode = this.panel.querySelector('.hub-actions');

        actions.forEach((a) => {
            const btn = document.createElement('button');
            btn.className = 'hub-btn';
            btn.textContent = a.label;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.onAction) this.onAction(a.id);
            });
            btn.addEventListener('click', () => {
                if (this.onAction) this.onAction(a.id);
            });
            actionsNode.appendChild(btn);
        });

        this.panel.style.display = 'grid';
    }

    hide() {
        this.panel.style.display = 'none';
    }
}
