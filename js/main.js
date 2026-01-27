import * as THREE from 'three';
import { Player } from './Player.js';
import { World } from './World.js';
import { Minimap } from './Minimap.js'; // Novo: minimapa

const API_URL = 'https://ze-mineiro-api.vercel.app/api';
const AUTH_URL = 'https://ze-mineiro-login.vercel.app/';

// Pegar dados da URL ou sessionStorage
const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get('token');
let username = urlParams.get('username');
let playerColors = null;

if (token) {
    // Dados vieram da URL, salvar no sessionStorage
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

// --- VARIÁVEIS GLOBAIS ---
let worldSeed = Math.floor(Math.random() * 1000000);
let isSwimming = false;
let swimTimer = 0;
const SWIM_MAX_TIME = 10; // Segundos que o player pode nadar antes de cansar
let swimStamina = SWIM_MAX_TIME;
let lastSwimUpdate = 0;

// --- CONFIGURAÇÃO INICIAL ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- ILUMINAÇÃO MELHORADA ---
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 50;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(sun, ambientLight);

// --- MUNDO E JOGADOR ---
const world = new World(scene);
const player = new Player(scene, playerColors);
let minimap = null; // Será inicializado após carregar o mundo

// --- UI ELEMENTOS ---
function createUI() {
    // Criar container de stamina de natação
    const swimStaminaContainer = document.createElement('div');
    swimStaminaContainer.id = 'swim-stamina-container';
    swimStaminaContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 200px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
        padding: 10px;
        display: none;
        z-index: 1000;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    const staminaLabel = document.createElement('div');
    staminaLabel.textContent = 'Stamina de Natação:';
    staminaLabel.style.marginBottom = '5px';
    staminaLabel.style.fontSize = '12px';
    
    const staminaBarContainer = document.createElement('div');
    staminaBarContainer.style.cssText = `
        width: 100%;
        height: 20px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        overflow: hidden;
    `;
    
    const staminaBar = document.createElement('div');
    staminaBar.id = 'swim-stamina-bar';
    staminaBar.style.cssText = `
        width: 100%;
        height: 100%;
        background: linear-gradient(to right, #3498db, #2ecc71);
        border-radius: 5px;
        transition: width 0.3s ease;
    `;
    
    const staminaText = document.createElement('div');
    staminaText.id = 'swim-stamina-text';
    staminaText.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
    `;
    
    staminaBar.appendChild(staminaText);
    staminaBarContainer.appendChild(staminaBar);
    swimStaminaContainer.appendChild(staminaLabel);
    swimStaminaContainer.appendChild(staminaBarContainer);
    
    // Aviso de stamina baixa
    const staminaWarning = document.createElement('div');
    staminaWarning.id = 'swim-stamina-warning';
    staminaWarning.style.cssText = `
        color: #e74c3c;
        font-size: 11px;
        margin-top: 5px;
        display: none;
        text-align: center;
    `;
    staminaWarning.textContent = '⚠️ Cuidado! Stamina baixa!';
    
    swimStaminaContainer.appendChild(staminaWarning);
    document.body.appendChild(swimStaminaContainer);
    
    // Atualizar barra de stamina
    window.updateSwimStamina = function() {
        const container = document.getElementById('swim-stamina-container');
        const bar = document.getElementById('swim-stamina-bar');
        const text = document.getElementById('swim-stamina-text');
        const warning = document.getElementById('swim-stamina-warning');
        
        if (!container || !bar || !text) return;
        
        const percent = (swimStamina / SWIM_MAX_TIME) * 100;
        bar.style.width = `${percent}%`;
        text.textContent = `${swimStamina.toFixed(1)}s / ${SWIM_MAX_TIME}s`;
        
        // Mudar cor baseado na stamina
        if (percent > 50) {
            bar.style.background = 'linear-gradient(to right, #3498db, #2ecc71)';
        } else if (percent > 20) {
            bar.style.background = 'linear-gradient(to right, #f39c12, #e67e22)';
        } else {
            bar.style.background = 'linear-gradient(to right, #e74c3c, #c0392b)';
            warning.style.display = 'block';
        }
        
        if (percent > 20) {
            warning.style.display = 'none';
        }
    };
    
    // Mostrar/ocultar container de stamina
    window.toggleSwimStamina = function(show) {
        const container = document.getElementById('swim-stamina-container');
        if (container) {
            container.style.display = show ? 'block' : 'none';
            updateSwimStamina();
        }
    };
}

// Chamar criação da UI
createUI();

// --- ESTADOS E VARIÁVEIS ---
const keys = {};
let isMining = false;
let buildMode = false;
let obscuredObjects = [];
let vVel = 0;
let isInWater = false;
let waterSurfaceHeight = -0.5; // Altura da superfície da água

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
const SAVE_VERSION = 2; // Atualizado para versão 2 com suporte a múltiplas ilhas

async function saveGame() {
    const saveData = {
        version: SAVE_VERSION,
        worldSeed: worldSeed,
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
            // Primeira vez - gera mundo novo com múltiplas ilhas
            worldSeed = Math.floor(Math.random() * 1000000);
            world.generate(worldSeed);
            player.group.position.set(0, 10, 0);
            await saveGame();
            
            // Inicializar minimapa após gerar mundo
            setTimeout(() => {
                minimap = new Minimap(scene, 70);
            }, 100);
            return;
        }

        // Verificar versão do save
        if (data.version < 2) {
            console.warn("Save antigo detectado, convertendo para novo formato...");
            worldSeed = data.worldSeed || Math.floor(Math.random() * 1000000);
            world.generate(worldSeed); // Gerar mundo com múltiplas ilhas
            player.inventory = data.inventory || { wood: 0, stone: 0 };
            player.group.position.set(
                data.playerPosition?.x || 0,
                data.playerPosition?.y || 10,
                data.playerPosition?.z || 0
            );
            await saveGame();
            
            setTimeout(() => {
                minimap = new Minimap(scene, 70);
            }, 100);
            return;
        }

        // Restaurar inventário
        player.inventory = data.inventory || { wood: 0, stone: 0 };
        if (document.getElementById('count-wood')) document.getElementById('count-wood').innerText = player.inventory.wood;
        if (document.getElementById('count-stone')) document.getElementById('count-stone').innerText = player.inventory.stone;

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
        worldSeed = data.worldSeed || Math.floor(Math.random() * 1000000);

        // Carregar mundo salvo
        world.loadWorld(data.terrain, data.trees, data.stones, data.destroyedResources);

        // Restaurar blocos construídos
        if (data.builtBlocks) {
            data.builtBlocks.forEach(b => {
                world.spawnBlock(b.x, b.y, b.z, b.type, true);
            });
        }
        
        console.log("Progresso carregado com sucesso.");
        
        // Inicializar minimapa após carregar mundo
        setTimeout(() => {
            minimap = new Minimap(scene, 70);
        }, 100);
        
    } catch (e) {
        console.error("Erro ao carregar save:", e);
        worldSeed = Math.floor(Math.random() * 1000000);
        world.generate(worldSeed);
        player.group.position.set(0, 10, 0);
        await saveGame();
        
        setTimeout(() => {
            minimap = new Minimap(scene, 70);
        }, 100);
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
    
    // Teclas de slot
    if (e.code === 'Digit1') player.selectSlot(1);
    if (e.code === 'Digit2') player.selectSlot(2);
    
    // Modo construção
    if (e.code === 'KeyB') {
        buildMode = !buildMode;
        ghostBlock.visible = buildMode;
        console.log(`Modo construção: ${buildMode ? 'ATIVADO' : 'DESATIVADO'}`);
    }
    
    // Natação mais rápida (segurar Shift na água)
    if (e.code === 'ShiftLeft' && isSwimming) {
        console.log('Natação rápida ativada');
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        if (buildMode) {
            placeBlock();
        } else {
            isMining = true;
        }
    }
});

window.addEventListener('mouseup', () => {
    isMining = false;
});

// Redimensionamento da janela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- FUNÇÕES DE LÓGICA ---

function placeBlock() {
    const type = player.selectedItem;
    if (player.inventory[type] > 0) {
        // Verificar se o bloco está na água
        const blockPos = ghostBlock.position.clone();
        const isUnderwater = blockPos.y < waterSurfaceHeight;
        
        // Não permitir construção debaixo d'água (a menos que seja pedra)
        if (isUnderwater && type !== 'stone') {
            console.log('Só é possível construir com pedra debaixo d\'água');
            return;
        }
        
        world.spawnBlock(blockPos.x, blockPos.y, blockPos.z, type, true);
        
        player.inventory[type]--;
        const el = document.getElementById(`count-${type}`);
        if (el) el.innerText = player.inventory[type];
        
        saveGame();
    } else {
        console.log(`Não há ${type} suficiente no inventário!`);
    }
}

function handleCameraObstruction() {
    // Restaurar objetos anteriormente obscurecidos
    obscuredObjects.forEach(obj => { 
        if (obj.material) obj.material.opacity = 1.0; 
    });
    obscuredObjects = [];

    // Posição dos olhos do jogador
    const eyePos = player.group.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const camPos = camera.position.clone();
    const dir = new THREE.Vector3().subVectors(eyePos, camPos).normalize();
    
    // Verificar obstrução
    cameraRay.set(camPos, dir);
    cameraRay.far = camPos.distanceTo(eyePos);

    const intersects = cameraRay.intersectObjects(world.resources);
    intersects.forEach(hit => {
        if (hit.object.material && hit.object.material.transparent) {
            hit.object.material.opacity = 0.3;
            obscuredObjects.push(hit.object);
        }
    });
}

// NOVA FUNÇÃO: Verificar se o jogador está na água
function checkWaterCollision() {
    const playerPos = player.group.position.clone();
    const playerFeetY = playerPos.y - 0.5; // Altura dos pés
    const playerHeadY = playerPos.y + 1.8; // Altura da cabeça
    
    // Verificar se o jogador está na água (entre os pés e a cabeça)
    isInWater = false;
    const currentTime = performance.now();
    
    world.waterBlocks.forEach(water => {
        const waterY = water.position.y + 0.5; // Centro do bloco de água
        const distanceXZ = Math.sqrt(
            Math.pow(playerPos.x - water.position.x, 2) +
            Math.pow(playerPos.z - water.position.z, 2)
        );
        
        // Se o jogador está acima deste bloco de água
        if (distanceXZ < 0.8) {
            if (playerFeetY < waterY && playerHeadY > water.position.y) {
                isInWater = true;
                
                // Efeito de flutuação
                if (playerPos.y < waterY - 0.3) {
                    const buoyancy = 0.008; // Força de flutuação
                    vVel = Math.min(vVel + buoyancy, 0.05);
                }
                
                // Aplicar resistência da água
                if (Math.abs(vVel) > 0.01) {
                    vVel *= 0.95; // Resistência da água
                }
                
                // Atualizar stamina de natação
                if (currentTime - lastSwimUpdate > 1000) { // Atualizar a cada segundo
                    if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
                        isSwimming = true;
                        const staminaCost = keys['ShiftLeft'] ? 0.2 : 0.1; // Natação rápida custa mais
                        swimStamina = Math.max(0, swimStamina - staminaCost);
                        lastSwimUpdate = currentTime;
                    }
                }
            }
        }
    });
    
    // Se não está na água, recuperar stamina
    if (!isInWater && isSwimming) {
        isSwimming = false;
        swimTimer = 0;
        if (currentTime - lastSwimUpdate > 1000) {
            swimStamina = Math.min(SWIM_MAX_TIME, swimStamina + 0.3); // Recuperar stamina
            lastSwimUpdate = currentTime;
        }
    }
    
    // Atualizar UI da stamina
    if (isSwimming || swimStamina < SWIM_MAX_TIME) {
        toggleSwimStamina(true);
        updateSwimStamina();
    } else {
        toggleSwimStamina(false);
    }
    
    // Se stamina zerar, afundar
    if (swimStamina <= 0 && isSwimming) {
        vVel = -0.03; // Afundar lentamente
        // Mostrar aviso de afogamento
        console.warn('⚠️ Stamina esgotada! O jogador está se afogando!');
    }
}

// NOVA FUNÇÃO: Movimento na água
function handleWaterMovement() {
    if (!isInWater || !isSwimming) return;
    
    // Movimento mais lento na água
    const swimSpeed = keys['ShiftLeft'] ? 0.08 : 0.05; // Natação rápida com Shift
    
    // Verificar colisões mesmo na água
    const oldPos = player.group.position.clone();
    
    if (keys['KeyW']) {
        player.group.translateZ(-swimSpeed);
    }
    if (keys['KeyS']) {
        player.group.translateZ(swimSpeed);
    }
    
    // Rotação lateral
    if (keys['KeyA']) {
        player.group.rotation.y += 0.04;
    }
    if (keys['KeyD']) {
        player.group.rotation.y -= 0.04;
    }
    
    // Nado vertical
    if (keys['Space'] && swimStamina > 0) {
        vVel = 0.08; // Subir na água
        swimStamina = Math.max(0, swimStamina - 0.05);
    }
    if (keys['ControlLeft'] && swimStamina > 0) {
        vVel = -0.08; // Descer na água
        swimStamina = Math.max(0, swimStamina - 0.05);
    }
}

function update() {
    const oldPos = player.group.position.clone();
    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
    const currentTime = performance.now();

    // 1. Verificar se está na água
    checkWaterCollision();
    
    // 2. Se estiver nadando, usar movimentação na água
    if (isSwimming) {
        handleWaterMovement();
    } else {
        // 3. Movimentação normal em terra
        if (keys['KeyA']) player.group.rotation.y += 0.05;
        if (keys['KeyD']) player.group.rotation.y -= 0.05;

        if (isMoving) {
            let dz = keys['KeyW'] ? -0.1 : (keys['KeyS'] ? 0.1 : 0);
            player.group.translateZ(dz);

            // Verificar colisões
            const dir = new THREE.Vector3(0, 0, dz > 0 ? 1 : -1).applyQuaternion(player.group.quaternion);
            ray.set(player.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), dir);
            const hits = ray.intersectObjects([...world.blocks, ...world.resources]);
            if (hits.length > 0 && hits[0].distance < 0.6) {
                player.group.position.x = oldPos.x;
                player.group.position.z = oldPos.z;
            }
        }
    }

    // 4. Física de gravidade/flutuação
    if (!isInWater) {
        // Verificar se está no chão
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0));
        const ground = ray.intersectObjects(world.blocks);
        
        if (ground.length > 0 && ground[0].distance <= 1.05) {
            vVel = 0;
            player.group.position.y = ground[0].point.y;
            if (keys['Space']) vVel = 0.15; // Pulo normal
        } else {
            vVel -= 0.008; // Gravidade
        }
        vVel = Math.max(vVel, -0.5);
    }
    
    // Aplicar velocidade vertical
    player.group.position.y += vVel;

    // 5. Sistema de respawn se cair no vazio
    if (player.group.position.y < -20) {
        // Encontrar a ilha mais próxima para respawn
        const islands = [
            { x: 0, z: 0 },
            { x: 30, z: 30 },
            { x: -30, z: 30 },
            { x: 30, z: -30 },
            { x: -30, z: -30 }
        ];
        
        let nearestIsland = islands[0];
        let minDist = Infinity;
        
        islands.forEach(island => {
            const dist = Math.sqrt(
                Math.pow(player.group.position.x - island.x, 2) +
                Math.pow(player.group.position.z - island.z, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                nearestIsland = island;
            }
        });
        
        player.group.position.set(nearestIsland.x, 10, nearestIsland.z);
        vVel = 0;
        swimStamina = SWIM_MAX_TIME; // Resetar stamina
        console.log('Respawn na ilha mais próxima');
    }

    // 6. Sistema de mineração
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

    // 7. Sistema de construção
    if (buildMode) {
        const look = new THREE.Vector3(0, -0.5, -1).applyQuaternion(player.group.quaternion).normalize();
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), look);
        ray.far = 4;
        const hits = ray.intersectObjects(world.blocks);
        if (hits.length > 0) {
            const hit = hits[0];
            const pos = hit.object.position.clone().add(hit.face.normal);
            
            // Não permitir construção dentro do jogador
            const distToPlayer = pos.distanceTo(player.group.position);
            if (distToPlayer > 1.5) {
                ghostBlock.position.copy(pos);
                ghostBlock.visible = true;
                
                // Mudar cor do ghost block se não puder construir
                const canBuild = player.inventory[player.selectedItem] > 0;
                ghostBlock.material.color.setHex(canBuild ? 0xffffff : 0xff0000);
            } else {
                ghostBlock.visible = false;
            }
        } else {
            ghostBlock.visible = false;
        }
    }

    // 8. Animações do jogador
    player.animate(isMoving || isSwimming, isMining);
    
    // 9. Câmera
    const camDistance = isSwimming ? 6 : 8; // Câmera mais perto quando nadando
    const camHeight = isSwimming ? 3 : 4; // Câmera mais baixa quando nadando
    const camPos = new THREE.Vector3(0, camHeight, camDistance)
        .applyQuaternion(player.group.quaternion)
        .add(player.group.position);
    
    camera.position.lerp(camPos, 0.1);
    camera.lookAt(player.group.position.x, player.group.position.y + 1, player.group.position.z);

    // 10. Atualizar minimapa
    if (minimap) {
        const islands = [
            { x: 0, z: 0 },
            { x: 30, z: 30 },
            { x: -30, z: 30 },
            { x: 30, z: -30 },
            { x: -30, z: -30 }
        ];
        minimap.update(player.group.position, islands);
    }

    // 11. Lidar com obstrução de câmera
    handleCameraObstruction();
    
    // 12. Atualizar UI
    updateSwimStamina();
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.002;
    world.updateWater(time);
    update();
    renderer.render(scene, camera);
}

// Iniciar animação
animate();