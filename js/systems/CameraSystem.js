// src/systems/CameraSystem.js
import * as THREE from 'three';

export class CameraSystem {
    constructor(camera) {
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.obscuredObjects = [];
    }

    update(player, isSwimming, world) {
        this.handleCameraObstruction(player, world);
        this.updateCameraPosition(player, isSwimming);
    }

    updateCameraPosition(player, isSwimming) {
        const camDistance = isSwimming ? 6 : 8;
        const camHeight = isSwimming ? 3 : 4;
        const camPos = new THREE.Vector3(0, camHeight, camDistance)
            .applyQuaternion(player.group.quaternion)
            .add(player.group.position);
        
        this.camera.position.lerp(camPos, 0.1);
        this.camera.lookAt(player.group.position.x, player.group.position.y + 1, player.group.position.z);
    }

    handleCameraObstruction(player, world) {
        // Restaurar objetos anteriormente obscurecidos
        this.obscuredObjects.forEach(obj => { 
            if (obj.material) obj.material.opacity = 1.0; 
        });
        this.obscuredObjects = [];

        // Posição dos olhos do jogador
        const eyePos = player.group.position.clone().add(new THREE.Vector3(0, 1.6, 0));
        const camPos = this.camera.position.clone();
        const dir = new THREE.Vector3().subVectors(eyePos, camPos).normalize();
        
        // Verificar obstrução
        this.raycaster.set(camPos, dir);
        this.raycaster.far = camPos.distanceTo(eyePos);

        const intersects = this.raycaster.intersectObjects(world.resources);
        intersects.forEach(hit => {
            if (hit.object.material && hit.object.material.transparent) {
                hit.object.material.opacity = 0.3;
                this.obscuredObjects.push(hit.object);
            }
        });
    }

    getBuildRay(player) {
        const look = new THREE.Vector3(0, -0.5, -1).applyQuaternion(player.group.quaternion).normalize();
        this.raycaster.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), look);
        this.raycaster.far = 4;
        return this.raycaster;
    }
}