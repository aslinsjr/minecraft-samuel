import * as THREE from 'three';

export class Player {
    constructor(scene) {
        this.group = new THREE.Group();
        this.inventory = { wood: 0, stone: 0 };
        this.walkTime = 0;
        // Dentro do constructor no Player.js
        this.group.position.set(0, 10, 0); // Nasce no alto, no centro (0,0)
        this.miningProgress = 0; // Controla o progresso do movimento (0 a 1)
        this.selectedItem = 'wood'; // Item padrão inicial

        // Materiais
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x0000ff });
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x5c3317 });
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const ironMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });

        // Geometria (Cabeça, Corpo, Braços, Pernas)
        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), shirtMat);
        this.torso.position.y = 1.05;

        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
        this.head.position.y = 1.65;

        this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), shirtMat);
        this.leftArm.position.set(-0.45, 1.05, 0);

        this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), shirtMat);
        // Desloca a geometria para baixo: o topo do braço agora é o ponto (0,0,0)
        this.rightArm.geometry.translate(0, -0.3, 0);
        // Sobe a posição do objeto para o nível do ombro
        this.rightArm.position.set(0.45, 1.4, 0);

        this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), pantsMat);
        this.leftLeg.position.set(-0.15, 0.35, 0);

        this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), pantsMat);
        this.rightLeg.position.set(0.15, 0.35, 0);

        // Picareta
        this.pickaxe = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), woodMat);
        const headPart = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.12), ironMat);
        headPart.position.y = 0.3; // Cabeça da picareta no topo do cabo
        this.pickaxe.add(handle, headPart);
        this.pickaxe.position.set(0, -0.5, -0.2);
        this.pickaxe.rotation.x = Math.PI / -3;
        this.rightArm.add(this.pickaxe);

        this.group.add(this.torso, this.head, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
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
            if (!isMining) this.rightArm.rotation.x = Math.sin(this.walkTime) * 0.5;
        } else {
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            if (!isMining) this.rightArm.rotation.x = 0;
        }

        if (isMining) {
            // Aumentamos a velocidade para o golpe ser rápido
            this.miningProgress += 0.25;

            // Movimento de "Corte": Recua (negativo) e depois golpeia (positivo)
            // Usamos Math.sin para criar o balanço e multiplicamos por -1.8 para amplitude
            const swing = Math.sin(this.miningProgress) * 1.5;
            this.rightArm.rotation.x = swing;

            // Inclina o braço levemente para dentro para não bater no corpo
            this.rightArm.rotation.z = 0.2;
        } else {
            this.miningProgress = 0;
            // Retorno suave para a pose padrão (braço esticado para baixo)
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, 0.1);
            this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, 0, 0.1);
        }
    }

   selectSlot(slot) {
    const items = ['wood', 'stone'];
    this.selectedItem = items[slot - 1] || 'wood';
    
    // Limpa seleções anteriores
    document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
    
    // Adiciona ao slot atual
    const activeSlot = document.getElementById(`slot-${slot}`);
    if (activeSlot) activeSlot.classList.add('selected');
}
}