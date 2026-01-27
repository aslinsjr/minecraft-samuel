import * as THREE from 'three';

// --- Configuração da Cena ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Luzes ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// --- Materiais ---
const yellowMat = new THREE.MeshStandardMaterial({ color: 0xFFDE00 });
const blackMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
const brownMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

// --- Grupo Principal (Pikachu) ---
const pikachu = new THREE.Group();

// Corpo
const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.8), yellowMat);
pikachu.add(body);

// Cabeça
const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), yellowMat);
head.position.y = 1;
pikachu.add(head);

// Orelhas
const createEar = (x) => {
    const ear = new THREE.Group();
    const earBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.1), yellowMat);
    const earTip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), blackMat);
    earTip.position.y = 0.35;
    ear.add(earBase, earTip);
    ear.position.set(x, 1.5, 0);
    ear.rotation.z = x > 0 ? -0.3 : 0.3;
    return ear;
};
pikachu.add(createEar(0.3), createEar(-0.3));

// Bochechas e Olhos
const cheekGeo = new THREE.PlaneGeometry(0.2, 0.2);
const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

const leftCheek = new THREE.Mesh(cheekGeo, redMat);
leftCheek.position.set(-0.3, 0.85, 0.41);
pikachu.add(leftCheek);

const rightCheek = new THREE.Mesh(cheekGeo, redMat);
rightCheek.position.set(0.3, 0.85, 0.41);
pikachu.add(rightCheek);

const leftEye = new THREE.Mesh(eyeGeo, blackMat);
leftEye.position.set(-0.25, 1.1, 0.4);
pikachu.add(leftEye);

const rightEye = new THREE.Mesh(eyeGeo, blackMat);
rightEye.position.set(0.25, 1.1, 0.4);
pikachu.add(rightEye);

// --- NOVAS ATUALIZAÇÕES: Patas ---

const createLimb = (width, height, depth, x, y, z) => {
    const limb = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), yellowMat);
    limb.position.set(x, y, z);
    return limb;
};

// Braços (Patas dianteiras)
const leftArm = createLimb(0.2, 0.4, 0.2, -0.45, 0.2, 0.35);
leftArm.rotation.z = 0.4; 
pikachu.add(leftArm);

const rightArm = createLimb(0.2, 0.4, 0.2, 0.45, 0.2, 0.35);
rightArm.rotation.z = -0.4;
pikachu.add(rightArm);

// Pernas (Patas traseiras)
const leftLeg = createLimb(0.35, 0.2, 0.5, -0.3, -0.6, 0.2);
pikachu.add(leftLeg);

const rightLeg = createLimb(0.35, 0.2, 0.5, 0.3, -0.6, 0.2);
pikachu.add(rightLeg);

// --- Cauda ---
const tail = new THREE.Group();
const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.1), brownMat);
const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), yellowMat);
p2.position.set(0.2, 0.3, 0);
tail.add(p1, p2);
tail.position.set(0, -0.3, -0.5);
tail.rotation.x = 0.5;
pikachu.add(tail);

scene.add(pikachu);

// --- Animação e Renderização ---
camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

function animate() {
    requestAnimationFrame(animate);
    
    // Animação de rotação e pulo
    pikachu.rotation.y += 0.01;
    pikachu.position.y = Math.sin(Date.now() * 0.005) * 0.15;
    
    // Pequeno balanço nos braços para dar vida
    leftArm.rotation.x = Math.sin(Date.now() * 0.005) * 0.2;
    rightArm.rotation.x = Math.sin(Date.now() * 0.005) * 0.2;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();