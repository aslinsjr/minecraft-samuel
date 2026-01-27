import * as THREE from 'three';

export class Pikachu {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.wanderTimer = 0;
        this.lifetime = 30 + Math.random() * 30; // 30-60 segundos
        this.age = 0;
        
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xFFDE00 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        const brownMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.8), yellowMat);
        this.group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), yellowMat);
        head.position.y = 1;
        this.group.add(head);

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
        this.group.add(createEar(0.3), createEar(-0.3));

        const cheekGeo = new THREE.PlaneGeometry(0.2, 0.2);
        const leftCheek = new THREE.Mesh(cheekGeo, redMat);
        leftCheek.position.set(-0.3, 0.85, 0.41);
        this.group.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeo, redMat);
        rightCheek.position.set(0.3, 0.85, 0.41);
        this.group.add(rightCheek);

        const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const leftEye = new THREE.Mesh(eyeGeo, blackMat);
        leftEye.position.set(-0.25, 1.1, 0.4);
        this.group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, blackMat);
        rightEye.position.set(0.25, 1.1, 0.4);
        this.group.add(rightEye);

        const createLimb = (width, height, depth, x, y, z) => {
            const limb = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), yellowMat);
            limb.position.set(x, y, z);
            return limb;
        };

        this.leftArm = createLimb(0.2, 0.4, 0.2, -0.45, 0.2, 0.35);
        this.leftArm.rotation.z = 0.4;
        this.group.add(this.leftArm);

        this.rightArm = createLimb(0.2, 0.4, 0.2, 0.45, 0.2, 0.35);
        this.rightArm.rotation.z = -0.4;
        this.group.add(this.rightArm);

        const leftLeg = createLimb(0.35, 0.2, 0.5, -0.3, -0.6, 0.2);
        this.group.add(leftLeg);

        const rightLeg = createLimb(0.35, 0.2, 0.5, 0.3, -0.6, 0.2);
        this.group.add(rightLeg);

        const tail = new THREE.Group();
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.1), brownMat);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), yellowMat);
        p2.position.set(0.2, 0.3, 0);
        tail.add(p1, p2);
        tail.position.set(0, -0.3, -0.5);
        tail.rotation.x = 0.5;
        this.group.add(tail);

        this.group.scale.set(0.6, 0.6, 0.6);
        scene.add(this.group);
    }

    update(delta, terrainBlocks) {
        this.age += delta;
        this.wanderTimer -= delta;

        if (this.wanderTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.02 + Math.random() * 0.03;
            this.velocity.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
            this.wanderTimer = 2 + Math.random() * 3;
            
            this.group.rotation.y = angle;
        }

        const newPos = this.group.position.clone().add(this.velocity);
        
        if (Math.abs(newPos.x) < 25 && Math.abs(newPos.z) < 25) {
            this.group.position.add(this.velocity);
        } else {
            this.velocity.multiplyScalar(-1);
            this.group.rotation.y += Math.PI;
        }

        this.group.position.y = Math.sin(Date.now() * 0.005) * 0.15;
        this.leftArm.rotation.x = Math.sin(Date.now() * 0.005) * 0.2;
        this.rightArm.rotation.x = Math.sin(Date.now() * 0.005) * 0.2;
    }

    shouldDespawn() {
        return this.age >= this.lifetime;
    }

    remove() {
        this.scene.remove(this.group);
    }
}

export class Bulbasaur {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.wanderTimer = 0;
        this.lifetime = 30 + Math.random() * 30;
        this.age = 0;

