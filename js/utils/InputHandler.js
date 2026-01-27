// src/utils/InputHandler.js
export class InputHandler {
    constructor() {
        this.keys = {};
        this.isMining = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMining = true;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMining = false;
        });
    }

    getKeyState(code) {
        return this.keys[code] || false;
    }
}