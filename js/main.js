import * as THREE from 'three';
import { Player } from './Player.js';
import { World } from './World.js';
import { InputHandler } from './InputHandler.js';
import { MobileControls } from './MobileControls.js';
import { UIManager } from './UIManager.js';
import { SaveManager } from './SaveManager.js';

// Configurações
const API_URL = 'https://ze-mineiro-api.vercel.app/api';
const AUTH_URL = 'https://ze-mineiro-login.vercel.app/';

// Autenticação
const { token, username, playerColors } = getAuthData();
if (!token) {
    window.location.href = AUTH_URL;
}

// Cena Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Iluminação
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
scene.add(sun, new THREE.AmbientLight(0xffffff, 0.6));

// Inicializar componentes do jogo
const world = new World(scene);
const player = new Player(scene, playerColors);
const inputHandler = new InputHandler();
const mobileControls = new MobileControls(inputHandler);
const uiManager = new UIManager(player);
const saveManager = new SaveManager(API_URL, AUTH_URL, token);

// Conectar save manager aos objetos do jogo
saveManager.setGameObjects(player, world);
saveManager.onSaveSuccess = () => uiManager.showSaveIndicator();

// Atualizar UI com username
uiManager.updateUsername(username);

// Estado do jogo
let vVel = 0;
let obscuredObjects = [];
const ray = new THREE.Raycaster();
const cameraRay = new THREE.Raycaster();

// Ghost block para construção
const ghostBlock = createGhostBlock();
scene.add(ghostBlock);

// Conectar eventos
setupEventHandlers();

// Carregar jogo
initializeGame();

// Loop de animação
animate();

// ========== FUNÇÕES ==========

function getAuthData() {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token');
    let username = urlParams.get('username');
    let playerColors = null;

    if (token) {
        sessionStorage.setItem('token', token);
        if (username) sessionStorage.setItem('username', username);
        
        const colorsParam = urlParams.get('colors');
        if (colorsParam) {
            try {
                playerColors = JSON.parse(colorsParam);
                sessionStorage.setItem('playerColors', colorsParam);
            } catch (e) {
                console.error('Erro ao parsear cores:', e);
            }
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        token = sessionStorage.getItem('token');
        username = sessionStorage.getItem('username');
        
        const colorsStr = sessionStorage.getItem('playerColors');
        if (colorsStr) {
            try {
                playerColors = JSON.parse(colorsStr);
            } catch (e) {
                console.error('Erro ao carregar cores:', e);
            }
        }
    }

    return { token, username, playerColors };
}

function createGhostBlock() {
    const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const ghostMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.5 
    });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    ghost.visible = false;
    return ghost;
}

