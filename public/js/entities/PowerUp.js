/**
 * 파워업 클래스
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GameConfig, PowerUpTypes } from '../core/Config.js';

export class PowerUp {
    constructor(scene, graphicsSystem, type, position) {
        this.scene = scene;
        this.graphicsSystem = graphicsSystem;
        this.type = type;

        this.mesh = null;
        this.innerMesh = null;

        this.position = { ...position };
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.isActive = true;
        this.isCollected = false;

        this._create();
    }

    /**
     * 파워업 생성
     */
    _create() {
        const group = new THREE.Group();

        // 타입별 색상 및 형태
        const config = this._getConfig();

        // 외부 링
        const ringGeometry = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
        const ringMaterial = this.graphicsSystem.createPBRMaterial(config.color, {
            emissive: config.color,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8,
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        group.add(ring);

        // 내부 아이콘
        const iconGeometry = this._getIconGeometry();
        const iconMaterial = this.graphicsSystem.createPBRMaterial(config.color, {
            emissive: config.color,
            emissiveIntensity: 0.7,
            roughness: 0.1,
            metalness: 0.9,
        });

        this.innerMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        group.add(this.innerMesh);

        this.mesh = group;
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        this.scene.add(this.mesh);

        // 포인트 라이트
        this.light = this.graphicsSystem.addPointLight(
            this.mesh.position,
            config.color,
            0.8,
            8
        );
    }

    /**
     * 타입별 설정 가져오기
     */
    _getConfig() {
        switch (this.type) {
            case PowerUpTypes.SHIELD:
                return {
                    color: GameConfig.COLORS.SHIELD,
                    duration: GameConfig.POWERUP.DURATION.SHIELD,
                };

            case PowerUpTypes.TIME_SLOW:
                return {
                    color: GameConfig.COLORS.TIME_SLOW,
                    duration: GameConfig.POWERUP.DURATION.TIME_SLOW,
                };

            case PowerUpTypes.MAGNET:
                return {
                    color: GameConfig.COLORS.MAGNET,
                    duration: GameConfig.POWERUP.DURATION.MAGNET,
                };

            default:
                return {
                    color: 0xffffff,
                    duration: 3000,
                };
        }
    }

    /**
     * 타입별 아이콘 지오메트리
     */
    _getIconGeometry() {
        switch (this.type) {
            case PowerUpTypes.SHIELD:
                return new THREE.OctahedronGeometry(0.2, 0);

            case PowerUpTypes.TIME_SLOW:
                return new THREE.TetrahedronGeometry(0.2, 0);

            case PowerUpTypes.MAGNET:
                return new THREE.TorusGeometry(0.15, 0.05, 8, 12);

            default:
                return new THREE.SphereGeometry(0.2, 8, 8);
        }
    }

    /**
     * 업데이트
     */
    update(deltaTime, playerPosition, hasMagnet = false) {
        if (!this.isActive) return;

        // 하강
        this.position.y -= GameConfig.POWERUP.FALL_SPEED;

        // 자석 효과
        if (hasMagnet) {
            const dx = playerPosition.x - this.position.x;
            const dz = playerPosition.z - this.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < GameConfig.POWERUP.MAGNET_RADIUS) {
                const pullStrength = 0.1;
                this.position.x += (dx / distance) * pullStrength;
                this.position.z += (dz / distance) * pullStrength;
            }
        }

        // 회전
        this.rotation += deltaTime * 2;
        this.mesh.rotation.y = this.rotation;

        // 위아래 흔들림 (bob)
        const bob = Math.sin(Date.now() * 0.003 + this.bobOffset) * 0.1;
        this.mesh.position.set(this.position.x, this.position.y + bob, this.position.z);

        // 내부 메시 회전
        if (this.innerMesh) {
            this.innerMesh.rotation.x += deltaTime * 3;
            this.innerMesh.rotation.z += deltaTime * 2;
        }

        // 라이트 위치 업데이트
        if (this.light) {
            this.light.position.copy(this.mesh.position);

            // 라이트 펄스
            const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
            this.light.intensity = pulse;
        }

        // 바닥 밑으로 떨어지면 비활성화
        if (this.position.y < -2) {
            this.isActive = false;
        }
    }

    /**
     * 충돌 체크
     */
    checkCollision(position, radius) {
        const dx = this.position.x - position.x;
        const dy = this.position.y - position.y;
        const dz = this.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        return distance < (0.5 + radius);
    }

    /**
     * 수집
     */
    collect() {
        this.isCollected = true;
        this.isActive = false;
    }

    /**
     * 타입 가져오기
     */
    getType() {
        return this.type;
    }

    /**
     * 활성화 여부
     */
    getIsActive() {
        return this.isActive;
    }

    /**
     * 수집 여부
     */
    getIsCollected() {
        return this.isCollected;
    }

    /**
     * 정리
     */
    dispose() {
        if (this.light) {
            this.graphicsSystem.removePointLight(this.light);
        }

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
