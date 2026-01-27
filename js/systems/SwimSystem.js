// src/systems/SwimSystem.js
export class SwimSystem {
    constructor(maxTime) {
        this.SWIM_MAX_TIME = maxTime;
        this.isSwimming = false;
        this.isInWater = false;
        this.swimTimer = 0;
        this.swimStamina = maxTime;
        this.lastSwimUpdate = 0;
        this.waterSurfaceHeight = -0.5;
    }

    checkWaterCollision(player, world, keys) {
        const playerPos = player.group.position.clone();
        const playerFeetY = playerPos.y - 0.5;
        const playerHeadY = playerPos.y + 1.8;
        const currentTime = performance.now();
        
        this.isInWater = false;
        
        world.waterBlocks.forEach(water => {
            const waterY = water.position.y + 0.5;
            const distanceXZ = Math.sqrt(
                Math.pow(playerPos.x - water.position.x, 2) +
                Math.pow(playerPos.z - water.position.z, 2)
            );
            
            if (distanceXZ < 0.8) {
                if (playerFeetY < waterY && playerHeadY > water.position.y) {
                    this.isInWater = true;
                    
                    // Efeito de flutuação
                    if (playerPos.y < waterY - 0.3 && player.vVel) {
                        const buoyancy = 0.008;
                        player.vVel = Math.min(player.vVel + buoyancy, 0.05);
                    }
                    
                    // Aplicar resistência da água
                    if (player.vVel && Math.abs(player.vVel) > 0.01) {
                        player.vVel *= 0.95;
                    }
                    
                    // Atualizar stamina de natação
                    if (currentTime - this.lastSwimUpdate > 1000) {
                        if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
                            this.isSwimming = true;
                            const staminaCost = keys['ShiftLeft'] ? 0.2 : 0.1;
                            this.swimStamina = Math.max(0, this.swimStamina - staminaCost);
                            this.lastSwimUpdate = currentTime;
                        }
                    }
                }
            }
        });
        
        // Recuperar stamina fora da água
        if (!this.isInWater && this.isSwimming) {
            this.isSwimming = false;
            this.swimTimer = 0;
            if (currentTime - this.lastSwimUpdate > 1000) {
                this.swimStamina = Math.min(this.SWIM_MAX_TIME, this.swimStamina + 0.3);
                this.lastSwimUpdate = currentTime;
            }
        }
        
        // Afogamento
        if (this.swimStamina <= 0 && this.isSwimming) {
            player.vVel = -0.03;
            console.warn('⚠️ Stamina esgotada! O jogador está se afogando!');
        }
    }
}