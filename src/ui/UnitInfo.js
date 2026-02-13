export class UnitInfo {
    constructor() {
        this.root = document.getElementById('ui-layer');
        this.panel = document.createElement('div');
        this.panel.className = 'unit-info glass-panel';

        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '400px',
            padding: '10px',
            display: 'none',
            flexDirection: 'column', // Changed to column for name on top
            alignItems: 'center',
            zIndex: 20
        });

        this.content = document.createElement('div');
        this.content.style.width = '100%';
        this.panel.appendChild(this.content);
        this.root.appendChild(this.panel);
    }

    show(unitId, stats, jobName = "Unknown") {
        this.panel.style.display = 'flex';

        const hpPct = (stats.hp[unitId] / stats.maxHp[unitId]) * 100 || 0;
        const ctPct = stats.ct[unitId];

        // Analyze Limbs
        const limbs = stats.limbs ? stats.limbs[unitId] : 0;
        let injuries = [];
        if (limbs & 1) injuries.push("L.ARM");
        if (limbs & 2) injuries.push("R.ARM");
        if (limbs & 4) injuries.push("LEGS");
        if (limbs & 8) injuries.push("HEAD");

        const injuryHtml = injuries.length > 0
            ? `<div style="color:#e74c3c; font-size:12px; margin-top:5px;">⚠️ CRITICAL: ${injuries.join(", ")}</div>`
            : "";

        this.content.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:5px;">
                <span style="font-weight:bold; color:#c5a059;">UNIT ${unitId}</span>
                <span style="font-size:0.9em; color:#aaa;">${jobName}</span>
            </div>
            <div style="display:flex; gap:10px; width:100%;">
                <div style="flex:1;">
                    <div style="font-size:10px; color:#ccc;">HP ${stats.hp[unitId]}</div>
                    <div style="height:6px; background:#333; width:100%; border-radius:2px; overflow:hidden;">
                        <div style="height:100%; background:#e74c3c; width:${hpPct}%;"></div>
                    </div>
                </div>
                <div style="flex:1;">
                    <div style="font-size:10px; color:#ccc;">CT ${stats.ct[unitId]}</div>
                    <div style="height:6px; background:#333; width:100%; border-radius:2px; overflow:hidden;">
                        <div style="height:100%; background:#f1c40f; width:${ctPct}%;"></div>
                    </div>
                </div>
            </div>
            ${injuryHtml}
        `;
    }

    hide() {
        this.panel.style.display = 'none';
    }
}
