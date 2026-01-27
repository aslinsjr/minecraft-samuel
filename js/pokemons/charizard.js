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
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- Materiais ---
const orangeMat = new THREE.MeshStandardMaterial({ color: 0xFF7043 });
const blueMat = new THREE.MeshStandardMaterial({ color: 0x42A5F5 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00 });
const yellowMat = new THREE.MeshStandardMaterial({ color: 0xFFD600 });
const hornMat = new THREE.MeshStandardMaterial({ color: 0xBDBDBD });
const wingMat = new THREE.MeshStandardMaterial({ color: 0xF44336, transparent: true, opacity: 0.8 });

// --- Grupo Principal (Charizard) ---
const charizard = new THREE.Group();

// --- Grupo do Tronco (Atualizado com Pescoço Longo) ---
const upperBody = new THREE.Group();

// 1. Corpo (Base do tronco)
const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.1), orangeMat);
upperBody.add(body);

// 2. Pescoço (O novo segmento alongado)
const neckGroup = new THREE.Group();
const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), orangeMat);
neck.position.y = 0.6; // Estende para cima do corpo
neckGroup.add(neck);

// 3. Cabeça (Agora presa ao topo do pescoço)
const headGroup = new THREE.Group();
const head = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.9), orangeMat);
const snout = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), orangeMat);
snout.position.set(0, -0.2, 0.6);
headGroup.add(head, snout);

// Olhos e Chifres (Mantendo a lógica anterior)
const eyeGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1);
const lEye = new THREE.Mesh(eyeGeo, redMat); lEye.position.set(-0.25, 0.1, 0.45);
const rEye = new THREE.Mesh(eyeGeo, redMat); rEye.position.set(0.25, 0.1, 0.45);
headGroup.add(lEye, rEye);

const createHorn = (x) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), hornMat);
    horn.position.set(x, 0.5, -0.1);
    horn.rotation.x = -0.5;
    return horn;
};
headGroup.add(createHorn(0.3), createHorn(-0.3));

// Posicionando a cabeça no topo do pescoço
headGroup.position.y = 1.2; 
headGroup.rotation.x = 0.4; // Olhando para frente
neckGroup.add(headGroup);

// Posicionando o pescoço no corpo
neckGroup.position.y = 0.8;
neckGroup.rotation.x = 0.2; // Uma leve inclinação orgânica para frente
upperBody.add(neckGroup);


// 2. Barriga
const belly = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.4), blueMat);
belly.position.z = 0.5;
upperBody.add(belly);

// 4. Braços (Garras erguidas)
const createArm = (x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), orangeMat);
    arm.position.set(x * 0.8, 0.3, 0.5);
    arm.rotation.x = 0.8;
    return arm;
};
upperBody.add(createArm(1), createArm(-1));

// 5. Asas
const createWing = (xM) => {
    const wing = new THREE.Group();
    const part = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.1), wingMat);
    part.position.set(1 * xM, 0, 0);
    wing.add(part);
    wing.position.set(0.5 * xM, 0.5, -0.5);
    return wing;
};
const leftWing = createWing(-1);
const rightWing = createWing(1);
upperBody.add(leftWing, rightWing);

// Inclinação final do tronco
upperBody.rotation.x = 0;
upperBody.position.y = 0.5;
charizard.add(upperBody);

// --- Partes Fixas (Base) ---

// 6. Patas Traseiras (Suporte)
const createLeg = (x) => {
    const leg = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.6), orangeMat);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.8), hornMat);
    foot.position.set(0, -0.4, 0.2);
    leg.add(thigh, foot);
    leg.position.set(x, -0.6, 0.1);
    return leg;
};
charizard.add(createLeg(0.7), createLeg(-0.7));

// 7. Cauda (Apoiada no chão para equilíbrio)
const tail = new THREE.Group();
const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1), orangeMat);
const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1), orangeMat);
t2.position.set(0, 0.2, -0.8);
t2.rotation.x = 0.5;
tail.add(t1, t2);

// Fogo da cauda
const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), redMat);
flame.position.set(0, 0.6, -1.5);
tail.add(flame);

tail.position.set(0, -0.7, -0.4);
charizard.add(tail);

scene.add(charizard);

// --- Animação ---
camera.position.set(5, 3, 7);
camera.lookAt(0, 0, 0);

let wingFlap = 0;

function animate() {
    requestAnimationFrame(animate);
    
    charizard.rotation.y += 0.005;
    
    // Animação das asas
    wingFlap += 0.07;
    leftWing.rotation.y = Math.sin(wingFlap) * 0.4;
    rightWing.rotation.y = -Math.sin(wingFlap) * 0.4;

    // Fogo pulsante
    const s = 1 + Math.sin(Date.now() * 0.01) * 0.2;
    flame.scale.set(s, s * 1.5, s);
    flame.material.color.setHSL(0.02, 1, 0.5 + Math.sin(Date.now() * 0.02) * 0.1);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();