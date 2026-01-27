import * as THREE from 'three';

export class Minimap {
    constructor(scene, worldSize) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.minimapGroup = new THREE.Group();
        
        // Configurar câmera ortográfica para o minimapa
        this.camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
        this.camera.position.set(0, 50, 0);
        this.camera.lookAt(0, 0, 0);
        
        // Criar renderizador para o minimapa
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setSize(200, 200);
        this.renderer.domElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            border: 2px solid white;
            border-radius: 5px;
            background: rgba(0, 0, 0, 0.3);
            z-index: 1000;
        `;
        document.body.appendChild(this.renderer.domElement);
        
        // Criar cena do minimapa
        this.minimapScene = new THREE.Scene();
        this.minimapScene.background = new THREE.Color(0x0077be);
        
        // Adicionar marcadores das ilhas
        this.islandMarkers = [];
        this.playerMarker = null;
        
        this.createPlayerMarker();
        
        // Adicionar luz ao minimapa
        const light = new THREE.AmbientLight(0xffffff, 0.8);
        this.minimapScene.add(light);
    }
    
    createPlayerMarker() {
        // Criar marcador do jogador (triângulo vermelho)
        const geometry = new THREE.ConeGeometry(3, 6, 3);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.playerMarker = new THREE.Mesh(geometry, material);
        this.minimapScene.add(this.playerMarker);
        
        // Adicionar marcadores das ilhas (pontos verdes)
        const islandGeometry = new THREE.SphereGeometry(5, 8, 8);
        const islandMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        const islandPositions = [
            { x: 0, z: 0 },
            { x: 30, z: 30 },
            { x: -30, z: 30 },
            { x: 30, z: -30 },
            { x: -30, z: -30 }
        ];
        
        islandPositions.forEach(pos => {
            const marker = new THREE.Mesh(islandGeometry, islandMaterial);
            marker.position.set(pos.x, 0, pos.z);
            this.minimapScene.add(marker);
            this.islandMarkers.push(marker);
        });
    }
    
    update(playerPos, islands) {
        if (!this.playerMarker) return;
        
        // Atualizar posição do marcador do jogador
        this.playerMarker.position.set(playerPos.x, 0, playerPos.z);
        
        // Rotacionar o marcador para mostrar direção
        this.playerMarker.rotation.y = -playerPos.rotation || 0;
        
        // Atualizar marcadores das ilhas se necessário
        if (islands && this.islandMarkers.length !== islands.length) {
            this.islandMarkers.forEach(marker => this.minimapScene.remove(marker));
            this.islandMarkers = [];
            
            islands.forEach(island => {
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(5, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
                );
                marker.position.set(island.x, 0, island.z);
                this.minimapScene.add(marker);
                this.islandMarkers.push(marker);
            });
        }
        
        // Renderizar o minimapa
        this.renderer.render(this.minimapScene, this.camera);
    }
}