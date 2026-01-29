export class MobileControls {
    constructor(inputHandler) {
        this.inputHandler = inputHandler;
        this.isMobile = this.detectMobile();
        
        if (this.isMobile) {
            this.setupJoystick();
            this.setupActionButtons();
            this.setupTouchRotation();
        }
        
        this.joystickActive = false;
        this.joystickDirection = { x: 0, y: 0 };
        this.rotationStartX = 0;
        this.rotationDelta = 0;
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.innerWidth <= 768;
    }

    setupJoystick() {
        const base = document.getElementById('joystick-base');
        const stick = document.getElementById('joystick-stick');
        
        if (!base || !stick) return;

        const handleStart = (e) => {
            e.preventDefault();
            this.joystickActive = true;
        };

        const handleMove = (e) => {
            if (!this.joystickActive) return;
            e.preventDefault();

            const touch = e.touches?.[0] || e;
            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            let deltaX = touch.clientX - centerX;
            let deltaY = touch.clientY - centerY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = rect.width / 2 - 25;
            
            if (distance > maxDistance) {
                const angle = Math.atan2(deltaY, deltaX);
                deltaX = Math.cos(angle) * maxDistance;
                deltaY = Math.sin(angle) * maxDistance;
            }
            
            stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
            
            this.joystickDirection.x = deltaX / maxDistance;
            this.joystickDirection.y = deltaY / maxDistance;
            
            // Simular teclas
            this.inputHandler.keys['KeyW'] = this.joystickDirection.y < -0.3;
            this.inputHandler.keys['KeyS'] = this.joystickDirection.y > 0.3;
            this.inputHandler.keys['KeyA'] = this.joystickDirection.x < -0.3;
            this.inputHandler.keys['KeyD'] = this.joystickDirection.x > 0.3;
        };

        const handleEnd = (e) => {
            e.preventDefault();
            this.joystickActive = false;
            stick.style.transform = 'translate(-50%, -50%)';
            this.joystickDirection = { x: 0, y: 0 };
            
            this.inputHandler.keys['KeyW'] = false;
            this.inputHandler.keys['KeyS'] = false;
            this.inputHandler.keys['KeyA'] = false;
            this.inputHandler.keys['KeyD'] = false;
        };

        base.addEventListener('touchstart', handleStart);
        base.addEventListener('touchmove', handleMove);
        base.addEventListener('touchend', handleEnd);
        
        base.addEventListener('mousedown', handleStart);
        base.addEventListener('mousemove', handleMove);
        base.addEventListener('mouseup', handleEnd);
    }

    setupActionButtons() {
        const jumpBtn = document.getElementById('jump-btn');
        const actionBtn = document.getElementById('action-btn');

        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.inputHandler.keys['Space'] = true;
            });
            jumpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.inputHandler.keys['Space'] = false;
            });
        }

        if (actionBtn) {
            actionBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.inputHandler.buildMode) {
                    this.inputHandler.onPlaceBlock?.();
                } else {
                    this.inputHandler.isMining = true;
                }
            });
            actionBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.inputHandler.isMining = false;
            });
        }
    }

    setupTouchRotation() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        let rotationTouchId = null;

        canvas.addEventListener('touchstart', (e) => {
            for (let touch of e.changedTouches) {
                // Usar apenas toques na metade direita da tela para rotação
                if (touch.clientX > window.innerWidth / 2) {
                    rotationTouchId = touch.identifier;
                    this.rotationStartX = touch.clientX;
                    break;
                }
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            for (let touch of e.changedTouches) {
                if (touch.identifier === rotationTouchId) {
                    const deltaX = touch.clientX - this.rotationStartX;
                    this.rotationDelta = deltaX * 0.01;
                    this.rotationStartX = touch.clientX;
                    break;
                }
            }
        });

        canvas.addEventListener('touchend', (e) => {
            for (let touch of e.changedTouches) {
                if (touch.identifier === rotationTouchId) {
                    rotationTouchId = null;
                    this.rotationDelta = 0;
                    break;
                }
            }
        });
    }

    getRotationDelta() {
        const delta = this.rotationDelta;
        this.rotationDelta *= 0.9; // Suavizar
        return delta;
    }
}