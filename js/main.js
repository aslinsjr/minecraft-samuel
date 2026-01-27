import * as THREE from 'three';
import { Player } from './Player.js';
import { World } from './World.js';

const API_URL = 'https://ze-mineiro-api.vercel.app/api';
const AUTH_URL = 'https://ze-mineiro-login.vercel.app/'; // Configurar URL da auth aqui

// Pegar dados da URL ou sessionStorage
const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get('token');
let username = urlParams.get('username');
let playerColors = null;

if (token) {
    // Dados vieram da URL, salvar no sessionStorage
    sessionStorage.setItem('token', token);
    if (username) sessionStorage.setItem('username', username);

    document.getElementById('username-display').textContent = `Jogador: ${username}`;
    
    const colorsParam = urlParams.get('colors');
    if (colorsParam) {
        try {
            playerColors = JSON.parse(colorsParam);
            sessionStorage.setItem('playerColors', colorsParam);
        } catch (e) {
            console.error('Erro ao parsear cores:', e);
        }
    }
    
    // Limpar URL
    window.history.replaceState({}, document.title, window.location.pathname);
} else {
    // Tentar pegar do sessionStorage
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

// Se não tem token, redirecionar para auth
if (!token) {
    window.location.href = AUTH_URL;
}

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
const player = new Player(scene, playerColors);

// --- ESTADOS E VARIÁVEIS ---
const keys = {};
let isMining = false;
let buildMode = false;
let obscuredObjects = [];
let vVel = 0;
let currentMode = 'mining'; // 'mining' ou 'building'

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

// --- SISTEMA DE PERSISTÊNCIA COM API ---
const SAVE_VERSION = 1;

async function saveGame() {
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
        const response = await fetch(`${API_URL}/game/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(saveData)
        });

        if (response.ok) {
            showSaveIndicator();
        } else if (response.status === 401) {
            // Token inválido, redirecionar para login
            sessionStorage.clear();
            window.location.href = AUTH_URL;
        } else {
            console.error('Erro ao salvar no servidor');
        }
    } catch (e) {
        console.error("Erro ao salvar:", e);
    }
}

async function loadGame() {
    try {
        const response = await fetch(`${API_URL}/game/load`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token inválido
                sessionStorage.clear();
                window.location.href = AUTH_URL;
                return;
            }
            throw new Error('Erro ao carregar');
        }

        const data = await response.json();
        
        if (data.firstTime) {
            // Primeira vez - gera mundo novo
            world.generate();
            player.group.position.set(0, 10, 0);
            await saveGame();
            return;
        }

        // Verificar versão
        if (data.version !== SAVE_VERSION) {
            console.warn("Save antigo detectado, gerando novo mundo");
            world.generate();
            player.group.position.set(0, 10, 0);
            await saveGame();
            return;
        }

        console.log(data)

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
        await saveGame();
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

// --- FUNÇÕES UI/UX ---

function updateModeIndicator() {
    const miningEl = document.getElementById('mining-mode');
    const buildingEl = document.getElementById('building-mode');
    
    if (miningEl && buildingEl) {
        if (currentMode === 'mining') {
            miningEl.classList.add('active');
            buildingEl.classList.remove('active');
        } else {
            buildingEl.classList.add('active');
            miningEl.classList.remove('active');
        }
    }
}

function showModeFeedback(mode) {
    const feedback = document.getElementById('mode-feedback');
    if (feedback) {
        feedback.textContent = mode === 'building' ? '🧱 Modo Construção Ativado' : '⛏️ Modo Mineração Ativado';
        feedback.style.opacity = '1';
        setTimeout(() => {
            feedback.style.opacity = '0';
        }, 1500);
    }
}

// function showMiningFeedback() {
//     const feedback = document.createElement('div');
//     feedback.id = 'mining-feedback';
//     feedback.style.cssText = `
//         position: fixed;
//         top: 50%;
//         left: 50%;
//         transform: translate(-50%, -50%);
//         color: white;
//         font-size: 24px;
//         text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
//         pointer-events: none;
//         opacity: 0;
//         transition: opacity 0.3s;
//         z-index: 1000;
//     `;
//     feedback.textContent = '⛏️';
//     document.body.appendChild(feedback);
    
//     // Animação
//     setTimeout(() => {
//         feedback.style.opacity = '1';
//         setTimeout(() => {
//             feedback.style.opacity = '0';
//             setTimeout(() => {
//                 if (feedback.parentNode) {
//                     feedback.parentNode.removeChild(feedback);
//                 }
//             }, 300);
//         }, 200);
//     }, 10);
// }

function setupSlotClickHandlers() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => {
        slot.addEventListener('click', (e) => {
            const slotId = e.currentTarget.id;
            if (slotId === 'slot-1') {
                player.selectSlot(1);
                document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
                document.getElementById('slot-1').classList.add('selected');
            } else if (slotId === 'slot-2') {
                player.selectSlot(2);
                document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
                document.getElementById('slot-2').classList.add('selected');
            }
        });
    });
}

// --- INICIALIZAÇÃO UI ---
function initializeUI() {
    // Inicializar indicador de modo
    updateModeIndicator();
    
    // Configurar handlers de clique nos slots
    setupSlotClickHandlers();
    
    // Configurar inventário inicial
    if (document.getElementById('count-wood')) {
        document.getElementById('count-wood').innerText = player.inventory.wood;
    }
    if (document.getElementById('count-stone')) {
        document.getElementById('count-stone').innerText = player.inventory.stone;
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

// Inicializar UI após o carregamento
setTimeout(() => {
    initializeUI();
}, 500);

// --- EVENTOS DE INPUT ---
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Seleção de slot por teclado
    if (e.code === 'Digit1') {
        player.selectSlot(1);
        // Atualizar seleção visual
        document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
        const activeSlot = document.getElementById('slot-1');
        if (activeSlot) activeSlot.classList.add('selected');
    }
    if (e.code === 'Digit2') {
        player.selectSlot(2);
        // Atualizar seleção visual
        document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
        const activeSlot = document.getElementById('slot-2');
        if (activeSlot) activeSlot.classList.add('selected');
    }
    
    // Alternar modo construção/mineração
    if (e.code === 'KeyB') {
        buildMode = !buildMode;
        ghostBlock.visible = buildMode;
        currentMode = buildMode ? 'building' : 'mining';
        updateModeIndicator();
        showModeFeedback(currentMode);
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
        
        // Feedback visual
        const feedback = document.getElementById('place-feedback');
        if (feedback) {
            feedback.textContent = '🧱 Bloco Colocado!';
            feedback.style.opacity = '1';
            setTimeout(() => {
                feedback.style.opacity = '0';
            }, 800);
        }
        
        saveGame();
    } else {
        // Feedback de falta de recursos
        const feedback = document.getElementById('place-feedback');
        if (feedback) {
            feedback.textContent = '❌ Sem recursos!';
            feedback.style.opacity = '1';
            setTimeout(() => {
                feedback.style.opacity = '0';
            }, 800);
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

// Redimensionamento da janela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});