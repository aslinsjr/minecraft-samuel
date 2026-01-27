// src/systems/MovementSystem.js
import * as THREE from 'three';

export class MovementSystem {
    constructor() {
        this.ray = new THREE.Raycaster();
        this.vVel = 0;
    }

    update(player, world, keys, isInWater, isSwimming, swimSystem) {
        const oldPos = player.group.position.clone();
        
        if (isSwimming) {
            this.handleWaterMovement(player, keys, swimSystem, world);
        } else {
            this.handleGroundMovement(player, keys, world);
        }

        this.applyGravity(player, world, keys, isInWater, swimSystem);
        this.handleRespawn(player);
    }

    handleGroundMovement(player, keys, world) {
        // Rotação
        if (keys['KeyA']) player.group.rotation.y += 0.05;
        if (keys['KeyD']) player.group.rotation.y -= 0.05;

        // Movimento
        if (keys['KeyW'] || keys['KeyS']) {
            let dz = keys['KeyW'] ? -0.1 : 0.1;
            player.group.translateZ(dz);

            // Verificar colisões
            const dir = new THREE.Vector3(0, 0, dz > 0 ? 1 : -1).applyQuaternion(player.group.quaternion);
            this.ray.set(player.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), dir);
            const hits = this.ray.intersectObjects([...world.blocks, ...world.resources]);
            if (hits.length > 0 && hits[0].distance < 0.6) {
                player.group.position.copy(oldPos);
            }
        }
    }

    handleWaterMovement(player, keys, swimSystem, world) {
        const swimSpeed = keys['ShiftLeft'] ? 0.08 : 0.05;
        const oldPos = player.group.position.clone();

        if (keys['KeyW']) {
            player.group.translateZ(-swimSpeed);
        }
        if (keys['KeyS']) {
            player.group.translateZ(swimSpeed);
        }

        // Rotação lateral
        if (keys['KeyA']) {
            player.group.rotation.y += 0.04;
        }
        if (keys['KeyD']) {
            player.group.rotation.y -= 0.04;
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

        // Verificar colisões mesmo na água
        this.ray.set(player.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 
                    new THREE.Vector3(0, 0, -1).applyQuaternion(player.group.quaternion));
        const hits = this.ray.intersectObjects([...world.blocks, ...world.resources]);
        if (hits.length > 0 && hits[0].distance < 0.6) {
            player.group.position.copy(oldPos);
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