export class MainMenu {
    constructor(saveSystem, spriteGenerator) {
        this.saveSystem = saveSystem;
        this.spriteGenerator = spriteGenerator;
        this.root = document.getElementById('ui-layer');
        this.onPlay = null;
        this.onLoad = null;
        this.onDeleteSave = null;
        this.onSkinSelected = null;

        this.state = {
            selectedSkin: '#3498db',
            audioEnabled: true,
            quality: 'HIGH'
        };

        this.el = document.createElement('div');
        this.el.className = 'main-menu ui-interactive';
        this.el.innerHTML = this._render();
        this.root.appendChild(this.el);

        this._bind();
        this._renderSaveState();
        this._renderSkinPreview();
    }

    _render() {
        return `
            <div class="menu-shell glass-panel">
                <div class="menu-title-wrap">
                    <h1 class="menu-title">VERMILION</h1>
                    <p class="menu-subtitle">Chroniques Tactiques d'Ivalice Noire</p>
                </div>

                <nav class="menu-tabs" aria-label="main menu tabs">
                    <button data-tab="play" class="menu-tab active">PLAY</button>
                    <button data-tab="settings" class="menu-tab">PARAMÈTRES</button>
                    <button data-tab="save" class="menu-tab">SAUVEGARDE</button>
                    <button data-tab="shop" class="menu-tab">SHOP / SKIN</button>
                </nav>

                <section class="menu-panel active" data-panel="play">
                    <button class="menu-btn" data-action="new-run">NOUVELLE PARTIE</button>
                    <button class="menu-btn" data-action="continue-run">CONTINUER</button>
                    <p class="menu-hint">Choisis un skin puis lance la partie.</p>
                </section>

                <section class="menu-panel" data-panel="settings">
                    <div class="menu-row">
                        <span>AUDIO</span>
                        <button class="menu-btn small" data-action="toggle-audio">ON</button>
                    </div>
                    <div class="menu-row">
                        <span>QUALITÉ</span>
                        <button class="menu-btn small" data-action="toggle-quality">HIGH</button>
                    </div>
                    <p class="menu-hint">Paramètres orientés mobile & performance.</p>
                </section>

                <section class="menu-panel" data-panel="save">
                    <div class="menu-save-state" data-save-state>Aucune sauvegarde</div>
                    <button class="menu-btn" data-action="load-save">CHARGER SAUVEGARDE</button>
                    <button class="menu-btn danger" data-action="delete-save">SUPPRIMER SAUVEGARDE</button>
                </section>

                <section class="menu-panel" data-panel="shop">
                    <div class="skin-preview" data-skin-preview>
                        <canvas width="64" height="64" data-skin-canvas></canvas>
                    </div>
                    <div class="skin-grid">
                        <button class="skin-chip" data-skin="#3498db" style="background:#3498db"></button>
                        <button class="skin-chip" data-skin="#2ecc71" style="background:#2ecc71"></button>
                        <button class="skin-chip" data-skin="#9b59b6" style="background:#9b59b6"></button>
                        <button class="skin-chip" data-skin="#f1c40f" style="background:#f1c40f"></button>
                        <button class="skin-chip" data-skin="#e67e22" style="background:#e67e22"></button>
                        <button class="skin-chip" data-skin="#ecf0f1" style="background:#ecf0f1"></button>
                    </div>
                    <button class="menu-btn" data-action="apply-skin">APPLIQUER SKIN</button>
                </section>
            </div>
        `;
    }

    _bind() {
        this.el.querySelectorAll('[data-tab]').forEach((btn) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._activateTab(btn.dataset.tab);
            });
            btn.addEventListener('click', () => this._activateTab(btn.dataset.tab));
        });

        this.el.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._handleAction(btn.dataset.action, btn);
            });
            btn.addEventListener('click', () => this._handleAction(btn.dataset.action, btn));
        });

        this.el.querySelectorAll('[data-skin]').forEach((btn) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._selectSkin(btn.dataset.skin);
            });
            btn.addEventListener('click', () => this._selectSkin(btn.dataset.skin));
        });
    }

    _activateTab(tab) {
        this.el.querySelectorAll('[data-tab]').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
        this.el.querySelectorAll('[data-panel]').forEach((el) => el.classList.toggle('active', el.dataset.panel === tab));
    }

    _handleAction(action, btn) {
        if (action === 'new-run' && this.onPlay) this.onPlay(this.state.selectedSkin);
        if (action === 'continue-run' && this.onLoad) this.onLoad(this.state.selectedSkin);
        if (action === 'load-save' && this.onLoad) this.onLoad(this.state.selectedSkin);
        if (action === 'delete-save') {
            this.saveSystem.clear();
            this._renderSaveState();
            if (this.onDeleteSave) this.onDeleteSave();
        }
        if (action === 'toggle-audio') {
            this.state.audioEnabled = !this.state.audioEnabled;
            btn.textContent = this.state.audioEnabled ? 'ON' : 'OFF';
        }
        if (action === 'toggle-quality') {
            this.state.quality = this.state.quality === 'HIGH' ? 'LOW' : 'HIGH';
            btn.textContent = this.state.quality;
        }
        if (action === 'apply-skin' && this.onSkinSelected) {
            this.onSkinSelected(this.state.selectedSkin);
        }
    }

    _selectSkin(color) {
        this.state.selectedSkin = color;
        this.el.querySelectorAll('[data-skin]').forEach((el) => {
            el.classList.toggle('active', el.dataset.skin === color);
        });
        this._renderSkinPreview();
    }

    async _renderSkinPreview() {
        const canvas = this.el.querySelector('[data-skin-canvas]');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bmp = await this.spriteGenerator.generateSprite(321, { color: this.state.selectedSkin });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bmp, 0, 0, 64, 64);
    }

    _renderSaveState() {
        const save = this.saveSystem.load();
        const node = this.el.querySelector('[data-save-state]');
        if (!save) {
            node.textContent = 'Aucune sauvegarde disponible';
            return;
        }
        const dt = new Date(save.timestamp || Date.now());
        node.textContent = `Save trouvée: ${dt.toLocaleString()}`;
    }

    hide() {
        this.el.style.display = 'none';
    }
}
