// src/systems/MovementSystem.js
import * as THREE from 'three';

export class MovementSystem {
    constructor() {
        this.ray = new THREE.Raycaster();
        this.vVel = 0;
        this.playerRadius = 0.4; // Raio de colisão do jogador
        this.playerHeight = 1.8;
    }

    update(player, world, keys, isInWater, isSwimming, swimSystem) {
        const oldPos = player.group.position.clone();
        const oldRotation = player.group.rotation.y;
        
        if (isSwimming) {
            this.handleWaterMovement(player, keys, swimSystem, world, oldPos, oldRotation);
        } else {
            this.handleGroundMovement(player, keys, world, oldPos, oldRotation);
        }

        this.applyGravity(player, world, keys, isInWater, swimSystem);
        this.handleRespawn(player);
    }

    checkCollision(player, world, newPos) {
        // Verificar colisão em múltiplos pontos ao redor do jogador
        const checkPoints = [
            new THREE.Vector3(0, 0.5, 0),      // Centro
            new THREE.Vector3(0, 1.2, 0),      // Cabeça
            new THREE.Vector3(0, 0.2, 0),      // Pés
        ];

        // Direções para verificar (8 direções + cima/baixo)
        const directions = [
            new THREE.Vector3(1, 0, 0),        // Direita
            new THREE.Vector3(-1, 0, 0),       // Esquerda
            new THREE.Vector3(0, 0, 1),        // Frente
            new THREE.Vector3(0, 0, -1),       // Trás
            new THREE.Vector3(0.707, 0, 0.707),   // Diagonal NE
            new THREE.Vector3(-0.707, 0, 0.707),  // Diagonal NW
            new THREE.Vector3(0.707, 0, -0.707),  // Diagonal SE
            new THREE.Vector3(-0.707, 0, -0.707), // Diagonal SW
        ];

        for (const point of checkPoints) {
            const checkPos = newPos.clone().add(point);
            
            for (const dir of directions) {
                this.ray.set(checkPos, dir);
                this.ray.far = this.playerRadius;
                
                const hits = this.ray.intersectObjects([...world.blocks, ...world.resources]);
                if (hits.length > 0 && hits[0].distance < this.playerRadius) {
                    return true; // Colisão detectada
                }
            }
        }
        
        return false; // Sem colisão
    }

    handleGroundMovement(player, keys, world, oldPos, oldRotation) {
        // Rotação
        if (keys['KeyA']) player.group.rotation.y += 0.05;
        if (keys['KeyD']) player.group.rotation.y -= 0.05;

        // Verificar se rotação causou colisão
        if (this.checkCollision(player, world, player.group.position)) {
            player.group.rotation.y = oldRotation;
        }

        // Movimento
        if (keys['KeyW'] || keys['KeyS']) {
            const dz = keys['KeyW'] ? -0.1 : 0.1;
            player.group.translateZ(dz);

            // Verificar colisão na nova posição
            if (this.checkCollision(player, world, player.group.position)) {
                player.group.position.copy(oldPos);
            }
        }
    }

    handleWaterMovement(player, keys, swimSystem, world, oldPos, oldRotation) {
        const swimSpeed = keys['ShiftLeft'] ? 0.08 : 0.05;

        // Movimento frontal/traseiro
        if (keys['KeyW']) {
            player.group.translateZ(-swimSpeed);
            if (this.checkCollision(player, world, player.group.position)) {
                player.group.position.copy(oldPos);
            }
        }
        if (keys['KeyS']) {
            player.group.translateZ(swimSpeed);
            if (this.checkCollision(player, world, player.group.position)) {
                player.group.position.copy(oldPos);
            }
        }

        // Rotação lateral
        if (keys['KeyA']) {
            player.group.rotation.y += 0.04;
            if (this.checkCollision(player, world, player.group.position)) {
                player.group.rotation.y = oldRotation;
            }
        }
        if (keys['KeyD']) {
            player.group.rotation.y -= 0.04;
            if (this.checkCollision(player, world, player.group.position)) {
                player.group.rotation.y = oldRotation;
            }
        }

        // Nado vertical
        if (keys['Space'] && swimSystem.swimStamina > 0) {
            this.vVel = 0.08;
            swimSystem.swimStamina = Math.max(0, swimSystem.swimStamina - 0.05);
        }
        if (keys['ControlLeft'] && swimSystem.swimStamina > 0) {
            this.vVel = -0.08;
            swimSystem.swimStamina = Math.max(0, swimSystem.swimStamina - 0.05);
        }
    }

    applyGravity(player, world, keys, isInWater, swimSystem) {
        if (!isInWater) {
            // Verificar se está no chão
            this.ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0));
            const ground = this.ray.intersectObjects(world.blocks);
            
            if (ground.length > 0 && ground[0].distance <= 1.05) {
                this.vVel = 0;
                player.group.position.y = ground[0].point.y;
                if (keys['Space']) this.vVel = 0.15;
            } else {
                this.vVel -= 0.008;
            }
            this.vVel = Math.max(this.vVel, -0.5);
        }
        
        player.group.position.y += this.vVel;
    }

    handleRespawn(player) {
        if (player.group.position.y < -20) {
            const islands = [
                { x: 0, z: 0 },
                { x: 30, z: 30 },
                { x: -30, z: 30 },
                { x: 30, z: -30 },
                { x: -30, z: -30 }
            ];
            
            let nearestIsland = islands[0];
            let minDist = Infinity;
            
            islands.forEach(island => {
                const dist = Math.sqrt(
                    Math.pow(player.group.position.x - island.x, 2) +
                    Math.pow(player.group.position.z - island.z, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    nearestIsland = island;
                }
            });
            
            player.group.position.set(nearestIsland.x, 10, nearestIsland.z);
            this.vVel = 0;
        }
    }
}