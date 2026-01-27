import * as THREE from 'three';

// --- Configuração da Cena ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Luzes ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- Materiais ---
const mewPink = new THREE.MeshStandardMaterial({ color: 0xFFC1CC }); // Rosa suave
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x4FC3F7 }); // Olhos azuis

// --- Grupo Principal (Mew) ---
const mew = new THREE.Group();

// 1. Corpo (Pequeno e arredondado)
const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.6), mewPink);
mew.add(body);

// 2. Cabeça
const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.7), mewPink);
head.position.y = 0.7;
mew.add(head);

// 3. Orelhas (Pequenas pontas)
const createEar = (x) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), mewPink);
    ear.position.set(x, 1, 0.1);
    return ear;
};
mew.add(createEar(0.25), createEar(-0.25));

// 4. Olhos (Grandes e azuis)
const eyeGeo = new THREE.BoxGeometry(0.2, 0.3, 0.1);
const lEye = new THREE.Mesh(eyeGeo, eyeMat); lEye.position.set(-0.2, 0.75, 0.31);
const rEye = new THREE.Mesh(eyeGeo, eyeMat); rEye.position.set(0.2, 0.75, 0.31);
mew.add(lEye, rEye);

// 5. Patas Traseiras (Longas e pés grandes)
const createLeg = (x) => {
    const legGroup = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.3), mewPink);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.6), mewPink);
    foot.position.set(0, -0.2, 0.2);
    legGroup.add(thigh, foot);
    legGroup.position.set(x, -0.4, 0);
    legGroup.rotation.x = -0.2;
    return legGroup;
};
mew.add(createLeg(0.35), createLeg(-0.35));

// 6. Braços (Curtos e finos)
const createArm = (x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), mewPink);
    arm.position.set(x, 0.1, 0.3);
    arm.rotation.x = 0.5;
    return arm;
};
mew.add(createArm(0.2), createArm(-0.2));

// 7. A Cauda Icônica (Muito longa e segmentada para curvas)
const tailGroup = new THREE.Group();
let lastSegment = tailGroup;

for (let i = 0; i < 15; i++) {
    const segment = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), mewPink);
    segment.position.z = -0.25;
    lastSegment.add(segment);
    lastSegment = segment; // Encadeamento para criar uma "corrente"
}
tailGroup.position.set(0, -0.4, -0.3);
mew.add(tailGroup);

scene.add(mew);

// --- Animação ---
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.002;

    // Mew flutuando suavemente
    mew.position.y = Math.sin(time) * 0.2;
    mew.rotation.y += 0.01;

    // Animação da Cauda (Efeito chicote/onda)
    let current = tailGroup;
    for (let i = 0; i < 15; i++) {
        if (current.children[0]) {
            current.rotation.x = Math.sin(time + i * 0.3) * 0.2;
            current.rotation.y = Math.cos(time + i * 0.3) * 0.1;
            current = current.children[0];
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();