// src/systems/BuildingSystem.js
import * as THREE from 'three';

export class BuildingSystem {
    constructor(scene) {
        this.scene = scene;
        this.buildMode = false;
        this.ghostBlock = this.createGhostBlock();
        this.ray = new THREE.Raycaster();
        this.waterSurfaceHeight = -0.5;
    }

    createGhostBlock() {
        const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const ghostMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            wireframe: true, 
            transparent: true, 
            opacity: 0.5 
        });
        const ghostBlock = new THREE.Mesh(ghostGeo, ghostMat);
        this.scene.add(ghostBlock);
        ghostBlock.visible = false;
        return ghostBlock;
    }

    toggleBuildMode() {
        this.buildMode = !this.buildMode;
        this.ghostBlock.visible = this.buildMode;
        return this.buildMode;
    }

    updateGhostBlock(player, ray) {
        if (!this.buildMode) return;

        const hits = ray.intersectObjects(player.world.blocks);
        if (hits.length > 0) {
            const hit = hits[0];
            const pos = hit.object.position.clone().add(hit.face.normal);
            
            const distToPlayer = pos.distanceTo(player.group.position);
            if (distToPlayer > 1.5) {
                this.ghostBlock.position.copy(pos);
                this.ghostBlock.visible = true;
                
                const canBuild = player.inventory[player.selectedItem] > 0;
                this.ghostBlock.material.color.setHex(canBuild ? 0xffffff : 0xff0000);
            } else {
                this.ghostBlock.visible = false;
            }
        } else {
            this.ghostBlock.visible = false;
        }
    }

    placeBlock(player, world, saveSystem) {
        const type = player.selectedItem;
        if (player.inventory[type] <= 0) {
            console.log(`Não há ${type} suficiente no inventário!`);
            return false;
        }

        const blockPos = this.ghostBlock.position.clone();
        const isUnderwater = blockPos.y < this.waterSurfaceHeight;
        
        if (isUnderwater && type !== 'stone') {
            console.log('Só é possível construir com pedra debaixo d\'água');
            return false;
        }
        
        world.spawnBlock(blockPos.x, blockPos.y, blockPos.z, type, true);
        
        player.inventory[type]--;
        const el = document.getElementById(`count-${type}`);
        if (el) el.innerText = player.inventory[type];
        
        saveSystem.saveGame(world, player);
        return true;
    }

    mine(player, world, saveSystem) {
        const look = new THREE.Vector3(0, 0, -1).applyQuaternion(player.group.quaternion);
        this.ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), look);
        this.ray.far = 2.5;
        const hits = this.ray.intersectObjects(world.resources);
        
        if (hits.length > 0) {
            const target = hits[0].object;
            const resourceId = `${target.position.x}_${target.position.y}_${target.position.z}`;
            const isUserBlock = world.userBlocks.includes(target);
            
            if (target.userData.tree) {
                target.userData.tree.forEach(p => {
                    const partId = `${p.position.x}_${p.position.y}_${p.position.z}`;
                    world.destroyedResources.add(partId);
                    this.scene.remove(p);
                    world.resources = world.resources.filter(r => r !== p);
                    if (p.name === "wood") player.collect("wood");
                });
            } else {
                if (isUserBlock) {
                    world.userBlocks = world.userBlocks.filter(b => b !== target);
                }
                
                world.destroyedResources.add(resourceId);
                player.collect(target.name);
                this.scene.remove(target);
                world.resources = world.resources.filter(r => r !== target);
                world.blocks = world.blocks.filter(b => b !== target);
            }
            
            saveSystem.saveGame(world, player);
            return true;
        }
        return false;
    }
}