import * as THREE from 'three';
import { Player } from './Player.js';
import { World } from './World.js';

const API_URL = 'https://ze-mineiro-api.vercel.app/api';
const AUTH_URL = 'https://ze-mineiro-login.vercel.app/';

let token = sessionStorage.getItem('token');
if (!token) {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');
    if (token) sessionStorage.setItem('token', token);
    else window.location.href = AUTH_URL;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
scene.add(sun, new THREE.AmbientLight(0xffffff, 0.6));

const world = new World(scene);
const player = new Player(scene);

const keys = {};
let isMining = false;
let buildMode = false;
let vVel = 0;
const ray = new THREE.Raycaster();

function update() {
    const oldPos = player.group.position.clone();
    
    // DETECÇÃO DE ÁGUA
    player.isSubmerged = player.group.position.y < -0.5;
    
    // Efeito Visual de Água
    if (player.isSubmerged) {
        scene.fog = new THREE.Fog(0x0077be, 1, 20);
        scene.background.set(0x005588);
    } else {
        scene.fog = null;
        scene.background.set(0x87CEEB);
    }

    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
    let moveSpeed = player.isSubmerged ? 0.04 : 0.1;

    if (keys['KeyA']) player.group.rotation.y += 0.05;
    if (keys['KeyD']) player.group.rotation.y -= 0.05;

    if (isMoving) {
        let dz = keys['KeyW'] ? -moveSpeed : (keys['KeyS'] ? moveSpeed : 0);
        player.group.translateZ(dz);
        
        // Colisão simples
        ray.set(player.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 
                new THREE.Vector3(0, 0, dz > 0 ? 1 : -1).applyQuaternion(player.group.quaternion));
        const hits = ray.intersectObjects(world.blocks);
        if (hits.length > 0 && hits[0].distance < 0.6) {
            player.group.position.x = oldPos.x;
            player.group.position.z = oldPos.z;
        }
    }

    // GRAVIDADE VS NATAÇÃO
    ray.set(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0));
    const ground = ray.intersectObjects(world.blocks);
    
    if (ground.length > 0 && ground[0].distance <= 1.05) {
        vVel = 0;
        player.group.position.y = ground[0].point.y;
        if (keys['Space']) vVel = 0.15;
    } else {
        // Se estiver submerso, flutua/afunda mais devagar
        let gravity = player.isSubmerged ? 0.002 : 0.008;
        vVel -= gravity;
        
        if (player.isSubmerged && keys['Space']) {
            vVel = 0.04; // Propulsão para cima na água
        }
    }
    
    vVel = Math.max(vVel, player.isSubmerged ? -0.1 : -0.5);
    player.group.position.y += vVel;

    player.updateOxygen();
    player.animate(isMoving, isMining);
    
    // Câmera
    const camPos = new THREE.Vector3(0, 4, 8).applyQuaternion(player.group.quaternion).add(player.group.position);
    camera.position.lerp(camPos, 0.1);
    camera.lookAt(player.group.position.x, player.group.position.y + 1, player.group.position.z);
}

function animate() {
    requestAnimationFrame(animate);
    world.updateWater(performance.now() * 0.002);
    update();
    renderer.render(scene, camera);
}

// Iniciar
world.generate();
animate();

// Eventos de Input
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('mousedown', () => isMining = true);
window.addEventListener('mouseup', () => isMining = false);