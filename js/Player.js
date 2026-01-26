import * as THREE from 'three';

export class Player {
    constructor(scene, customColors = null) {
        this.group = new THREE.Group();
        this.inventory = { wood: 0, stone: 0 };
        this.walkTime = 0;
        this.group.position.set(0, 10, 0);
        this.miningProgress = 0;
        this.selectedItem = 'wood';

        // Cores padrão ou customizadas
        const colors = customColors || {
            skin: '#ffdbac',
            shirt: '#0000ff',
            pants: '#5c3317',
            hair: '#3d2b1f',
            shoes: '#222222'
        };

        // --- MATERIAIS COM CORES CUSTOMIZADAS ---
        const skinMat = new THREE.MeshLambertMaterial({ color: colors.skin });
        const shirtMat = new THREE.MeshLambertMaterial({ color: colors.shirt });
        const pantsMat = new THREE.MeshLambertMaterial({ color: colors.pants });
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const ironMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        const hairMat = new THREE.MeshLambertMaterial({ color: colors.hair });
        const shoeMat = new THREE.MeshLambertMaterial({ color: colors.shoes });

        // --- CABEÇA ---
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
        this.head.position.y = 1.65;

        this.hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.48), hairMat);
        this.hair.position.y = 0.15;
        this.head.add(this.hair);

        // --- TRONCO ---
        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), shirtMat);
        this.torso.position.y = 1.05;

        // --- QUADRIL ---
        this.hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.35), pantsMat);
        this.hips.position.y = 0.7; 
        
        // --- PERNAS E SAPATOS ---
        const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        legGeo.translate(0, -0.35, 0); 

        this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
        this.leftLeg.position.set(-0.15, 0, 0);
        this.hips.add(this.leftLeg);

        this.leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.4), shoeMat);
        this.leftShoe.position.set(0, -0.7, 0.05); 
        this.leftLeg.add(this.leftShoe);

        this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
        this.rightLeg.position.set(0.15, 0, 0);
        this.hips.add(this.rightLeg);

        this.rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.4), shoeMat);
        this.rightShoe.position.set(0, -0.7, 0.05);
        this.rightLeg.add(this.rightShoe);

        // --- BRAÇOS E FERRAMENTA ---
        const handGeo = new THREE.BoxGeometry(0.22, 0.15, 0.22);

        this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), shirtMat);
        this.leftArm.position.set(-0.45, 1.05, 0);
        
        this.leftHand = new THREE.Mesh(handGeo, skinMat);
        this.leftHand.position.y = -0.35;
        this.leftArm.add(this.leftHand);

        this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), shirtMat);
        this.rightArm.geometry.translate(0, -0.3, 0);
        this.rightArm.position.set(0.45, 1.4, 0);
        
        this.rightHand = new THREE.Mesh(handGeo, skinMat);
        this.rightHand.position.y = -0.65;
        this.rightArm.add(this.rightHand);

        this.pickaxe = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), woodMat);
        const headPart = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.5), ironMat);
        headPart.position.y = 0.3;
        this.pickaxe.add(handle, headPart);
        this.pickaxe.position.set(0, -0.5, -0.4);
        this.pickaxe.rotation.x = Math.PI / -3;
        this.rightArm.add(this.pickaxe);

        // --- ADICIONAR AO GRUPO PRINCIPAL ---
        this.group.add(this.torso, this.head, this.leftArm, this.rightArm, this.hips);
        scene.add(this.group);
    }
    
    collect(type) {
        if (type === "wood" || type === "leaves") {
            this.inventory.wood++;
            const el = document.getElementById('count-wood');
            if (el) el.innerText = this.inventory.wood;
        } else if (type === "stone") {
            this.inventory.stone++;
            const el = document.getElementById('count-stone');
            if (el) el.innerText = this.inventory.stone;
        }
    }

    animate(isMoving, isMining) {
        if (isMoving) {
            this.walkTime += 0.15;
            this.leftLeg.rotation.x = Math.sin(this.walkTime) * 0.5;
            this.rightLeg.rotation.x = -Math.sin(this.walkTime) * 0.5;
            this.leftArm.rotation.x = -Math.sin(this.walkTime) * 0.5;
            
            this.hips.rotation.z = Math.sin(this.walkTime) * 0.05;

            if (!isMining) this.rightArm.rotation.x = Math.sin(this.walkTime) * 0.5;
        } else {
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            this.hips.rotation.z = 0;
            if (!isMining) this.rightArm.rotation.x = 0;
        }

        if (isMining) {
            this.miningProgress += 0.25;
            const swing = Math.sin(this.miningProgress) * 1.5;
            this.rightArm.rotation.x = swing;
            this.rightArm.rotation.z = 0.2;
        } else {
            this.miningProgress = 0;
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, 0.1);
            this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, 0, 0.1);
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