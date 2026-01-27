// src/systems/SaveSystem.js
const API_URL = 'https://ze-mineiro-api.vercel.app/api';
const AUTH_URL = 'https://ze-mineiro-login.vercel.app/';

export class SaveSystem {
    constructor(token, version) {
        this.token = token;
        this.SAVE_VERSION = version;
    }

    async saveGame(world, player) {
        const saveData = {
            version: this.SAVE_VERSION,
            worldSeed: world.worldSeed,
            inventory: player.inventory,
            selectedItem: player.selectedItem,
            playerPosition: {
                x: player.group.position.x,
                y: player.group.position.y,
                z: player.group.position.z
            },
            playerRotation: player.group.rotation.y,
            worldGenerated: true,
            terrain: world.terrainData,
            trees: world.treesData,
            stones: world.stonesData,
            builtBlocks: world.userBlocks.map(b => ({
                x: b.position.x,
                y: b.position.y,
                z: b.position.z,
                type: b.userData.type
            })),
            destroyedResources: Array.from(world.destroyedResources)
        };
        
        try {
            const response = await fetch(`${API_URL}/game/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(saveData)
            });

            if (response.ok) {
                this.showSaveIndicator();
                return true;
            } else if (response.status === 401) {
                sessionStorage.clear();
                window.location.href = AUTH_URL;
                return false;
            } else {
                console.error('Erro ao salvar no servidor');
                return false;
            }
        } catch (e) {
            console.error("Erro ao salvar:", e);
            return false;
        }
    }

    async loadGame(world, player) {
        try {
            const response = await fetch(`${API_URL}/game/load`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    sessionStorage.clear();
                    window.location.href = AUTH_URL;
                    return;
                }
                throw new Error('Erro ao carregar');
            }

            const data = await response.json();
            
            if (data.firstTime) {
                this.handleFirstTime(world, player);
                return;
            }

            if (data.version < 2) {
                this.convertOldSave(data, world, player);
                return;
            }

            this.restoreGame(data, world, player);
            
        } catch (e) {
            console.error("Erro ao carregar save:", e);
            this.handleFirstTime(world, player);
        }
    }

    async handleFirstTime(world, player) {
        world.worldSeed = Math.floor(Math.random() * 1000000);
        world.generate();
        player.group.position.set(0, 10, 0);
        await this.saveGame(world, player);
    }

    async convertOldSave(data, world, player) {
        console.warn("Save antigo detectado, convertendo para novo formato...");
        world.worldSeed = data.worldSeed || Math.floor(Math.random() * 1000000);
        world.generate();
        player.inventory = data.inventory || { wood: 0, stone: 0 };
        player.group.position.set(
            data.playerPosition?.x || 0,
            data.playerPosition?.y || 10,
            data.playerPosition?.z || 0
        );
        await this.saveGame(world, player);
    }

    restoreGame(data, world, player) {
        // Restaurar inventário
        player.inventory = data.inventory || { wood: 0, stone: 0 };
        if (document.getElementById('count-wood')) {
            document.getElementById('count-wood').innerText = player.inventory.wood;
        }
        if (document.getElementById('count-stone')) {
            document.getElementById('count-stone').innerText = player.inventory.stone;
        }

        // Restaurar item selecionado
        player.selectedItem = data.selectedItem || 'wood';
        const slotNum = data.selectedItem === 'stone' ? 2 : 1;
        player.selectSlot(slotNum);

        // Restaurar posição e rotação
        player.group.position.set(
            data.playerPosition.x || 0,
            data.playerPosition.y || 10,
            data.playerPosition.z || 0
        );
        player.group.rotation.y = data.playerRotation || 0;

        // Restaurar seed do mundo
        world.worldSeed = data.worldSeed || Math.floor(Math.random() * 1000000);

        // Carregar mundo salvo
        world.loadWorld(data.terrain, data.trees, data.stones, data.destroyedResources);

        // Restaurar blocos construídos
        if (data.builtBlocks) {
            data.builtBlocks.forEach(b => {
                world.spawnBlock(b.x, b.y, b.z, b.type, true);
            });
        }
        
        console.log("Progresso carregado com sucesso.");
    }

    showSaveIndicator() {
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 1000);
        }
    }
}