/**
 * 드론 클래스
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GameConfig, AIPatterns } from '../core/Config.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Drone {
    constructor(scene, graphicsSystem, shaderSystem, aiPattern, difficulty = 1) {
        this.scene = scene;
        this.graphicsSystem = graphicsSystem;
        this.shaderSystem = shaderSystem;
        this.aiPattern = aiPattern;
        this.difficulty = difficulty;

        this.mesh = null;
        this.propellers = [];
        this.glowMesh = null;
        this.trail = null;

        this.position = { x: 0, y: GameConfig.DRONE.SPAWN_HEIGHT, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.targetPosition = { x: 0, y: 0, z: 0 };

        this.speed = GameConfig.DRONE.BASE_SPEED * difficulty;
        this.isActive = true;
        this.isDodged = false;

        // AI 전용 변수
        this.swarmOffset = {
            x: MathUtils.randomRange(-2, 2),
            z: MathUtils.randomRange(-2, 2),
        };
        this.randomChangeTimer = 0;

        this._create();
    }

    /**
     * 드론 생성
     */
    _create() {
        // 드론 본체 (박스 + 구)
        const group = new THREE.Group();

        // 중앙 본체
        const bodyGeometry = new THREE.SphereGeometry(GameConfig.DRONE.SIZE * 0.6, 8, 8);
        const bodyMaterial = this.graphicsSystem.createPBRMaterial(GameConfig.COLORS.DRONE, {
            emissive: GameConfig.COLORS.DRONE,
            emissiveIntensity: 0.3,
            roughness: 0.4,
            metalness: 0.6,
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        // 프로펠러 암 4개
        const armGeometry = new THREE.BoxGeometry(GameConfig.DRONE.SIZE * 1.5, 0.05, 0.05);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.6,
            metalness: 0.8,
        });

        // X 자 배치
        for (let i = 0; i < 2; i++) {
            const arm = new THREE.Mesh(armGeometry, armMaterial);
            arm.rotation.y = (Math.PI / 2) * i;
            group.add(arm);
        }

        // 프로펠러 4개
        const propGeometry = new THREE.CylinderGeometry(GameConfig.DRONE.SIZE * 0.4, GameConfig.DRONE.SIZE * 0.4, 0.02, 8);
        const propMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.3,
            metalness: 0.9,
            transparent: true,
            opacity: 0.7,
        });

        const propPositions = [
            { x: GameConfig.DRONE.SIZE * 0.7, z: GameConfig.DRONE.SIZE * 0.7 },
            { x: -GameConfig.DRONE.SIZE * 0.7, z: GameConfig.DRONE.SIZE * 0.7 },
            { x: GameConfig.DRONE.SIZE * 0.7, z: -GameConfig.DRONE.SIZE * 0.7 },
            { x: -GameConfig.DRONE.SIZE * 0.7, z: -GameConfig.DRONE.SIZE * 0.7 },
        ];

        propPositions.forEach(pos => {
            const prop = new THREE.Mesh(propGeometry, propMaterial);
            prop.position.set(pos.x, 0, pos.z);
            group.add(prop);
            this.propellers.push(prop);
        });

        this.mesh = group;
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.castShadow = true;

        this.scene.add(this.mesh);

        // AI 패턴에 따른 색상 변경
        this._setPatternColor();

        // 후광 효과 추가
        if (this.shaderSystem) {
            this._addGlowEffect();
        }
    }

    /**
     * AI 패턴별 색상 설정
     */
    _setPatternColor() {
        let color = GameConfig.COLORS.DRONE;

        switch (this.aiPattern) {
            case AIPatterns.TRACKING:
                color = 0xff3366;
                break;
            case AIPatterns.PREDICTIVE:
                color = 0xff6633;
                break;
            case AIPatterns.SWARM:
                color = 0xff33cc;
                break;
            case AIPatterns.RANDOM:
                color = 0x33ff66;
                break;
        }

        this.patternColor = color;

        const body = this.mesh.children[0];
        if (body.material) {
            body.material.color.setHex(color);
            body.material.emissive.setHex(color);
        }
    }

    /**
     * 후광 효과 추가
     */
    _addGlowEffect() {
        const body = this.mesh.children[0];

        this.glowMesh = this.shaderSystem.createGlowMesh(
            body,
            this.patternColor,
            1.5
        );

        this.mesh.add(this.glowMesh);
    }

    /**
     * 업데이트
     */
    update(deltaTime, playerPosition, timeScale = 1, advancedParticles = null) {
        if (!this.isActive) return;

        // AI 업데이트
        this._updateAI(playerPosition, deltaTime);

        // 목표를 향해 이동
        const dx = this.targetPosition.x - this.position.x;
        const dy = this.targetPosition.y - this.position.y;
        const dz = this.targetPosition.z - this.position.z;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 0.1) {
            this.velocity.x = (dx / distance) * this.speed * timeScale;
            this.velocity.y = (dy / distance) * this.speed * timeScale;
            this.velocity.z = (dz / distance) * this.speed * timeScale;
        }

        // 위치 업데이트
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.position.z += this.velocity.z;

        // 메시 업데이트
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        // 프로펠러 회전
        this.propellers.forEach(prop => {
            prop.rotation.y += deltaTime * 30 * timeScale;
        });

        // 본체 회전 (이동 방향)
        if (distance > 0.1) {
            const targetRotation = Math.atan2(dx, dz);
            this.mesh.rotation.y += (targetRotation - this.mesh.rotation.y) * 0.1;
        }

        // 약간의 틸팅
        this.mesh.rotation.x = this.velocity.z * -0.3;
        this.mesh.rotation.z = this.velocity.x * 0.3;

        // 글로우 효과 업데이트
        if (this.glowMesh && this.glowMesh.material.uniforms) {
            this.shaderSystem.updateUniforms(this.glowMesh.material, deltaTime);

            // 펄스 효과
            const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 1.0;
            this.glowMesh.material.uniforms.intensity.value = 1.5 * pulse;
        }

        // 엔진 스파크 효과
        if (advancedParticles && Math.random() < 0.1) {
            advancedParticles.emitSparks(
                this.position,
                { x: -this.velocity.x * 0.5, y: -0.5, z: -this.velocity.z * 0.5 },
                2,
                this.patternColor
            );
        }

        // 화면 밖으로 나가면 비활성화
        if (this.position.y < GameConfig.DRONE.DESPAWN_HEIGHT) {
            this.isDodged = true;
            this.isActive = false;
        }
    }

    /**
     * AI 업데이트
     */
    _updateAI(playerPosition, deltaTime) {
        switch (this.aiPattern) {
            case AIPatterns.TRACKING:
                this._trackingAI(playerPosition);
                break;

            case AIPatterns.PREDICTIVE:
                this._predictiveAI(playerPosition);
                break;

            case AIPatterns.SWARM:
                this._swarmAI(playerPosition);
                break;

            case AIPatterns.RANDOM:
                this._randomAI(playerPosition, deltaTime);
                break;
        }

        // Y 목표는 항상 플레이어 높이로
        this.targetPosition.y = playerPosition.y - 0.5;
    }

    /**
     * 추적 AI
     */
    _trackingAI(playerPosition) {
        this.targetPosition.x = playerPosition.x;
        this.targetPosition.z = playerPosition.z;
    }

    /**
     * 예측 AI
     */
    _predictiveAI(playerPosition) {
        // 플레이어 속도 예측 (간단한 선형 예측)
        const prediction = 3; // 미래 예측 시간
        this.targetPosition.x = playerPosition.x; // 실제 게임에서는 플레이어 속도 필요
        this.targetPosition.z = playerPosition.z;
    }

    /**
     * 집단 AI
     */
    _swarmAI(playerPosition) {
        this.targetPosition.x = playerPosition.x + this.swarmOffset.x;
        this.targetPosition.z = playerPosition.z + this.swarmOffset.z;
    }

    /**
     * 랜덤 AI
     */
    _randomAI(playerPosition, deltaTime) {
        this.randomChangeTimer += deltaTime;

        if (this.randomChangeTimer > 1) {
            const radius = 5;
            const angle = Math.random() * Math.PI * 2;
            this.targetPosition.x = playerPosition.x + Math.cos(angle) * radius;
            this.targetPosition.z = playerPosition.z + Math.sin(angle) * radius;
            this.randomChangeTimer = 0;
        }
    }

    /**
     * 충돌 체크
     */
    checkCollision(position, radius) {
        const dx = this.position.x - position.x;
        const dz = this.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        return distance < (GameConfig.DRONE.SIZE + radius);
    }

    /**
     * 위치 가져오기
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * 활성화 여부
     */
    getIsActive() {
        return this.isActive;
    }

    /**
     * 회피 여부
     */
    getIsDodged() {
        return this.isDodged;
    }

    /**
     * 비활성화
     */
    deactivate() {
        this.isActive = false;
    }

    /**
     * 정리
     */
    dispose() {
        this.scene.remove(this.mesh);

        this.mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
