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
        this.drowningDamage = 0;
        this.waterDepth = 0;
        this.currentWaterBlock = null;
        this.splashCooldown = 0;
    }

    checkWaterCollision(player, world, keys) {
        const playerPos = player.group.position.clone();
        const playerFeetY = playerPos.y - 0.5;
        const playerHeadY = playerPos.y + 1.8;
        const playerWaistY = playerPos.y + 0.5;
        const currentTime = performance.now();
        
        const wasInWater = this.isInWater;
        this.isInWater = false;
        this.currentWaterBlock = null;
        let deepestWater = -Infinity;
        
        world.waterBlocks.forEach(water => {
            const waterY = water.position.y + 0.5;
            const distanceXZ = Math.sqrt(
                Math.pow(playerPos.x - water.position.x, 2) +
                Math.pow(playerPos.z - water.position.z, 2)
            );
            
            if (distanceXZ < 1.0) {
                if (playerFeetY < waterY && playerHeadY > water.position.y - 0.3) {
                    this.isInWater = true;
                    
                    if (waterY > deepestWater) {
                        deepestWater = waterY;
                        this.currentWaterBlock = water;
                    }
                    
                    // Calcular profundidade
                    this.waterDepth = Math.max(0, waterY - playerFeetY);
                    
                    // Efeito de splash ao entrar na água
                    if (!wasInWater && this.splashCooldown <= 0) {
                        this.createSplash(world.scene, playerPos);
                        this.splashCooldown = 1000;
                    }
                    
                    // Flutuação melhorada baseada na profundidade
                    const immersionLevel = Math.min(1, this.waterDepth / 2);
                    
                    if (playerWaistY < waterY) {
                        const buoyancy = 0.012 * immersionLevel;
                        if (player.vVel !== undefined) {
                            player.vVel = Math.min(player.vVel + buoyancy, 0.08);
                        }
                    }
                    
                    // Resistência da água
                    if (player.vVel !== undefined && Math.abs(player.vVel) > 0.01) {
                        player.vVel *= 0.92;
                    }
                    
                    // Determinar se está nadando (cabeça submersa ou movimento na água)
                    const isSubmerged = playerHeadY < waterY + 0.3;
                    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
                    
                    if ((isSubmerged || (isMoving && this.waterDepth > 0.5))) {
                        this.isSwimming = true;
                        
                        // Atualizar stamina
                        if (currentTime - this.lastSwimUpdate > 100) {
                            if (isMoving) {
                                const staminaCost = keys['ShiftLeft'] ? 0.02 : 0.01;
                                this.swimStamina = Math.max(0, this.swimStamina - staminaCost);
                            }
                            this.lastSwimUpdate = currentTime;
                        }
                        
                        // Criar bolhas quando submerso
                        if (isSubmerged && Math.random() < 0.1) {
                            this.createBubbles(world.scene, playerPos, waterY);
                        }
                    } else {
                        this.isSwimming = false;
                    }
                }
            }
        });
        
        // Atualizar cooldown do splash
        if (this.splashCooldown > 0) {
            this.splashCooldown -= 16; // ~60fps
        }
        
        // Recuperar stamina fora da água ou parado
        if (!this.isInWater || !this.isSwimming) {
            if (currentTime - this.lastSwimUpdate > 100) {
                this.swimStamina = Math.min(this.SWIM_MAX_TIME, this.swimStamina + 0.03);
                this.lastSwimUpdate = currentTime;
            }
            
            if (!this.isInWater) {
                this.swimTimer = 0;
                this.drowningDamage = 0;
            }
        }
        
        // Sistema de afogamento melhorado
        if (this.swimStamina <= 0 && this.isSwimming) {
            this.drowningDamage += 0.01;
            if (player.vVel !== undefined) {
                player.vVel = Math.max(player.vVel - 0.002, -0.05);
            }
            
            if (this.drowningDamage > 5) {
                console.warn('⚠️ Jogador se afogou!');
                // Trigger respawn
                player.group.position.y = -21;
            }
        }
    }

    createSplash(scene, position) {
        // Criar partículas de splash
        const particleCount = 15;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x88ccff,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.set(
                position.x + (Math.random() - 0.5) * 0.5,
                this.waterSurfaceHeight + 0.5,
                position.z + (Math.random() - 0.5) * 0.5
            );
            
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.2
            );
            
            particle.userData.lifetime = 0;
            scene.add(particle);
            particles.push(particle);
        }
        
        // Animar e remover partículas
        const animateSplash = () => {
            particles.forEach((particle, index) => {
                if (!particle.parent) return;
                
                particle.userData.lifetime += 16;
                
                if (particle.userData.lifetime > 500) {
                    scene.remove(particle);
                    return;
                }
                
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.01;
                particle.material.opacity = 1 - (particle.userData.lifetime / 500);
                
                if (particle.userData.lifetime < 500) {
                    requestAnimationFrame(animateSplash);
                }
            });
        };
        
        animateSplash();
    }

    createBubbles(scene, position, waterSurfaceY) {
        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xaaddff,
            transparent: true,
            opacity: 0.5
        });
        const bubble = new THREE.Mesh(geometry, material);
        
        bubble.position.set(
            position.x + (Math.random() - 0.5) * 0.3,
            position.y + 1.0 + Math.random() * 0.5,
            position.z + (Math.random() - 0.5) * 0.3
        );
        
        bubble.userData.riseSpeed = 0.02 + Math.random() * 0.02;
        scene.add(bubble);
        
        // Animar bolha subindo
        const animateBubble = () => {
            if (!bubble.parent) return;
            
            bubble.position.y += bubble.userData.riseSpeed;
            bubble.position.x += Math.sin(bubble.position.y * 2) * 0.005;
            
            if (bubble.position.y > waterSurfaceY) {
                scene.remove(bubble);
            } else {
                requestAnimationFrame(animateBubble);
            }
        };
        
        animateBubble();
    }

    getWaterColor(depth) {
        // Retorna cor baseada na profundidade (para efeitos visuais futuros)
        if (depth < 0.5) return 0x4db8ff; // Água rasa - azul claro
        if (depth < 2) return 0x0099cc;   // Água média
        return 0x0066aa;                   // Água profunda
    }
}