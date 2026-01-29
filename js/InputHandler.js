export class InputHandler {
    constructor() {
        this.keys = {};
        this.isMining = false;
        this.buildMode = false;
        this.mouseDown = false;
        
        this.setupKeyboardEvents();
        this.setupMouseEvents();
    }

    setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Digit1') {
                this.onSlotSelect?.(1);
            }
            if (e.code === 'Digit2') {
                this.onSlotSelect?.(2);
            }
            if (e.code === 'KeyB') {
                this.toggleBuildMode();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupMouseEvents() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouseDown = true;
                if (this.buildMode) {
                    this.onPlaceBlock?.();
                } else {
                    this.isMining = true;
                }
            }
        });

        window.addEventListener('mouseup', () => {
            this.mouseDown = false;
            this.isMining = false;
        });
    }

    toggleBuildMode() {
        this.buildMode = !this.buildMode;
        this.onModeChange?.(this.buildMode ? 'building' : 'mining');
    }

    isMoving() {
        return this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'];
    }

    isJumping() {
        return this.keys['Space'];
    }

    getRotationInput() {
        let rotation = 0;
        if (this.keys['KeyA']) rotation += 0.05;
        if (this.keys['KeyD']) rotation -= 0.05;
        return rotation;
    }

    getForwardInput() {
        if (this.keys['KeyW']) return -0.1;
        if (this.keys['KeyS']) return 0.1;
        return 0;
    }
}