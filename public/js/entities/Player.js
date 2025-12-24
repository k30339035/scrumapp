/**
 * 플레이어 클래스
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GameConfig } from '../core/Config.js';

export class Player {
    constructor(scene, graphicsSystem) {
        this.scene = scene;
        this.graphicsSystem = graphicsSystem;

        this.mesh = null;
        this.shieldMesh = null;

        this.position = { x: 0, y: 0.5, z: 0 };
        this.velocity = { x: 0, z: 0 };
        this.rotation = 0;

        this.isInvincible = false;
        this.invincibilityTimer = 0;

        this.hasShield = false;
        this.trailTimer = 0;

        this._create();
    }

    /**
     * 플레이어 생성
     */
    _create() {
        // 플레이어 본체 (다이아몬드 형태)
        const geometry = new THREE.OctahedronGeometry(GameConfig.PLAYER.SIZE, 0);

        const material = this.graphicsSystem.createPBRMaterial(GameConfig.COLORS.PLAYER, {
            emissive: GameConfig.COLORS.PLAYER,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = false;

        this.scene.add(this.mesh);

        // 포인트 라이트 추가
        this.light = this.graphicsSystem.addPointLight(
            this.mesh.position,
            GameConfig.COLORS.PLAYER,
            1.0,
            5
        );

        // 쉴드 생성 (비활성)
        this._createShield();
    }

    /**
     * 쉴드 생성
     */
    _createShield() {
        const shieldGeometry = new THREE.SphereGeometry(GameConfig.PLAYER.SIZE * 1.5, 16, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: GameConfig.COLORS.SHIELD,
            transparent: true,
            opacity: 0.3,
            wireframe: true,
        });

        this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldMesh.visible = false;
        this.mesh.add(this.shieldMesh);
    }

    /**
     * 업데이트
     */
    update(deltaTime, inputVector, particleSystem) {
        const speed = GameConfig.GRAPHICS.IS_MOBILE
            ? GameConfig.PLAYER.MOBILE_SPEED
            : GameConfig.PLAYER.SPEED;

        // 입력 기반 이동
        this.velocity.x += inputVector.x * speed;
        this.velocity.z += inputVector.z * speed;

        // 관성 적용
        this.velocity.x *= GameConfig.PLAYER.INERTIA;
        this.velocity.z *= GameConfig.PLAYER.INERTIA;

        // 위치 업데이트
        this.position.x += this.velocity.x;
        this.position.z += this.velocity.z;

        // 경계 제한
        const boundX = GameConfig.PLAYER.BOUNDARY_X;
        const boundZ = GameConfig.PLAYER.BOUNDARY_Z;

        if (Math.abs(this.position.x) > boundX) {
            this.position.x = Math.sign(this.position.x) * boundX;
            this.velocity.x = 0;
        }

        if (Math.abs(this.position.z) > boundZ) {
            this.position.z = Math.sign(this.position.z) * boundZ;
            this.velocity.z = 0;
        }

        // 회전 (이동 방향)
        if (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            this.rotation += (targetRotation - this.rotation) * 0.1;
        }

        // 메시 업데이트
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.y = this.rotation;

        // 펄스 애니메이션
        const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 1;
        this.mesh.scale.setScalar(pulse);

        // 라이트 위치 업데이트
        if (this.light) {
            this.light.position.copy(this.mesh.position);
        }

        // 무적 타이머
        if (this.isInvincible) {
            this.invincibilityTimer -= deltaTime * 1000;
            if (this.invincibilityTimer <= 0) {
                this.isInvincible = false;
                this.mesh.material.opacity = 1;
            } else {
                // 깜빡임 효과
                this.mesh.material.opacity = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
            }
        }

        // 쉴드 회전
        if (this.hasShield && this.shieldMesh.visible) {
            this.shieldMesh.rotation.y += deltaTime * 2;
            this.shieldMesh.rotation.x += deltaTime * 1.5;
        }

        // 트레일 효과
        if (Math.abs(this.velocity.x) > 0.02 || Math.abs(this.velocity.z) > 0.02) {
            this.trailTimer += deltaTime;
            if (this.trailTimer > 0.05) {
                particleSystem.createTrail(
                    this.mesh.position,
                    new THREE.Color(GameConfig.COLORS.TRAIL)
                );
                this.trailTimer = 0;
            }
        }
    }

    /**
     * 쉴드 활성화
     */
    activateShield() {
        this.hasShield = true;
        this.shieldMesh.visible = true;
    }

    /**
     * 쉴드 비활성화
     */
    deactivateShield() {
        this.hasShield = false;
        this.shieldMesh.visible = false;
    }

    /**
     * 무적 활성화
     */
    activateInvincibility(duration) {
        this.isInvincible = true;
        this.invincibilityTimer = duration;
        this.mesh.material.transparent = true;
    }

    /**
     * 피격
     */
    hit() {
        if (this.isInvincible) return false;

        if (this.hasShield) {
            this.deactivateShield();
            return false; // 쉴드가 피해 흡수
        }

        this.activateInvincibility(GameConfig.PLAYER.INVINCIBILITY_TIME);
        return true; // 실제 피격
    }

    /**
     * 충돌 체크
     */
    checkCollision(position, radius) {
        const dx = this.position.x - position.x;
        const dz = this.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        return distance < (GameConfig.PLAYER.COLLISION_RADIUS + radius);
    }

    /**
     * 위치 가져오기
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * 속도 가져오기
     */
    getVelocity() {
        return { ...this.velocity };
    }

    /**
     * 리셋
     */
    reset() {
        this.position = { x: 0, y: 0.5, z: 0 };
        this.velocity = { x: 0, z: 0 };
        this.rotation = 0;
        this.isInvincible = false;
        this.invincibilityTimer = 0;
        this.deactivateShield();

        this.mesh.position.set(0, 0.5, 0);
        this.mesh.rotation.y = 0;
        this.mesh.scale.setScalar(1);
        this.mesh.material.opacity = 1;
    }

    /**
     * 정리
     */
    dispose() {
        if (this.light) {
            this.graphicsSystem.removePointLight(this.light);
        }

        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();

        if (this.shieldMesh) {
            this.shieldMesh.geometry.dispose();
            this.shieldMesh.material.dispose();
        }
    }
}
