export class UIManager {
    constructor() {
        this.root = document.getElementById('ui-layer');
        this.createVirtualDPad();
    }

    createVirtualDPad() {
        const dpad = document.createElement('div');
        dpad.className = 'ui-interactive';
        dpad.style.position = 'absolute';
        dpad.style.bottom = '20px';
        dpad.style.right = '20px';
        dpad.style.width = '120px';
        dpad.style.height = '120px';
        // dpad.style.background = 'rgba(255,0,0,0.2)'; // Debug

        // Add buttons...
        this.root.appendChild(dpad);
    }
}
