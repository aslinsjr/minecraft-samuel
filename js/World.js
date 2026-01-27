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
            water: new THREE.MeshLambertMaterial({ 
                color: 0x0077be, 
                transparent: true, 
                opacity: 0.7,
                side: THREE.DoubleSide
            }),
            waterDeep: new THREE.MeshLambertMaterial({ 
                color: 0x004d7a, 
                transparent: true, 
                opacity: 0.8,
                side: THREE.DoubleSide
            }),
            foam: new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.4
            })
        };

        this.foamBlocks = [];
    }

    spawnBlock(x, y, z, type, isUserBuilt = false) {
        const block = new THREE.Mesh(this.blockGeo, this.mats[type]);
        block.position.set(x, y, z);
        block.userData.type = type;
        block.name = type;
        block.castShadow = true;
        block.receiveShadow = true;

        this.scene.add(block);
        this.blocks.push(block);

        if (isUserBuilt) {
            this.userBlocks.push(block);
            this.resources.push(block);
        }
        return block;
    }

    generate() {
        const worldSize = 70;
        const islandRadius = 15;

        const islandCenters = [
            { x: 0, z: 0 },
            { x: 30, z: 30 },
            { x: -30, z: 30 },
            { x: 30, z: -30 },
            { x: -30, z: -30 }
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
        this.foamBlocks.forEach(foam => this.scene.remove(foam));
        this.foamBlocks = [];

        // Gerar cada ilha
        islandCenters.forEach(center => {
            this.generateIsland(center.x, center.z, islandRadius);
        });

        // Gerar água em todo o mundo
        this.generateWater(worldSize, islandCenters, islandRadius);
    }

    generateIsland(centerX, centerZ, radius) {
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const worldX = centerX + x;
                const worldZ = centerZ + z;
                const distance = Math.sqrt(x * x + z * z);

                if (distance <= radius) {
                    const heightFactor = 1 - (distance / radius);
                    const baseHeight = Math.floor(heightFactor * 3);

                    let y = baseHeight + Math.floor(Math.sin(worldX * 0.1) * 0.5 + Math.cos(worldZ * 0.1) * 0.5);
                    y = Math.max(y, 0);

                    this.spawnBlock(worldX, y, worldZ, 'grass', false);
                    this.terrainData.push({ x: worldX, y, z: worldZ });

                    this.generateResources(worldX, y, worldZ);
                }
            }
        }
    }

    generateResources(x, y, z) {
        const rand = Math.random();
        const centerDistance = Math.sqrt(x * x + z * z);
        const resourceChance = 0.05 * (1 - centerDistance / 15);

        if (rand < resourceChance) {
            this.treesData.push({ x, y: y + 1, z });
            this.createTree(x, y + 1, z);
        }
        else if (rand < resourceChance * 2) {
            this.stonesData.push({ x, y: y + 1, z });
            this.createStone(x, y + 1, z);
        }
    }

    generateWater(worldSize, islandCenters, islandRadius) {
        const waterMap = new Map();
        
        for (let x = -worldSize; x < worldSize; x += 2) {
            for (let z = -worldSize; z < worldSize; z += 2) {
                // Verificar distância das ilhas
                let nearIsland = false;
                let minDistToIsland = Infinity;
                
                for (const island of islandCenters) {
                    const distToIsland = Math.sqrt(
                        Math.pow(x - island.x, 2) + Math.pow(z - island.z, 2)
                    );
                    
                    minDistToIsland = Math.min(minDistToIsland, distToIsland);
                    
                    if (distToIsland <= islandRadius + 1) {
                        nearIsland = true;
                        break;
                    }
                }
                
                const hasGrass = this.terrainData.some(t =>
                    Math.abs(t.x - x) <= 0.5 && Math.abs(t.z - z) <= 0.5
                );

                if (!hasGrass) {
                    // Determinar profundidade baseada na distância da ilha mais próxima
                    const depth = Math.min(1, (minDistToIsland - islandRadius) / 20);
                    const waterMat = depth > 0.5 ? this.mats.waterDeep : this.mats.water;
                    
                    const water = new THREE.Mesh(this.blockGeo, waterMat);
                    water.position.set(x, -0.5, z);
                    water.userData.baseX = x;
                    water.userData.baseZ = z;
                    water.userData.depth = depth;
                    water.userData.wavePhase = Math.random() * Math.PI * 2;
                    water.receiveShadow = true;
                    
                    this.scene.add(water);
                    this.waterBlocks.push(water);
                    
                    // Adicionar espuma perto das ilhas
                    if (nearIsland && minDistToIsland > islandRadius - 1 && minDistToIsland < islandRadius + 3) {
                        this.createFoam(x, z, minDistToIsland - islandRadius);
                    }
                }
            }
        }
    }

    createFoam(x, z, distFromShore) {
        // Criar espuma nas bordas das ilhas
        const foamGeo = new THREE.PlaneGeometry(1.5, 1.5);
        const foam = new THREE.Mesh(foamGeo, this.mats.foam);
        foam.rotation.x = -Math.PI / 2;
        foam.position.set(x, -0.4, z);
        foam.userData.baseX = x;
        foam.userData.baseZ = z;
        foam.userData.distFromShore = distFromShore;
        foam.userData.animPhase = Math.random() * Math.PI * 2;
        
        this.scene.add(foam);
        this.foamBlocks.push(foam);
    }

    loadWorld(terrainData, treesData, stonesData, destroyedResources) {
        this.terrainData = terrainData || [];
        this.treesData = treesData || [];
        this.stonesData = stonesData || [];
        this.destroyedResources = new Set(destroyedResources || []);

        const worldSize = 70;

        // Limpar cena
        this.blocks.forEach(block => this.scene.remove(block));
        this.blocks = [];
        this.resources = [];
        this.waterBlocks.forEach(water => this.scene.remove(water));
        this.waterBlocks = [];
        this.foamBlocks.forEach(foam => this.scene.remove(foam));
        this.foamBlocks = [];

        // Carregar terreno
        this.terrainData.forEach(t => {
            this.spawnBlock(t.x, t.y, t.z, 'grass', false);
        });

        // Gerar água
        const islandCenters = [
            { x: 0, z: 0 },
            { x: 30, z: 30 },
            { x: -30, z: 30 },
            { x: 30, z: -30 },
            { x: -30, z: -30 }
        ];
        this.generateWater(worldSize, islandCenters, 15);

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
        // Animar água com ondas mais realistas
        this.waterBlocks.forEach(w => {
            const baseWave = Math.sin(time + w.userData.wavePhase + w.userData.baseX * 0.2) * 0.15;
            const secondWave = Math.cos(time * 0.7 + w.userData.baseZ * 0.3) * 0.1;
            const ripple = Math.sin(time * 2 + w.userData.baseX * 0.1 + w.userData.baseZ * 0.1) * 0.05;
            
            w.position.y = -0.5 + baseWave + secondWave + ripple;
            
            // Variação de opacidade baseada em profundidade
            const opacityVar = Math.sin(time + w.userData.wavePhase) * 0.05;
            w.material.opacity = (w.userData.depth > 0.5 ? 0.8 : 0.7) + opacityVar;
        });
        
        // Animar espuma
        this.foamBlocks.forEach(f => {
            const fadeIn = Math.sin(time * 1.5 + f.userData.animPhase) * 0.2 + 0.3;
            const pulse = Math.cos(time * 2 + f.userData.baseX) * 0.1;
            f.material.opacity = (0.4 + fadeIn + pulse) * (1 - f.userData.distFromShore / 3);
            
            // Movimento sutil
            f.position.y = -0.4 + Math.sin(time + f.userData.animPhase) * 0.05;
        });
    }

    createStone(x, y, z) {
        const stoneId = `${x}_${y}_${z}`;
        if (this.destroyedResources.has(stoneId)) return;

        const stone = new THREE.Mesh(this.blockGeo, this.mats.stone);
        stone.position.set(x, y, z);
        stone.name = "stone";
        stone.castShadow = true;
        stone.receiveShadow = true;
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
            log.castShadow = true;
            log.receiveShadow = true;
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
                    leaf.castShadow = true;
                    leaf.receiveShadow = true;
                    this.scene.add(leaf);
                    this.resources.push(leaf);
                    treeParts.push(leaf);
                }
            }
        }

        treeParts.forEach(p => p.userData.tree = treeParts);
    }
}