        const tealMat = new THREE.MeshStandardMaterial({ color: 0x81D4FA });
        const darkGreenMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
        const bulbMat = new THREE.MeshStandardMaterial({ color: 0x8BC34A });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xFF5252 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.5), tealMat);
        this.group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.8), tealMat);
        head.position.set(0, 0.3, 0.9);
        this.group.add(head);

        const createEar = (x) => {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), tealMat);
            ear.position.set(x, 0.8, 0.8);
            return ear;
        };
        this.group.add(createEar(0.3), createEar(-0.3));

        this.bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), bulbMat);
        this.bulb.position.set(0, 0.7, -0.1);
        this.bulb.rotation.x = 0.2;
        this.group.add(this.bulb);

        const createLeg = (x, z) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), tealMat);
            leg.position.set(x, -0.4, z);
            return leg;
        };
        this.group.add(createLeg(0.4, 0.5));
        this.group.add(createLeg(-0.4, 0.5));
        this.group.add(createLeg(0.4, -0.5));
        this.group.add(createLeg(-0.4, -0.5));

        const eyeGeo = new THREE.BoxGeometry(0.2, 0.3, 0.1);
        const leftEye = new THREE.Mesh(eyeGeo, redMat);
        leftEye.position.set(-0.3, 0.4, 1.3);
        leftEye.rotation.y = -0.2;
        this.group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, redMat);
        rightEye.position.set(0.3, 0.4, 1.3);
        rightEye.rotation.y = 0.2;
        this.group.add(rightEye);

        const spotGeo = new THREE.PlaneGeometry(0.2, 0.2);
        const spot = new THREE.Mesh(spotGeo, darkGreenMat);
        spot.position.set(0, 0.41, 0.3);
        spot.rotation.x = -Math.PI / 2;
        this.group.add(spot);

        this.group.scale.set(0.5, 0.5, 0.5);
        scene.add(this.group);
    }

    update(delta) {
        this.age += delta;
        this.wanderTimer -= delta;

        if (this.wanderTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.015 + Math.random() * 0.02;
            this.velocity.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
            this.wanderTimer = 2 + Math.random() * 4;
            
            this.group.rotation.y = angle;
        }

        const newPos = this.group.position.clone().add(this.velocity);
        
        if (Math.abs(newPos.x) < 25 && Math.abs(newPos.z) < 25) {
            this.group.position.add(this.velocity);
        } else {
            this.velocity.multiplyScalar(-1);
            this.group.rotation.y += Math.PI;
        }

        const scale = 1 + Math.sin(Date.now() * 0.003) * 0.05;
        this.bulb.scale.set(scale, scale, scale);
    }

    shouldDespawn() {
        return this.age >= this.lifetime;
    }

    remove() {
        this.scene.remove(this.group);
    }
}

export class Charizard {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.wanderTimer = 0;
        this.lifetime = 30 + Math.random() * 30;
        this.age = 0;
        this.wingFlap = 0;

        const orangeMat = new THREE.MeshStandardMaterial({ color: 0xFF7043 });
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x42A5F5 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xFF3D00 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xBDBDBD });
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xF44336, transparent: true, opacity: 0.8 });

        const upperBody = new THREE.Group();

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.1), orangeMat);
        upperBody.add(body);

        const neckGroup = new THREE.Group();
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), orangeMat);
        neck.position.y = 0.6;
        neckGroup.add(neck);

        const headGroup = new THREE.Group();
        const head = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.9), orangeMat);
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), orangeMat);
        snout.position.set(0, -0.2, 0.6);
        headGroup.add(head, snout);

        const eyeGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1);
        const lEye = new THREE.Mesh(eyeGeo, redMat);
        lEye.position.set(-0.25, 0.1, 0.45);
        const rEye = new THREE.Mesh(eyeGeo, redMat);
        rEye.position.set(0.25, 0.1, 0.45);
        headGroup.add(lEye, rEye);

        const createHorn = (x) => {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), hornMat);
            horn.position.set(x, 0.5, -0.1);
            horn.rotation.x = -0.5;
            return horn;
        };
        headGroup.add(createHorn(0.3), createHorn(-0.3));

        headGroup.position.y = 1.2;
        headGroup.rotation.x = 0.4;
        neckGroup.add(headGroup);

        neckGroup.position.y = 0.8;
        neckGroup.rotation.x = 0.2;
        upperBody.add(neckGroup);

        const belly = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.4), blueMat);
        belly.position.z = 0.5;
        upperBody.add(belly);

        const createArm = (x) => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), orangeMat);
            arm.position.set(x * 0.8, 0.3, 0.5);
            arm.rotation.x = 0.8;
            return arm;
        };
        upperBody.add(createArm(1), createArm(-1));

        const createWing = (xM) => {
            const wing = new THREE.Group();
            const part = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.1), wingMat);
            part.position.set(1 * xM, 0, 0);
            wing.add(part);
            wing.position.set(0.5 * xM, 0.5, -0.5);
            return wing;
        };
        this.leftWing = createWing(-1);
        this.rightWing = createWing(1);
        upperBody.add(this.leftWing, this.rightWing);

        upperBody.position.y = 0.5;
        this.group.add(upperBody);

        const createLeg = (x) => {
            const leg = new THREE.Group();
            const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.6), orangeMat);
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.8), hornMat);
            foot.position.set(0, -0.4, 0.2);
            leg.add(thigh, foot);
            leg.position.set(x, -0.6, 0.1);
            return leg;
        };
        this.group.add(createLeg(0.7), createLeg(-0.7));

        const tail = new THREE.Group();
        const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1), orangeMat);
        const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1), orangeMat);
        t2.position.set(0, 0.2, -0.8);
        t2.rotation.x = 0.5;
        tail.add(t1, t2);

        this.flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), redMat);
        this.flame.position.set(0, 0.6, -1.5);
        tail.add(this.flame);

        tail.position.set(0, -0.7, -0.4);
        this.group.add(tail);

        this.group.scale.set(0.4, 0.4, 0.4);
        scene.add(this.group);
    }

    update(delta) {
        this.age += delta;
        this.wanderTimer -= delta;

        if (this.wanderTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.025 + Math.random() * 0.025;
            this.velocity.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
            this.wanderTimer = 2 + Math.random() * 3;
            
            this.group.rotation.y = angle;
        }

        const newPos = this.group.position.clone().add(this.velocity);
        
        if (Math.abs(newPos.x) < 25 && Math.abs(newPos.z) < 25) {
            this.group.position.add(this.velocity);
        } else {
            this.velocity.multiplyScalar(-1);
            this.group.rotation.y += Math.PI;
        }

        this.wingFlap += 0.07;
        this.leftWing.rotation.y = Math.sin(this.wingFlap) * 0.4;
        this.rightWing.rotation.y = -Math.sin(this.wingFlap) * 0.4;

        const s = 1 + Math.sin(Date.now() * 0.01) * 0.2;
        this.flame.scale.set(s, s * 1.5, s);
        this.flame.material.color.setHSL(0.02, 1, 0.5 + Math.sin(Date.now() * 0.02) * 0.1);
    }

    shouldDespawn() {
        return this.age >= this.lifetime;
    }

    remove() {
        this.scene.remove(this.group);
    }
}

