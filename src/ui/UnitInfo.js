export class UnitInfo {
    constructor() {
        this.root = document.getElementById('ui-layer');
        this.panel = document.createElement('div');
        this.panel.className = 'unit-info glass-panel';

        // CSS
        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '400px',
            padding: '10px',
            display: 'none', // Hidden by default
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 20
        });

        this.content = document.createElement('div');
        this.panel.appendChild(this.content);
        this.root.appendChild(this.panel);
    }

    show(unitId, stats, jobName = "Unknown") {
        this.panel.style.display = 'flex';

        const hpPct = (stats.hp[unitId] / stats.maxHp[unitId]) * 100 || 0; // Prevent NaN
        const ctPct = stats.ct[unitId]; // 0-100

        this.content.innerHTML = `
            <div style="font-weight:bold; color:#c5a059;">UNIT ${unitId} <span style="font-size:0.8em; color:#aaa;">${jobName}</span></div>
            <div style="display:flex; gap:10px; width:100%; margin-top:5px;">
                <div style="flex:1;">
                    <div style="font-size:10px;">HP ${stats.hp[unitId]}</div>
                    <div style="height:4px; background:#333; width:100%;">
                        <div style="height:100%; background:#e74c3c; width:${hpPct}%;"></div>
                    </div>
                </div>
                <div style="flex:1;">
                    <div style="font-size:10px;">CT ${stats.ct[unitId]}</div>
                    <div style="height:4px; background:#333; width:100%;">
                        <div style="height:100%; background:#f1c40f; width:${ctPct}%;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    hide() {
        this.panel.style.display = 'none';
    }
}
