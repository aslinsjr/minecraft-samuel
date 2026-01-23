import * as THREE from 'three';
import { Player } from './Player.js';
import { World } from './World.js';

// --- CONFIGURAÇÃO INICIAL ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- ILUMINAÇÃO ---
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
scene.add(sun, new THREE.AmbientLight(0xffffff, 0.6));

// --- MUNDO E JOGADOR ---
const world = new World(scene);
const player = new Player(scene);

// --- ESTADOS E VARIÁVEIS ---
const keys = {};
let isMining = false;
let buildMode = false;
let obscuredObjects = [];
let vVel = 0;

const ray = new THREE.Raycaster();
const cameraRay = new THREE.Raycaster();

// --- SISTEMA DE CONSTRUÇÃO (GHOST BLOCK) ---
const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
const ghostMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.5 
});
const ghostBlock = new THREE.Mesh(ghostGeo, ghostMat);
scene.add(ghostBlock);
ghostBlock.visible = false;

// --- SISTEMA DE PERSISTÊNCIA ---
const SAVE_VERSION = 1;
const SAVE_KEY = 'ze_mineiro_save';

function saveGame() {
    const saveData = {
        version: SAVE_VERSION,
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
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        showSaveIndicator();
    } catch (e) {
        console.error("Erro ao salvar:", e);
    }
}

function loadGame() {
    const rawData = localStorage.getItem(SAVE_KEY);
    if (!rawData) {
        // Primeira vez - gera mundo novo
        world.generate();
        player.group.position.set(0, 10, 0);
        saveGame();
        return;
    }

    try {
        const data = JSON.parse(rawData);
        
        // Verificar versão
        if (data.version !== SAVE_VERSION) {
            console.warn("Save antigo detectado, gerando novo mundo");
            world.generate();
            player.group.position.set(0, 10, 0);
            saveGame();
            return;
        }

        // Restaurar inventário
        player.inventory = data.inventory;
        if (document.getElementById('count-wood')) document.getElementById('count-wood').innerText = player.inventory.wood;
        if (document.getElementById('count-stone')) document.getElementById('count-stone').innerText = player.inventory.stone;

        // Restaurar item selecionado
        player.selectedItem = data.selectedItem || 'wood';
        const slotNum = data.selectedItem === 'stone' ? 2 : 1;
        player.selectSlot(slotNum);

        // Restaurar posição e rotação
        player.group.position.set(data.playerPosition.x, data.playerPosition.y, data.playerPosition.z);
        player.group.rotation.y = data.playerRotation || 0;

        // Carregar mundo salvo
        world.loadWorld(data.terrain, data.trees, data.stones, data.destroyedResources);

        // Restaurar blocos construídos
        data.builtBlocks.forEach(b => {
            world.spawnBlock(b.x, b.y, b.z, b.type, true);
        });
        
        console.log("Progresso carregado com sucesso.");
    } catch (e) {
        console.error("Erro ao carregar save:", e);
        world.generate();
        player.group.position.set(0, 10, 0);
        saveGame();
    }
}

function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 1000);
    }
}

// Auto-save periódico (a cada 30 segundos)
setInterval(() => {
    saveGame();
}, 30000);

// Salvar ao fechar a janela
window.addEventListener('beforeunload', () => {
    saveGame();
});

// Carregar jogo
loadGame();

// --- EVENTOS DE INPUT ---
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Digit1') player.selectSlot(1);
    if (e.code === 'Digit2') player.selectSlot(2);
    if (e.code === 'KeyB') {
        buildMode = !buildMode;
        ghostBlock.visible = buildMode;
    }
});

window.addEventListener('keyup', (e) => keys[e.code] = false);

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        if (buildMode) {
            placeBlock();
        } else {
            isMining = true;
        }
    }
});
window.addEventListener('mouseup', () => isMining = false);

// --- FUNÇÕES DE LÓGICA ---

