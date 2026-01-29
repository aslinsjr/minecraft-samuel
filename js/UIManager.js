export class UIManager {
    constructor(player) {
        this.player = player;
        this.currentMode = 'mining';
        this.setupModeIndicators();
        this.setupSlotHandlers();
        this.updateInventoryDisplay();
    }

    setupModeIndicators() {
        const miningMode = document.getElementById('mining-mode');
        const buildingMode = document.getElementById('building-mode');

        if (miningMode) {
            miningMode.addEventListener('click', () => {
                this.switchMode('mining');
            });
        }

        if (buildingMode) {
            buildingMode.addEventListener('click', () => {
                this.switchMode('building');
            });
        }
    }

    switchMode(mode) {
        this.currentMode = mode;
        this.updateModeIndicator();
        this.onModeChange?.(mode);
    }

    updateModeIndicator() {
        const miningEl = document.getElementById('mining-mode');
        const buildingEl = document.getElementById('building-mode');
        
        if (miningEl && buildingEl) {
            if (this.currentMode === 'mining') {
                miningEl.classList.add('active');
                buildingEl.classList.remove('active');
            } else {
                buildingEl.classList.add('active');
                miningEl.classList.remove('active');
            }
        }
    }

    setupSlotHandlers() {
        const slots = document.querySelectorAll('.slot');
        slots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                const slotId = e.currentTarget.id;
                if (slotId === 'slot-1') {
                    this.selectSlot(1);
                } else if (slotId === 'slot-2') {
                    this.selectSlot(2);
                }
            });
        });
    }

    selectSlot(slotNumber) {
        this.player.selectSlot(slotNumber);
        
        document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
        const activeSlot = document.getElementById(`slot-${slotNumber}`);
        if (activeSlot) activeSlot.classList.add('selected');
    }

    updateInventoryDisplay() {
        const woodCount = document.getElementById('count-wood');
        const stoneCount = document.getElementById('count-stone');
        
        if (woodCount) woodCount.innerText = this.player.inventory.wood;
        if (stoneCount) stoneCount.innerText = this.player.inventory.stone;
    }

    showSaveIndicator() {
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 1000);
        }
    }

    showFeedback(message, duration = 1000) {
        // Criar elemento de feedback temporário
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 18px;
            z-index: 2000;
            pointer-events: none;
            animation: fadeInOut ${duration}ms ease;
        `;
        feedback.textContent = message;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, duration);
    }

    updateUsername(username) {
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = `Jogador: ${username}`;
        }
    }
}