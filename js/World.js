import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
        this.resources = [];
        this.waterBlocks = [];
        this.userBlocks = [];
        this.destroyedResources = new Set();
        
        this.terrainData = [];
        this.treesData = [];
        this.stonesData = [];
        
        this.blockGeo = new THREE.BoxGeometry(1, 1, 1);

        this.mats = {
            grass: new THREE.MeshLambertMaterial({ color: 0x4d9030 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x808080 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x5d4037, transparent: true }),
            leaf: new THREE.MeshLambertMaterial({ color: 0x2e7d32, transparent: true }),
            water: new THREE.MeshLambertMaterial({ color: 0x0077be, transparent: true, opacity: 0.6 }),
            sand: new THREE.MeshLambertMaterial({ color: 0xd2b48c }) // Material para o fundo
        };
    }

    spawnBlock(x, y, z, type, isUserBuilt = false) {
        const block = new THREE.Mesh(this.blockGeo, this.mats[type] || this.mats.stone);
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

    generate() {
        const size = 35;
        const islandRadius = 15;
        const seaFloorY = -6; // Profundidade do oceano

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
                    } else if (rand < 0.06) {
                        this.stonesData.push({ x: x, y: y + 1, z: z });
                        this.createStone(x, y + 1, z);
                    }
                } else {
                    // GERAR FUNDO DO OCEANO
                    for(let fy = seaFloorY; fy <= y; fy++) {
                        const type = fy === y ? 'sand' : 'stone';
                        this.spawnBlock(x, fy, z, type, false);
                        this.terrainData.push({ x, y: fy, z });
                    }

                    // SUPERFÍCIE DA ÁGUA
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

        this.terrainData.forEach(t => {
            let type = 'grass';
            if (t.y < 0) type = 'sand';
            if (t.y < -2) type = 'stone';
            this.spawnBlock(t.x, t.y, t.z, type, false);
        });

        const size = 35;
        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                const hasSurface = this.terrainData.some(t => t.x === x && t.z === z && t.y >= 0);
                if (!hasSurface) {
                    const water = new THREE.Mesh(this.blockGeo, this.mats.water);
                    water.position.set(x, -0.5, z);
                    water.userData.baseX = x;
                    water.userData.baseZ = z;
                    this.scene.add(water);
                    this.waterBlocks.push(water);
                }
            }
        }

        this.treesData.forEach(t => {
            if (!this.destroyedResources.has(`${t.x}_${t.y}_${t.z}`)) this.createTree(t.x, t.y, t.z);
        });

        this.stonesData.forEach(s => {
            if (!this.destroyedResources.has(`${s.x}_${s.y}_${s.z}`)) this.createStone(s.x, s.y, s.z);
        });
    }

    updateWater(time) {
        this.waterBlocks.forEach(w => {
            const wave = Math.sin(time + w.userData.baseX * 0.3) * 0.15;
            w.position.y = -0.6 + wave;
        });
    }

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