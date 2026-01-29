export class SaveManager {
    constructor(apiUrl, authUrl, token) {
        this.API_URL = apiUrl;
        this.AUTH_URL = authUrl;
        this.token = token;
        this.SAVE_VERSION = 1;
        
        this.setupAutoSave();
    }

    setupAutoSave() {
        // Auto-save a cada 30 segundos
        setInterval(() => {
            this.save();
        }, 30000);

        // Salvar ao fechar
        window.addEventListener('beforeunload', () => {
            this.save();
        });
    }

    async save() {
        if (!this.player || !this.world) {
            console.warn('Player ou World não inicializado');
            return;
        }

        const saveData = {
            version: this.SAVE_VERSION,
            inventory: this.player.inventory,
            selectedItem: this.player.selectedItem,
            playerPosition: {
                x: this.player.group.position.x,
                y: this.player.group.position.y,
                z: this.player.group.position.z
            },
            playerRotation: this.player.group.rotation.y,
            worldGenerated: true,
            terrain: this.world.terrainData,
            trees: this.world.treesData,
            stones: this.world.stonesData,
            builtBlocks: this.world.userBlocks.map(b => ({
                x: b.position.x,
                y: b.position.y,
                z: b.position.z,
                type: b.userData.type
            })),
            destroyedResources: Array.from(this.world.destroyedResources)
        };

        try {
            const response = await fetch(`${this.API_URL}/game/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(saveData)
            });

            if (response.ok) {
                this.onSaveSuccess?.();
            } else if (response.status === 401) {
                this.handleAuthError();
            } else {
                console.error('Erro ao salvar no servidor');
            }
        } catch (e) {
            console.error("Erro ao salvar:", e);
        }
    }

    async load() {
        try {
            const response = await fetch(`${this.API_URL}/game/load`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.handleAuthError();
                    return null;
                }
                throw new Error('Erro ao carregar');
            }

            const data = await response.json();
            
            if (data.firstTime) {
                return { firstTime: true };
            }

            if (data.version !== this.SAVE_VERSION) {
                console.warn("Save antigo detectado");
                return { firstTime: true };
            }

            return data;
        } catch (e) {
            console.error("Erro ao carregar save:", e);
            return { firstTime: true };
        }
    }

    handleAuthError() {
        sessionStorage.clear();
        window.location.href = this.AUTH_URL;
    }

    setGameObjects(player, world) {
        this.player = player;
        this.world = world;
    }
}