export class Mew {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.wanderTimer = 0;
        this.lifetime = 30 + Math.random() * 30;
        this.age = 0;

        const mewPink = new THREE.MeshStandardMaterial({ color: 0xFFC1CC });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x4FC3F7 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.6), mewPink);
        this.group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.7), mewPink);
        head.position.y = 0.7;
        this.group.add(head);

        const createEar = (x) => {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), mewPink);
            ear.position.set(x, 1, 0.1);
            return ear;
        };
        this.group.add(createEar(0.25), createEar(-0.25));

        const eyeGeo = new THREE.BoxGeometry(0.2, 0.3, 0.1);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.2, 0.75, 0.31);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.2, 0.75, 0.31);
        this.group.add(lEye, rEye);

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
        this.group.add(createLeg(0.35), createLeg(-0.35));

        const createArm = (x) => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), mewPink);
            arm.position.set(x, 0.1, 0.3);
            arm.rotation.x = 0.5;
            return arm;
        };
        this.group.add(createArm(0.2), createArm(-0.2));

        this.tailGroup = new THREE.Group();
        let lastSegment = this.tailGroup;

        for (let i = 0; i < 15; i++) {
            const segment = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), mewPink);
            segment.position.z = -0.25;
            lastSegment.add(segment);
            lastSegment = segment;
        }
        this.tailGroup.position.set(0, -0.4, -0.3);
        this.group.add(this.tailGroup);

        this.group.scale.set(0.6, 0.6, 0.6);
        scene.add(this.group);
    }

    update(delta) {
        this.age += delta;
        this.wanderTimer -= delta;

        if (this.wanderTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.018 + Math.random() * 0.022;
            this.velocity.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
            this.wanderTimer = 2 + Math.random() * 4;
            
            this.group.rotation.y = angle;
        }

        const newPos = this.group.position.clone().add(this.velocity);
        
        if (Math.abs(newPos.x) < 25 && Math.abs(newPos.z) < 25) {
            this.group.position.add(this.velocity);
        } else {
            this.velocity.multiplyScalar(-1);
            this.group.rotation.y += Math.PI;
        }

        const time = Date.now() * 0.002;
        this.group.position.y = Math.sin(time) * 0.2;

        let current = this.tailGroup;
        for (let i = 0; i < 15; i++) {
            if (current.children[0]) {
                current.rotation.x = Math.sin(time + i * 0.3) * 0.2;
                current.rotation.y = Math.cos(time + i * 0.3) * 0.1;
                current = current.children[0];
            }
        }
    }

    shouldDespawn() {
        return this.age >= this.lifetime;
    }

    remove() {
        this.scene.remove(this.group);
    }
}