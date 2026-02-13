export class VictoryOverlay {
    constructor() {
        this.root = document.getElementById('ui-layer');
        this.panel = null;
        this.onNextBattle = null;
    }

    show(result, lootList) {
        if (this.panel) this.panel.remove();

        this.panel = document.createElement('div');
        this.panel.className = 'victory-overlay glass-panel ui-interactive'; // Added ui-interactive

        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            zIndex: 200, // Increased Z-Index to be above everything
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid #c5a059',
            pointerEvents: 'auto' // Force pointer events
        });

        const title = document.createElement('h1');
        title.innerText = result === "VICTORY" ? "STAGE CLEAR" : "DEFEAT";
        title.style.color = result === "VICTORY" ? "#f1c40f" : "#e74c3c";
        title.style.fontSize = "24px";
        title.style.margin = "0";
        this.panel.appendChild(title);

        if (result === "VICTORY" && lootList && lootList.length > 0) {
            const lootTitle = document.createElement('div');
            lootTitle.innerText = "Loot Acquired:";
            lootTitle.style.color = "#aaa";
            this.panel.appendChild(lootTitle);

            const list = document.createElement('div');
            list.innerText = lootList.join(", ");
            list.style.color = "#fff";
            this.panel.appendChild(list);
        }

        const btn = document.createElement('button');
        btn.innerText = result === "VICTORY" ? "NEXT BATTLE" : "RETRY";
        btn.className = 'ui-interactive'; // Added ui-interactive
        Object.assign(btn.style, {
            padding: '10px 20px',
            fontSize: '18px',
            cursor: 'pointer',
            background: '#8a0303',
            color: 'white',
            border: 'none',
            marginTop: '10px',
            pointerEvents: 'auto'
        });

        // Use touchstart to bypass any canvas capture issues on mobile
        const handleAction = (e) => {
            if(e) e.stopPropagation();
            this.panel.remove();
            this.panel = null; // Clear reference
            if (this.onNextBattle) this.onNextBattle();
        };

        btn.addEventListener('touchstart', handleAction);
        btn.onclick = handleAction;

        this.panel.appendChild(btn);

        this.root.appendChild(this.panel);
    }
}