function placeBlock() {
    const type = player.selectedItem;
    if (player.inventory[type] > 0) {
        world.spawnBlock(ghostBlock.position.x, ghostBlock.position.y, ghostBlock.position.z, type, true);
        
        player.inventory[type]--;
        const el = document.getElementById(`count-${type}`);
        if (el) el.innerText = player.inventory[type];
        
        saveGame();
    }
}

function handleCameraObstruction() {
    obscuredObjects.forEach(obj => { if (obj.material) obj.material.opacity = 1.0; });
    obscuredObjects = [];

    const pPos = player.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const cPos = camera.position.clone();
    const dir = new THREE.Vector3().subVectors(pPos, cPos).normalize();
    
    cameraRay.set(cPos, dir);
    cameraRay.far = cPos.distanceTo(pPos);

    const intersects = cameraRay.intersectObjects(world.resources);
    intersects.forEach(hit => {
        if (hit.object.material && hit.object.material.transparent) {
            hit.object.material.opacity = 0.3;
            obscuredObjects.push(hit.object);
        }
    });
}

function update() {
    const oldPos = player.group.position.clone();
    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];

    if (keys['KeyA']) player.group.rotation.y += 0.05;
    if (keys['KeyD']) player.group.rotation.y -= 0.05;

    if (isMoving) {
        let dz = keys['KeyW'] ? -0.1 : (keys['KeyS'] ? 0.1 : 0);
        player.group.translateZ(dz);

        const dir = new THREE.Vector3(0, 0, dz > 0 ? 1 : -1).applyQuaternion(player.group.quaternion);
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), dir);
        const hits = ray.intersectObjects([...world.blocks, ...world.resources]);
        if (hits.length > 0 && hits[0].distance < 0.6) {
            player.group.position.x = oldPos.x;
            player.group.position.z = oldPos.z;
        }
    }

    ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0));
    const ground = ray.intersectObjects(world.blocks);
    if (ground.length > 0 && ground[0].distance <= 1.05) {
        vVel = 0;
        player.group.position.y = ground[0].point.y;
        if (keys['Space']) vVel = 0.15;
    } else {
        vVel -= 0.008;
    }
    vVel = Math.max(vVel, -0.5);
    player.group.position.y += vVel;

    if (player.group.position.y < -10) {
        player.group.position.set(0, 10, 0);
        vVel = 0;
    }

    if (isMining && !buildMode) {
        const look = new THREE.Vector3(0, 0, -1).applyQuaternion(player.group.quaternion);
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), look);
        ray.far = 2.5;
        const hits = ray.intersectObjects(world.resources);
        if (hits.length > 0) {
            const target = hits[0].object;
            const resourceId = `${target.position.x}_${target.position.y}_${target.position.z}`;
            
            if (target.userData.tree) {
                target.userData.tree.forEach(p => {
                    const partId = `${p.position.x}_${p.position.y}_${p.position.z}`;
                    world.destroyedResources.add(partId);
                    scene.remove(p);
                    world.resources = world.resources.filter(r => r !== p);
                    if (p.name === "wood") player.collect("wood");
                });
            } else {
                world.destroyedResources.add(resourceId);
                player.collect(target.name);
                scene.remove(target);
                world.resources = world.resources.filter(r => r !== target);
            }
            isMining = false;
            saveGame();
        }
    }

    if (buildMode) {
        const look = new THREE.Vector3(0, -0.5, -1).applyQuaternion(player.group.quaternion).normalize();
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), look);
        ray.far = 4;
        const hits = ray.intersectObjects(world.blocks);
        if (hits.length > 0) {
            const hit = hits[0];
            const pos = hit.object.position.clone().add(hit.face.normal);
            ghostBlock.position.copy(pos);
            ghostBlock.visible = true;
        } else {
            ghostBlock.visible = false;
        }
    }

    player.animate(isMoving, isMining);
    
    const camPos = new THREE.Vector3(0, 4, 8).applyQuaternion(player.group.quaternion).add(player.group.position);
    camera.position.lerp(camPos, 0.1);
    camera.lookAt(player.group.position.x, player.group.position.y + 1, player.group.position.z);

    handleCameraObstruction();
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.002;
    world.updateWater(time);
    update();
    renderer.render(scene, camera);
}

animate();