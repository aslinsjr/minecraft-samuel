export class MobileControls {
    constructor(inputHandler) {
        this.inputHandler = inputHandler;
        this.isMobile = this.detectMobile();
        this.fullscreenEnabled = false;
        this.gameStarted = false;
        
        if (this.isMobile) {
            this.showStartScreen();
        } else {
            this.gameStarted = true;
        }
        
        // Botão de toggle para testes em desktop
        this.setupMobileToggle();
        
        this.joystickActive = false;
        this.joystickDirection = { x: 0, y: 0 };
        this.rotationStartX = 0;
        this.rotationDelta = 0;
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.innerWidth <= 768;
    }

    activateMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.classList.add('active');
        }
        
        // Esconder dicas de teclado
        const slotHint = document.getElementById('slot-hint');
        if (slotHint) {
            slotHint.style.display = 'none';
        }
    }

    showStartScreen() {
        const startScreen = document.getElementById('mobile-start-screen');
        if (!startScreen) return;

        startScreen.classList.add('show');

        const fullscreenBtn = document.getElementById('start-fullscreen-btn');
        const normalBtn = document.getElementById('start-normal-btn');

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', async () => {
                await this.enterFullscreen();
                this.startGame();
            });
        }

        if (normalBtn) {
            normalBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
    }

    startGame() {
        const startScreen = document.getElementById('mobile-start-screen');
        if (startScreen) {
            startScreen.classList.remove('show');
        }

        this.gameStarted = true;
        this.activateMobileControls();
        this.setupJoystick();
        this.setupActionButtons();
        this.setupTouchRotation();
        this.setupOrientationHandler();
    }

    async enterFullscreen() {
        try {
            const elem = document.documentElement;
            
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) { // Safari
                await elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) { // Firefox
                await elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) { // IE/Edge
                await elem.msRequestFullscreen();
            }
            
            this.fullscreenEnabled = true;
            
            // Lock orientation to landscape se disponível
            if (screen.orientation && screen.orientation.lock) {
                try {
                    await screen.orientation.lock('landscape');
                } catch (e) {
                    console.log('Orientation lock não disponível:', e);
                }
            }
        } catch (err) {
            console.error('Erro ao entrar em fullscreen:', err);
        }
    }

    exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            
            this.fullscreenEnabled = false;
        } catch (err) {
            console.error('Erro ao sair do fullscreen:', err);
        }
    }

    setupOrientationHandler() {
        // Detectar mudança de orientação
        const handleOrientationChange = async () => {
            if (!this.gameStarted) return;

            const isLandscape = window.matchMedia("(orientation: landscape)").matches;
            
            if (isLandscape && this.isMobile && !this.fullscreenEnabled) {
                // Tentar entrar em fullscreen automaticamente
                await this.enterFullscreen();
            }
        };

        // Usar API moderna de orientação se disponível
        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleOrientationChange);
        } else {
            // Fallback para eventos antigos
            window.addEventListener('orientationchange', handleOrientationChange);
        }

        // Também escutar resize
        window.addEventListener('resize', handleOrientationChange);

        // Listener para sair do fullscreen
        document.addEventListener('fullscreenchange', () => {
            this.fullscreenEnabled = !!document.fullscreenElement;
        });
        
        document.addEventListener('webkitfullscreenchange', () => {
            this.fullscreenEnabled = !!document.webkitFullscreenElement;
        });
    }

    setupMobileToggle() {
        const toggleBtn = document.getElementById('mobile-toggle');
        if (!toggleBtn) return;

        // Mostrar botão apenas em desktop para testes
        if (!this.isMobile && window.innerWidth > 768) {
            toggleBtn.style.display = 'block';
            
            toggleBtn.addEventListener('click', () => {
                const mobileControls = document.getElementById('mobile-controls');
                const slotHint = document.getElementById('slot-hint');
                
                if (mobileControls.classList.contains('active')) {
                    mobileControls.classList.remove('active');
                    if (slotHint) slotHint.style.display = 'block';
                    toggleBtn.classList.remove('active');
                    this.isMobile = false;
                } else {
                    mobileControls.classList.add('active');
                    if (slotHint) slotHint.style.display = 'none';
                    toggleBtn.classList.add('active');
                    this.isMobile = true;
                    
                    // Inicializar controles se ainda não foram
                    if (!this.joystickInitialized) {
                        this.setupJoystick();
                        this.setupActionButtons();
                        this.setupTouchRotation();
                        this.joystickInitialized = true;
                    }
                }
            });
        }
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

    isGameStarted() {
        return this.gameStarted;
    }
}