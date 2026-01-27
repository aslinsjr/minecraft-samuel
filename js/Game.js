// src/Game.js
import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { Minimap } from './Minimap.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { BuildingSystem } from './systems/BuildingSystem.js';
import { SwimSystem } from './systems/SwimSystem.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { UIManager } from './ui/UIManager.js';
import { InputHandler } from './utils/InputHandler.js';
import { AUTH_URL, SAVE_VERSION, SWIM_MAX_TIME } from './utils/Constants.js';

export class Game {
    constructor() {
        this.initGame();
    }

    async initGame() {
        // Configuração básica
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Autenticação
        this.authData = this.getAuthData();
        if (!this.authData.token) {
            window.location.href = AUTH_URL;
            return;
        }

        // Inicializar sistemas
        this.initSystems();
        
        // Inicializar mundo e jogador
        await this.initWorldAndPlayer();

        // Iniciar loop
        this.animate();
    }

    getAuthData() {
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

    initSystems() {
        // Sistema de input
        this.inputHandler = new InputHandler();
        
        // Sistema de movimento
        this.movementSystem = new MovementSystem();
        
        // Sistema de construção
        this.buildingSystem = new BuildingSystem(this.scene);
        
        // Sistema de natação
        this.swimSystem = new SwimSystem(SWIM_MAX_TIME);
        
        // Sistema de câmera
        this.cameraSystem = new CameraSystem(this.camera);
        
        // Sistema de salvamento
        this.saveSystem = new SaveSystem(this.authData.token, SAVE_VERSION);
        
        // UI Manager
        this.uiManager = new UIManager();
        
        // Luz
        this.setupLights();
    }

    setupLights() {
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
        this.scene.add(sun, ambientLight);
    }

    async initWorldAndPlayer() {
        // Mundo
        this.world = new World(this.scene);
        
        // Jogador
        this.player = new Player(this.scene, this.authData.playerColors);
        
        // Carregar jogo salvo
        await this.saveSystem.loadGame(this.world, this.player);
        
        // Minimapa
        setTimeout(() => {
            this.minimap = new Minimap(this.scene, 70);
        }, 100);

        // Configurar eventos
        this.setupEventListeners();
        
        // Auto-save
        setInterval(() => this.saveSystem.saveGame(this.world, this.player), 30000);
        window.addEventListener('beforeunload', () => this.saveSystem.saveGame(this.world, this.player));
    }

    setupEventListeners() {
        // Redimensionamento
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    update() {
        const deltaTime = this.clock.getDelta();
        
        // Atualizar estado da água
        this.world.updateWater(performance.now() * 0.002);
        
        // Verificar natação
        this.swimSystem.checkWaterCollision(this.player, this.world, this.inputHandler.keys);
        
        // Movimentação
        this.movementSystem.update(
            this.player,
            this.world,
            this.inputHandler.keys,
            this.swimSystem.isInWater,
            this.swimSystem.isSwimming,
            this.swimSystem
        );
        
        // Mineração/Construção
        if (this.inputHandler.isMining && !this.buildingSystem.buildMode) {
            this.buildingSystem.mine(this.player, this.world, this.saveSystem);
        }
        
        // Sistema de construção
        if (this.buildingSystem.buildMode) {
            this.buildingSystem.updateGhostBlock(
                this.player,
                this.cameraSystem.getBuildRay(this.player)
            );
        }
        
        // Atualizar câmera
        this.cameraSystem.update(
            this.player,
            this.swimSystem.isSwimming,
            this.world
        );
        
        // Atualizar minimapa
        if (this.minimap) {
            const islands = [
                { x: 0, z: 0 },
                { x: 30, z: 30 },
                { x: -30, z: 30 },
                { x: 30, z: -30 },
                { x: -30, z: -30 }
            ];
            this.minimap.update(this.player.group.position, islands);
        }
        
        // Atualizar UI
        this.uiManager.updateSwimStamina(this.swimSystem.swimStamina, SWIM_MAX_TIME);
        this.uiManager.toggleSwimStamina(this.swimSystem.isSwimming || this.swimSystem.swimStamina < SWIM_MAX_TIME);
        
        // Animar jogador
        this.player.animate(
            this.inputHandler.keys['KeyW'] || this.inputHandler.keys['KeyS'] || 
            this.inputHandler.keys['KeyA'] || this.inputHandler.keys['KeyD'],
            this.inputHandler.isMining
        );
    }

    animate() {
        this.clock = new THREE.Clock();
        
        const animateLoop = () => {
            requestAnimationFrame(animateLoop);
            this.update();
            this.renderer.render(this.scene, this.camera);
        };
        
        animateLoop();
    }
}