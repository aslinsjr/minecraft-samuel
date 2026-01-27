import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
        this.resources = [];
        this.waterBlocks = [];
        this.userBlocks = [];
        this.destroyedResources = new Set();
        this.worldSeed = Math.floor(Math.random() * 1000000);

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
        block.name = type;

        this.scene.add(block);
        this.blocks.push(block);

        if (isUserBuilt) {
            this.userBlocks.push(block);
            this.resources.push(block);
        }
        return block;
    }

    // MODIFICADO: Agora gera múltiplas ilhas
    generate() {
        const worldSize = 70; // Tamanho total do mundo
        const islandRadius = 15; // Tamanho de cada ilha

        // Posições das ilhas (x, z)
        const islandCenters = [
            { x: 0, z: 0 }, // Ilha central original
            { x: 30, z: 30 }, // Ilha no nordeste
            { x: -30, z: 30 }, // Ilha no noroeste
            { x: 30, z: -30 }, // Ilha no sudeste
            { x: -30, z: -30 } // Ilha no sudoeste
        ];

        this.terrainData = [];
        this.treesData = [];
        this.stonesData = [];

        // Limpar dados antigos
        this.blocks.forEach(block => this.scene.remove(block));
        this.blocks = [];
        this.resources = this.resources.filter(r => r.name === "leaves" || r.name === "wood" || r.name === "stone");
        this.waterBlocks.forEach(water => this.scene.remove(water));
        this.waterBlocks = [];

        // Gerar cada ilha
        islandCenters.forEach(center => {
            this.generateIsland(center.x, center.z, islandRadius);
        });

        // Gerar água em todo o mundo
        this.generateWater(worldSize);
    }

    // NOVO MÉTODO: Gerar uma ilha individual
    generateIsland(centerX, centerZ, radius) {
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const worldX = centerX + x;
                const worldZ = centerZ + z;
                const distance = Math.sqrt(x * x + z * z);

                if (distance <= radius) {
                    // Criar terreno com altura baseada na distância do centro
                    const heightFactor = 1 - (distance / radius);
                    const baseHeight = Math.floor(heightFactor * 3);

                    // Adicionar variação de terreno
                    let y = baseHeight + Math.floor(Math.sin(worldX * 0.1) * 0.5 + Math.cos(worldZ * 0.1) * 0.5);
                    y = Math.max(y, 0); // Garantir que não fique abaixo da água

                    this.spawnBlock(worldX, y, worldZ, 'grass', false);
                    this.terrainData.push({ x: worldX, y, z: worldZ });

                    // Gerar recursos baseado na posição
                    this.generateResources(worldX, y, worldZ);
                }
            }
        }
    }

    // NOVO MÉTODO: Gerar recursos para uma posição
    generateResources(x, y, z) {
        const rand = Math.random();

        // Aumentar chance de recursos perto do centro da ilha
        const centerDistance = Math.sqrt(x * x + z * z);
        const resourceChance = 0.05 * (1 - centerDistance / 15); // Diminui perto das bordas

        if (rand < resourceChance) {
            this.treesData.push({ x, y: y + 1, z });
            this.createTree(x, y + 1, z);
        }
        else if (rand < resourceChance * 2) {
            this.stonesData.push({ x, y: y + 1, z });
            this.createStone(x, y + 1, z);
        }
    }

    // NOVO MÉTODO: Gerar água para todo o mundo
    generateWater(worldSize) {
        for (let x = -worldSize; x < worldSize; x += 2) {
            for (let z = -worldSize; z < worldSize; z += 2) {
                // Verificar se há bloco de grama nesta posição
                const hasGrass = this.terrainData.some(t =>
                    Math.abs(t.x - x) <= 0.5 && Math.abs(t.z - z) <= 0.5
                );

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
    }

    loadWorld(terrainData, treesData, stonesData, destroyedResources) {
        this.terrainData = terrainData || [];
        this.treesData = treesData || [];
        this.stonesData = stonesData || [];
        this.destroyedResources = new Set(destroyedResources || []);

        const worldSize = 70; // Deve corresponder ao tamanho usado no generate()

        // Limpar cena
        this.blocks.forEach(block => this.scene.remove(block));
        this.blocks = [];
        this.resources = [];
        this.waterBlocks.forEach(water => this.scene.remove(water));
        this.waterBlocks = [];

        // Carregar terreno
        this.terrainData.forEach(t => {
            this.spawnBlock(t.x, t.y, t.z, 'grass', false);
        });

        // Carregar água
        this.generateWater(worldSize);

        // Carregar árvores
        this.treesData.forEach(t => {
            const treeId = `${t.x}_${t.y}_${t.z}`;
            if (!this.destroyedResources.has(treeId)) {
                this.createTree(t.x, t.y, t.z);
            }
        });

        // Carregar pedras
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