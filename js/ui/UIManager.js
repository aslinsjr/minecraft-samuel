// src/ui/UIManager.js
export class UIManager {
    constructor() {
        this.createUI();
    }

    createUI() {
        this.createSwimStaminaUI();
    }

    createSwimStaminaUI() {
        const swimStaminaContainer = document.createElement('div');
        swimStaminaContainer.id = 'swim-stamina-container';
        swimStaminaContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 200px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            padding: 10px;
            display: none;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        const staminaLabel = document.createElement('div');
        staminaLabel.textContent = 'Stamina de Natação:';
        staminaLabel.style.marginBottom = '5px';
        staminaLabel.style.fontSize = '12px';
        
        const staminaBarContainer = document.createElement('div');
        staminaBarContainer.style.cssText = `
            width: 100%;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            overflow: hidden;
        `;
        
        const staminaBar = document.createElement('div');
        staminaBar.id = 'swim-stamina-bar';
        staminaBar.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, #3498db, #2ecc71);
            border-radius: 5px;
            transition: width 0.3s ease;
        `;
        
        const staminaText = document.createElement('div');
        staminaText.id = 'swim-stamina-text';
        staminaText.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
        `;
        
        staminaBar.appendChild(staminaText);
        staminaBarContainer.appendChild(staminaBar);
        swimStaminaContainer.appendChild(staminaLabel);
        swimStaminaContainer.appendChild(staminaBarContainer);
        
        const staminaWarning = document.createElement('div');
        staminaWarning.id = 'swim-stamina-warning';
        staminaWarning.style.cssText = `
            color: #e74c3c;
            font-size: 11px;
            margin-top: 5px;
            display: none;
            text-align: center;
        `;
        staminaWarning.textContent = '⚠️ Cuidado! Stamina baixa!';
        
        swimStaminaContainer.appendChild(staminaWarning);
        document.body.appendChild(swimStaminaContainer);
    }

    updateSwimStamina(currentStamina, maxStamina) {
        const container = document.getElementById('swim-stamina-container');
        const bar = document.getElementById('swim-stamina-bar');
        const text = document.getElementById('swim-stamina-text');
        const warning = document.getElementById('swim-stamina-warning');
        
        if (!container || !bar || !text) return;
        
        const percent = (currentStamina / maxStamina) * 100;
        bar.style.width = `${percent}%`;
        text.textContent = `${currentStamina.toFixed(1)}s / ${maxStamina}s`;
        
        if (percent > 50) {
            bar.style.background = 'linear-gradient(to right, #3498db, #2ecc71)';
        } else if (percent > 20) {
            bar.style.background = 'linear-gradient(to right, #f39c12, #e67e22)';
        } else {
            bar.style.background = 'linear-gradient(to right, #e74c3c, #c0392b)';
            warning.style.display = 'block';
        }
        
        if (percent > 20) {
            warning.style.display = 'none';
        }
    }

    toggleSwimStamina(show) {
        const container = document.getElementById('swim-stamina-container');
        if (container) {
            container.style.display = show ? 'block' : 'none';
        }
    }
}