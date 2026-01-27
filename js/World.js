import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
        this.resources = [];
        this.waterBlocks = [];
        this.userBlocks = [];
        this.destroyedResources = new Set();
        
        // Dados para salvamento
        this.terrainData = [];
        this.treesData = [];
        this.stonesData = [];
        
        this.blockGeo = new THREE.BoxGeometry(1, 1, 1);

        this.mats = {
            grass: new THREE.MeshLambertMaterial({ color: 0x4d9030 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x808080 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x5d4037, transparent: true }),
            leaf: new THREE.MeshLambertMaterial({ color: 0x2e7d32, transparent: true }),
            water: new THREE.MeshLambertMaterial({ color: 0x0077be, transparent: true, opacity: 0.6 })
        };
    }

    spawnBlock(x, y, z, type, isUserBuilt = false) {
        const block = new THREE.Mesh(this.blockGeo, this.mats[type]);
        block.position.set(x, y, z);
        block.userData.type = type;
        block.name = type; // Para identificar na mineração
        
        this.scene.add(block);
        this.blocks.push(block);
        
        if (isUserBuilt) {
            this.userBlocks.push(block);
            this.resources.push(block); // Adiciona aos resources para poder minerar
        }
        return block;
    }

    generate() {
        const size = 35;
        const islandRadius = 25;

        this.terrainData = [];
        this.treesData = [];
        this.stonesData = [];

        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                const distance = Math.sqrt(x * x + z * z);
                let y = Math.floor(Math.sin(x * 0.1) * 2 + Math.cos(z * 0.1) * 2);

                if (distance > islandRadius) {
                    y -= (distance - islandRadius) * 0.8;
                }

                if (y >= 0) {
                    this.spawnBlock(x, y, z, 'grass', false);
                    this.terrainData.push({ x, y, z });

                    const rand = Math.random();
                    if (rand < 0.03) {
                        this.treesData.push({ x: x, y: y + 1, z: z });
                        this.createTree(x, y + 1, z);
                    }
                    else if (rand < 0.06) {
                        this.stonesData.push({ x: x, y: y + 1, z: z });
                        this.createStone(x, y + 1, z);
                    }
                } else {
                    const water = new THREE.Mesh(this.blockGeo, this.mats.water);
                    water.position.set(x, -0.5, z);
                    water.userData.baseX = x;
                    water.userData.baseZ = z;
                    this.scene.add(water);
                    this.waterBlocks.push(water);
                }
            }
        }
    }

    loadWorld(terrainData, treesData, stonesData, destroyedResources) {
        this.terrainData = terrainData || [];
        this.treesData = treesData || [];
        this.stonesData = stonesData || [];
        this.destroyedResources = new Set(destroyedResources || []);

        const size = 35;

        // Carregar terreno
        this.terrainData.forEach(t => {
            this.spawnBlock(t.x, t.y, t.z, 'grass', false);
        });

        // Carregar água
        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                const hasGrass = this.terrainData.some(t => t.x === x && t.z === z);
                if (!hasGrass) {
                    const water = new THREE.Mesh(this.blockGeo, this.mats.water);
                    water.position.set(x, -0.5, z);
                    water.userData.baseX = x;
                    water.userData.baseZ = z;
                    this.scene.add(water);
                    this.waterBlocks.push(water);
                }
            }
        }

        // Carregar árvores (apenas as não destruídas)
        this.treesData.forEach(t => {
            const treeId = `${t.x}_${t.y}_${t.z}`;
            if (!this.destroyedResources.has(treeId)) {
                this.createTree(t.x, t.y, t.z);
            }
        });

        // Carregar pedras (apenas as não destruídas)
        this.stonesData.forEach(s => {
            const stoneId = `${s.x}_${s.y}_${s.z}`;
            if (!this.destroyedResources.has(stoneId)) {
                this.createStone(s.x, s.y, s.z);
            }
        });
    }

    updateWater(time) {
        this.waterBlocks.forEach(w => {
            const wave = Math.sin(time + w.userData.baseX * 0.3) * 0.2 +
                Math.cos(time + w.userData.baseZ * 0.3) * 0.2;
            w.position.y = -0.7 + wave;
        });
    }

    createStone(x, y, z) {
        const stoneId = `${x}_${y}_${z}`;
        if (this.destroyedResources.has(stoneId)) return;

        const stone = new THREE.Mesh(this.blockGeo, this.mats.stone);
        stone.position.set(x, y, z);
        stone.name = "stone";
        this.scene.add(stone);
        this.resources.push(stone);
    }

    createTree(x, y, z) {
        const treeParts = [];
        
        for (let i = 0; i < 3; i++) {
            const partId = `${x}_${y + i}_${z}`;
            if (this.destroyedResources.has(partId)) continue;

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
                    const partId = `${x + ox}_${y + oy}_${z + oz}`;
                    if (this.destroyedResources.has(partId)) continue;

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