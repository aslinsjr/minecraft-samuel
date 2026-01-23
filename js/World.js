import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
        this.resources = [];
        this.waterBlocks = []; // Inicializa a lista de água
        this.blockGeo = new THREE.BoxGeometry(1, 1, 1);

        // Primeiro definimos o objeto com os materiais existentes
        this.mats = {
            grass: new THREE.MeshLambertMaterial({ color: 0x4d9030 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x808080 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x5d4037, transparent: true }), // Adicionado
            leaf: new THREE.MeshLambertMaterial({ color: 0x2e7d32, transparent: true }), // Adicionado
            water: new THREE.MeshLambertMaterial({ color: 0x0077be, transparent: true, opacity: 0.6 })
        };
    }

    generate() {
        const size = 35;
        const islandRadius = 15;

        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                const distance = Math.sqrt(x * x + z * z);

                // Altura base
                let y = Math.floor(Math.sin(x * 0.1) * 2 + Math.cos(z * 0.1) * 2);

                // Lógica da Ilha: se afastar do centro, o Y diminui
                if (distance > islandRadius) {
                    y -= (distance - islandRadius) * 0.8;
                }

                if (y >= 0) {
                    const ground = new THREE.Mesh(this.blockGeo, this.mats.grass);
                    ground.position.set(x, y, z);
                    this.scene.add(ground);
                    this.blocks.push(ground);

                    const rand = Math.random();
                    if (rand < 0.03) this.createTree(x, y + 1, z);
                    else if (rand < 0.06) this.createStone(x, y + 1, z);
                } else {
                    // Criar o bloco de mar
                    const water = new THREE.Mesh(this.blockGeo, this.mats.water);
                    water.position.set(x, -0.5, z);
                    // Guardamos a posição original para a animação das ondas
                    water.userData.baseX = x;
                    water.userData.baseZ = z;
                    this.scene.add(water);
                    this.waterBlocks.push(water);
                }
            }
        }
    }

    updateWater(time) {
        this.waterBlocks.forEach(w => {
            // Movimento de onda senoidal
            const wave = Math.sin(time + w.userData.baseX * 0.3) * 0.2 +
                Math.cos(time + w.userData.baseZ * 0.3) * 0.2;
            w.position.y = -0.7 + wave;
        });
    }

    // Mantenha seus métodos createStone e createTree abaixo...
    createStone(x, y, z) {
        const stone = new THREE.Mesh(this.blockGeo, this.mats.stone);
        stone.position.set(x, y, z);
        stone.name = "stone";
        this.scene.add(stone);
        this.resources.push(stone);
    }

    createTree(x, y, z) {
        const treeParts = [];
        for (let i = 0; i < 3; i++) {
            const log = new THREE.Mesh(this.blockGeo, this.mats.wood);
            log.position.set(x, y + i, z);
            log.name = "wood";
            this.scene.add(log);
            this.resources.push(log);
            treeParts.push(log);
        }
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = 2; oy <= 3; oy++) {
                for (let oz = -1; oz <= 1; oz++) {
                    const leaf = new THREE.Mesh(this.blockGeo, this.mats.leaf);
                    leaf.position.set(x + ox, y + oy, z + oz);
                    leaf.name = "leaves";
                    this.scene.add(leaf);
                    this.resources.push(leaf);
                    treeParts.push(leaf);
                }
            }
        }
        treeParts.forEach(p => p.userData.tree = treeParts);
    }
}