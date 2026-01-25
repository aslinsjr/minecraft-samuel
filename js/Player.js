import * as THREE from 'three';

export class Player {
    constructor(scene, customColors = null) {
        this.group = new THREE.Group();
        this.inventory = { wood: 0, stone: 0 };
        this.walkTime = 0;
        this.group.position.set(0, 10, 0);
        this.miningProgress = 0;
        this.selectedItem = 'wood';

        // LÓGICA DE OXIGÊNIO
        this.oxygen = 100;
        this.isSubmerged = false;

        const colors = customColors || {
            skin: '#ffdbac', shirt: '#0000ff', pants: '#5c3317', hair: '#3d2b1f', shoes: '#222222'
        };

        const skinMat = new THREE.MeshLambertMaterial({ color: colors.skin });
        const shirtMat = new THREE.MeshLambertMaterial({ color: colors.shirt });
        const pantsMat = new THREE.MeshLambertMaterial({ color: colors.pants });
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const ironMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        const hairMat = new THREE.MeshLambertMaterial({ color: colors.hair });
        const shoeMat = new THREE.MeshLambertMaterial({ color: colors.shoes });

        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
        this.head.position.y = 1.65;
        this.hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.48), hairMat);
        this.hair.position.y = 0.15;
        this.head.add(this.hair);

        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), shirtMat);
        this.torso.position.y = 1.05;

        this.hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.35), pantsMat);
        this.hips.position.y = 0.7; 
        
        const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        legGeo.translate(0, -0.35, 0); 

        this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
        this.leftLeg.position.set(-0.15, 0, 0);
        this.hips.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
        this.rightLeg.position.set(0.15, 0, 0);
        this.hips.add(this.rightLeg);

        this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), shirtMat);
        this.leftArm.position.set(-0.45, 1.05, 0);
        
        this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), shirtMat);
        this.rightArm.geometry.translate(0, -0.3, 0);
        this.rightArm.position.set(0.45, 1.4, 0);

        this.pickaxe = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), woodMat);
        const headPart = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.5), ironMat);
        headPart.position.y = 0.3;
        this.pickaxe.add(handle, headPart);
        this.pickaxe.position.set(0, -0.5, -0.4);
        this.pickaxe.rotation.x = Math.PI / -3;
        this.rightArm.add(this.pickaxe);

        this.group.add(this.torso, this.head, this.leftArm, this.rightArm, this.hips);
        scene.add(this.group);
    }
    
    updateOxygen() {
        if (this.isSubmerged) {
            // Perda de oxigênio (0.01 por frame demora aprox. 2-3 minutos a 60fps)
            this.oxygen = Math.max(0, this.oxygen - 0.01);
        } else {
            // Recuperação rápida ao sair
            this.oxygen = Math.min(100, this.oxygen + 0.5);
        }

        // Atualização da UI (se existir)
        const bar = document.getElementById('oxygen-bar');
        if (bar) {
            bar.style.width = `${this.oxygen}%`;
            bar.style.backgroundColor = this.oxygen < 25 ? '#ff4444' : '#44ffff';
        }

        if (this.oxygen <= 0) {
            this.respawn();
        }
    }

    respawn() {
        alert("Você ficou sem ar!");
        this.oxygen = 100;
        this.group.position.set(0, 10, 0);
    }

    collect(type) {
        if (type === "wood" || type === "leaves") this.inventory.wood++;
        else if (type === "stone" || type === "sand") this.inventory.stone++;
        
        const woodEl = document.getElementById('count-wood');
        const stoneEl = document.getElementById('count-stone');
        if (woodEl) woodEl.innerText = this.inventory.wood;
        if (stoneEl) stoneEl.innerText = this.inventory.stone;
    }

    animate(isMoving, isMining) {
        const speed = this.isSubmerged ? 0.05 : 0.15;
        if (isMoving) {
            this.walkTime += speed;
            this.leftLeg.rotation.x = Math.sin(this.walkTime) * 0.5;
            this.rightLeg.rotation.x = -Math.sin(this.walkTime) * 0.5;
            this.leftArm.rotation.x = -Math.sin(this.walkTime) * 0.5;
            if (!isMining) this.rightArm.rotation.x = Math.sin(this.walkTime) * 0.5;
        }
        if (isMining) {
            this.miningProgress += 0.25;
            this.rightArm.rotation.x = Math.sin(this.miningProgress) * 1.5;
        }
    }

    selectSlot(slot) {
        const items = ['wood', 'stone'];
        this.selectedItem = items[slot - 1] || 'wood';
        document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
        const activeSlot = document.getElementById(`slot-${slot}`);
        if (activeSlot) activeSlot.classList.add('selected');
    }
}