function setupEventHandlers() {
    // Eventos de input
    inputHandler.onSlotSelect = (slot) => uiManager.selectSlot(slot);
    inputHandler.onPlaceBlock = () => placeBlock();
    inputHandler.onModeChange = (mode) => {
        ghostBlock.visible = mode === 'building';
        uiManager.switchMode(mode);
    };

    // Eventos de UI
    uiManager.onModeChange = (mode) => {
        inputHandler.buildMode = mode === 'building';
        ghostBlock.visible = mode === 'building';
    };

    // Redimensionamento
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

async function initializeGame() {
    const saveData = await saveManager.load();
    
    if (saveData?.firstTime) {
        world.generate();
        player.group.position.set(0, 10, 0);
        await saveManager.save();
    } else if (saveData) {
        loadSaveData(saveData);
    }
}

function loadSaveData(data) {
    // Restaurar inventário
    player.inventory = data.inventory;
    uiManager.updateInventoryDisplay();

    // Restaurar item selecionado
    player.selectedItem = data.selectedItem || 'wood';
    const slotNum = data.selectedItem === 'stone' ? 2 : 1;
    uiManager.selectSlot(slotNum);

    // Restaurar posição e rotação
    player.group.position.set(data.playerPosition.x, data.playerPosition.y, data.playerPosition.z);
    player.group.rotation.y = data.playerRotation || 0;

    // Carregar mundo
    world.loadWorld(data.terrain, data.trees, data.stones, data.destroyedResources);

    // Restaurar blocos construídos
    data.builtBlocks.forEach(b => {
        world.spawnBlock(b.x, b.y, b.z, b.type, true);
    });
    
    console.log("Progresso carregado com sucesso.");
}

function placeBlock() {
    const type = player.selectedItem;
    if (player.inventory[type] > 0) {
        world.spawnBlock(ghostBlock.position.x, ghostBlock.position.y, ghostBlock.position.z, type, true);
        
        player.inventory[type]--;
        uiManager.updateInventoryDisplay();
        uiManager.showFeedback('🧱 Bloco Colocado!', 800);
        
        saveManager.save();
    } else {
        uiManager.showFeedback('❌ Sem recursos!', 800);
    }
}

function handleMovement() {
    const oldPos = player.group.position.clone();
    const isMoving = inputHandler.isMoving();

    // Rotação
    let rotation = inputHandler.getRotationInput();
    rotation += mobileControls.getRotationDelta();
    player.group.rotation.y += rotation;

    // Movimento
    if (isMoving) {
        const dz = inputHandler.getForwardInput();
        player.group.translateZ(dz);

        // Colisão
        const dir = new THREE.Vector3(0, 0, dz > 0 ? 1 : -1).applyQuaternion(player.group.quaternion);
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), dir);
        const hits = ray.intersectObjects([...world.blocks, ...world.resources]);
        if (hits.length > 0 && hits[0].distance < 0.6) {
            player.group.position.x = oldPos.x;
            player.group.position.z = oldPos.z;
        }
    }

    return isMoving;
}

function handleGravity() {
    ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0));
    const ground = ray.intersectObjects(world.blocks);
    
    if (ground.length > 0 && ground[0].distance <= 1.05) {
        vVel = 0;
        player.group.position.y = ground[0].point.y;
        if (inputHandler.isJumping()) vVel = 0.15;
    } else {
        vVel -= 0.008;
    }
    
    vVel = Math.max(vVel, -0.5);
    player.group.position.y += vVel;

    // Reset se cair
    if (player.group.position.y < -10) {
        player.group.position.set(0, 10, 0);
        vVel = 0;
    }
}

function handleMining() {
    if (inputHandler.isMining && !inputHandler.buildMode) {
        const look = new THREE.Vector3(0, 0, -1).applyQuaternion(player.group.quaternion);
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), look);
        ray.far = 2.5;
        const hits = ray.intersectObjects(world.resources);
        
        if (hits.length > 0) {
            const target = hits[0].object;
            const resourceId = `${target.position.x}_${target.position.y}_${target.position.z}`;
            
            const isUserBlock = world.userBlocks.includes(target);
            
            if (target.userData.tree) {
                target.userData.tree.forEach(p => {
                    const partId = `${p.position.x}_${p.position.y}_${p.position.z}`;
                    world.destroyedResources.add(partId);
                    scene.remove(p);
                    world.resources = world.resources.filter(r => r !== p);
                    if (p.name === "wood") player.collect("wood");
                });
            } else {
                if (isUserBlock) {
                    world.userBlocks = world.userBlocks.filter(b => b !== target);
                }
                
                world.destroyedResources.add(resourceId);
                player.collect(target.name);
                scene.remove(target);
                world.resources = world.resources.filter(r => r !== target);
                world.blocks = world.blocks.filter(b => b !== target);
            }
            
            inputHandler.isMining = false;
            uiManager.updateInventoryDisplay();
            saveManager.save();
        }
    }
}

function handleBuilding() {
    if (inputHandler.buildMode) {
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

function updateCamera() {
    const camPos = new THREE.Vector3(0, 4, 8).applyQuaternion(player.group.quaternion).add(player.group.position);
    camera.position.lerp(camPos, 0.1);
    camera.lookAt(player.group.position.x, player.group.position.y + 1, player.group.position.z);
}

function update() {
    const isMoving = handleMovement();
    handleGravity();
    handleMining();
    handleBuilding();
    player.animate(isMoving, inputHandler.isMining);
    updateCamera();
    handleCameraObstruction();
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.002;
    world.updateWater(time);
    update();
    renderer.render(scene, camera);
}