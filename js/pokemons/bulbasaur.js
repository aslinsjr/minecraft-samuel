import * as THREE from 'three';

// --- Configuração da Cena ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Luzes ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- Materiais ---
const tealMat = new THREE.MeshStandardMaterial({ color: 0x81D4FA }); // Corpo azul-piscina
const darkGreenMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 }); // Manchas
const bulbMat = new THREE.MeshStandardMaterial({ color: 0x8BC34A }); // Bulbo verde claro
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xFF5252 }); // Olhos/Detalhes

// --- Grupo Principal (Bulbasauro) ---
const bulbasaur = new THREE.Group();

// 1. Corpo (Mais horizontal que o do Pikachu)
const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.5), tealMat);
bulbasaur.add(body);

// 2. Cabeça
const head = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.8), tealMat);
head.position.set(0, 0.3, 0.9);
bulbasaur.add(head);

// 3. Orelhas (Triangulares)
const createEar = (x) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), tealMat);
    ear.position.set(x, 0.8, 0.8);
    return ear;
};
bulbasaur.add(createEar(0.3), createEar(-0.3));

// 4. O Bulbo (A parte das costas)
// Usamos uma esfera levemente achatada ou um Octaedro para o estilo low-poly
const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), bulbMat);
bulb.position.set(0, 0.7, -0.1);
bulb.rotation.x = 0.2;
bulbasaur.add(bulb);

// 5. Patas (Quatro patas curtas)
const createLeg = (x, z) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), tealMat);
    leg.position.set(x, -0.4, z);
    return leg;
};
bulbasaur.add(createLeg(0.4, 0.5));   // Frontal Direita
bulbasaur.add(createLeg(-0.4, 0.5));  // Frontal Esquerda
bulbasaur.add(createLeg(0.4, -0.5));  // Traseira Direita
bulbasaur.add(createLeg(-0.4, -0.5)); // Traseira Esquerda

// 6. Olhos (Vermelhos e expressivos)
const eyeGeo = new THREE.BoxGeometry(0.2, 0.3, 0.1);
const leftEye = new THREE.Mesh(eyeGeo, redMat);
leftEye.position.set(-0.3, 0.4, 1.3);
leftEye.rotation.y = -0.2;
bulbasaur.add(leftEye);

const rightEye = new THREE.Mesh(eyeGeo, redMat);
rightEye.position.set(0.3, 0.4, 1.3);
rightEye.rotation.y = 0.2;
bulbasaur.add(rightEye);

// 7. Manchas (Detalhes verdes no corpo)
const spotGeo = new THREE.PlaneGeometry(0.2, 0.2);
const spot = new THREE.Mesh(spotGeo, darkGreenMat);
spot.position.set(0, 0.41, 0.3); // No topo do corpo
spot.rotation.x = -Math.PI / 2;
bulbasaur.add(spot);

scene.add(bulbasaur);

// --- Animação e Renderização ---
camera.position.set(4, 4, 4);
camera.lookAt(0, 0, 0);

function animate() {
    requestAnimationFrame(animate);
    
    // Rotação suave
    bulbasaur.rotation.y += 0.005;
    
    // Animação de respiração (escala o bulbo levemente)
    const scale = 1 + Math.sin(Date.now() * 0.003) * 0.05;
    bulb.scale.set(scale, scale, scale);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();