/**
 * 그래픽 시스템 - PBR, 조명, 후처리 효과
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GameConfig } from '../core/Config.js';

export class GraphicsSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;

        // 조명
        this.ambientLight = null;
        this.directionalLight = null;
        this.pointLights = [];

        this._init();
    }

    /**
     * 초기화
     */
    _init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(GameConfig.COLORS.SKY);
        this.scene.fog = new THREE.Fog(GameConfig.COLORS.SKY, 30, 100);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            GameConfig.GRAPHICS.FOV,
            window.innerWidth / window.innerHeight,
            GameConfig.GRAPHICS.NEAR,
            GameConfig.GRAPHICS.FAR
        );
        this.camera.position.set(0, 12, 15);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            ...GameConfig.RENDERER,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(GameConfig.GRAPHICS.PIXEL_RATIO);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // 조명 설정
        this._setupLights();

        // 환경 설정
        this._setupEnvironment();

        // 후처리
        this._setupPostProcessing();

        // 리사이즈 이벤트
        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * 조명 설정
     */
    _setupLights() {
        // Ambient Light
        this.ambientLight = new THREE.AmbientLight(
            GameConfig.LIGHTING.AMBIENT.color,
            GameConfig.LIGHTING.AMBIENT.intensity
        );
        this.scene.add(this.ambientLight);

        // Directional Light (태양광)
        this.directionalLight = new THREE.DirectionalLight(
            GameConfig.LIGHTING.DIRECTIONAL.color,
            GameConfig.LIGHTING.DIRECTIONAL.intensity
        );

        const pos = GameConfig.LIGHTING.DIRECTIONAL.position;
        this.directionalLight.position.set(pos.x, pos.y, pos.z);
        this.directionalLight.castShadow = true;

        // 그림자 설정
        this.directionalLight.shadow.mapSize.width = GameConfig.GRAPHICS.SHADOW_MAP_SIZE;
        this.directionalLight.shadow.mapSize.height = GameConfig.GRAPHICS.SHADOW_MAP_SIZE;
        this.directionalLight.shadow.camera.left = -30;
        this.directionalLight.shadow.camera.right = 30;
        this.directionalLight.shadow.camera.top = 30;
        this.directionalLight.shadow.camera.bottom = -30;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 100;
        this.directionalLight.shadow.bias = GameConfig.GRAPHICS.SHADOW_BIAS;
        this.directionalLight.shadow.radius = GameConfig.GRAPHICS.SHADOW_RADIUS;

        this.scene.add(this.directionalLight);
    }

    /**
     * 환경 설정
     */
    _setupEnvironment() {
        // 바닥 (그리드 패턴)
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);

        // PBR 머티리얼
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: GameConfig.COLORS.GROUND,
            roughness: 0.8,
            metalness: 0.2,
            envMapIntensity: 0.5,
        });

        // 높이 변화 추가 (웨이브 효과)
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.3;
            positions.setZ(i, noise);
        }
        groundGeometry.computeVertexNormals();

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 그리드 헬퍼 (선택적)
        if (!GameConfig.GRAPHICS.IS_MOBILE) {
            const gridHelper = new THREE.GridHelper(100, 50, 0x444466, 0x222233);
            gridHelper.position.y = 0.01;
            this.scene.add(gridHelper);
        }

        // 배경 파티클 (별)
        this._createStarField();
    }

    /**
     * 별 배경 생성
     */
    _createStarField() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = GameConfig.GRAPHICS.IS_MOBILE ? 500 : 1000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 50 + 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    /**
     * 후처리 설정
     */
    _setupPostProcessing() {
        // Composer
        this.composer = new EffectComposer(this.renderer);

        // Render Pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom Pass (고품질만)
        if (!GameConfig.GRAPHICS.IS_MOBILE) {
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.5,  // strength
                0.4,  // radius
                0.85  // threshold
            );
            this.composer.addPass(bloomPass);
        }
    }

    /**
     * PBR 머티리얼 생성 헬퍼
     */
    createPBRMaterial(color, options = {}) {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: options.roughness || 0.5,
            metalness: options.metalness || 0.5,
            emissive: options.emissive || 0x000000,
            emissiveIntensity: options.emissiveIntensity || 1,
            envMapIntensity: options.envMapIntensity || 1,
            transparent: options.transparent || false,
            opacity: options.opacity || 1,
        });
    }

    /**
     * 포인트 라이트 추가
     */
    addPointLight(position, color, intensity, distance) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.copy(position);
        light.castShadow = false; // 성능을 위해 포인트 라이트는 그림자 끔
        this.scene.add(light);
        this.pointLights.push(light);
        return light;
    }

    /**
     * 포인트 라이트 제거
     */
    removePointLight(light) {
        const index = this.pointLights.indexOf(light);
        if (index > -1) {
            this.pointLights.splice(index, 1);
            this.scene.remove(light);
        }
    }

    /**
     * 렌더링
     */
    render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * 리사이즈 처리
     */
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }

    /**
     * Scene 가져오기
     */
    getScene() {
        return this.scene;
    }

    /**
     * Camera 가져오기
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Renderer 가져오기
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * 품질 설정 업데이트
     */
    updateQuality(qualityLevel) {
        switch (qualityLevel) {
            case 0: // Low
                this.renderer.shadowMap.enabled = false;
                this.scene.fog = null;
                break;

            case 1: // Medium
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.BasicShadowMap;
                this.scene.fog = new THREE.Fog(GameConfig.COLORS.SKY, 40, 100);
                break;

            case 2: // High
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.scene.fog = new THREE.Fog(GameConfig.COLORS.SKY, 30, 100);
                break;
        }
    }

    /**
     * 정리
     */
    dispose() {
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        this.renderer.dispose();
        if (this.composer) this.composer.dispose();
    }
}
