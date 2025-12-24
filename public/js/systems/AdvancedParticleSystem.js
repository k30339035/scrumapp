/**
 * 고급 파티클 시스템 - 스파크, 트레일, 폭발 효과
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GameConfig } from '../core/Config.js';

export class AdvancedParticleSystem {
    constructor(scene, shaderSystem) {
        this.scene = scene;
        this.shaderSystem = shaderSystem;

        this.particleGroups = new Map();
        this.trails = [];
        this.sparkEmitters = [];

        this._init();
    }

    /**
     * 초기화
     */
    _init() {
        this._createSparkSystem();
        this._createExplosionSystem();
        this._createEnergySystem();
    }

    /**
     * 스파크 파티클 시스템
     */
    _createSparkSystem() {
        const maxParticles = 1000;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(maxParticles * 3);
        const colors = new Float32Array(maxParticles * 3);
        const sizes = new Float32Array(maxParticles);
        const alphas = new Float32Array(maxParticles);
        const velocities = new Float32Array(maxParticles * 3);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = this.shaderSystem.createMaterial('particleTrail');

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.particleGroups.set('sparks', {
            points,
            geometry,
            material,
            velocities,
            particles: [],
            nextIndex: 0,
            maxParticles
        });
    }

    /**
     * 폭발 파티클 시스템
     */
    _createExplosionSystem() {
        const maxParticles = 500;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(maxParticles * 3);
        const colors = new Float32Array(maxParticles * 3);
        const sizes = new Float32Array(maxParticles);
        const alphas = new Float32Array(maxParticles);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.particleGroups.set('explosions', {
            points,
            geometry,
            material,
            particles: [],
            nextIndex: 0,
            maxParticles
        });
    }

    /**
     * 에너지 파티클 시스템 (파워업)
     */
    _createEnergySystem() {
        const maxParticles = 300;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(maxParticles * 3);
        const colors = new Float32Array(maxParticles * 3);
        const sizes = new Float32Array(maxParticles);
        const alphas = new Float32Array(maxParticles);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = this.shaderSystem.createMaterial('particleTrail');

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.particleGroups.set('energy', {
            points,
            geometry,
            material,
            particles: [],
            nextIndex: 0,
            maxParticles
        });
    }

    /**
     * 스파크 방출
     */
    emitSparks(position, velocity, count = 10, color = 0xffaa00) {
        const group = this.particleGroups.get('sparks');
        if (!group) return;

        const colorObj = new THREE.Color(color);

        for (let i = 0; i < count; i++) {
            const idx = group.nextIndex;

            // 랜덤 속도
            const spread = 2;
            const vel = {
                x: velocity.x + (Math.random() - 0.5) * spread,
                y: velocity.y + Math.random() * 2,
                z: velocity.z + (Math.random() - 0.5) * spread
            };

            const particle = {
                index: idx,
                position: { ...position },
                velocity: vel,
                life: 1.0,
                maxLife: 0.5 + Math.random() * 0.5,
                size: 0.1 + Math.random() * 0.1,
                gravity: -5
            };

            // 버퍼 업데이트
            const posArray = group.geometry.attributes.position.array;
            const colorArray = group.geometry.attributes.customColor.array;
            const sizeArray = group.geometry.attributes.size.array;
            const alphaArray = group.geometry.attributes.alpha.array;

            posArray[idx * 3] = position.x;
            posArray[idx * 3 + 1] = position.y;
            posArray[idx * 3 + 2] = position.z;

            colorArray[idx * 3] = colorObj.r;
            colorArray[idx * 3 + 1] = colorObj.g;
            colorArray[idx * 3 + 2] = colorObj.b;

            sizeArray[idx] = particle.size;
            alphaArray[idx] = 1.0;

            // 속도 저장
            group.velocities[idx * 3] = vel.x;
            group.velocities[idx * 3 + 1] = vel.y;
            group.velocities[idx * 3 + 2] = vel.z;

            group.particles.push(particle);
            group.nextIndex = (group.nextIndex + 1) % group.maxParticles;
        }
    }

    /**
     * 폭발 효과
     */
    createExplosion(position, color = 0xff3366, intensity = 1) {
        const group = this.particleGroups.get('explosions');
        if (!group) return;

        const count = Math.floor(30 * intensity);
        const colorObj = new THREE.Color(color);

        for (let i = 0; i < count; i++) {
            const idx = group.nextIndex;

            // 구형 방출
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = 3 + Math.random() * 2;

            const vel = {
                x: speed * Math.sin(phi) * Math.cos(theta),
                y: speed * Math.sin(phi) * Math.sin(theta),
                z: speed * Math.cos(phi)
            };

            const particle = {
                index: idx,
                position: { ...position },
                velocity: vel,
                life: 1.0,
                maxLife: 0.8 + Math.random() * 0.4,
                size: 0.15 + Math.random() * 0.15,
                gravity: -2
            };

            // 버퍼 업데이트
            const posArray = group.geometry.attributes.position.array;
            const colorArray = group.geometry.attributes.customColor.array;
            const sizeArray = group.geometry.attributes.size.array;
            const alphaArray = group.geometry.attributes.alpha.array;

            posArray[idx * 3] = position.x;
            posArray[idx * 3 + 1] = position.y;
            posArray[idx * 3 + 2] = position.z;

            colorArray[idx * 3] = colorObj.r;
            colorArray[idx * 3 + 1] = colorObj.g;
            colorArray[idx * 3 + 2] = colorObj.b;

            sizeArray[idx] = particle.size;
            alphaArray[idx] = 1.0;

            group.particles.push(particle);
            group.nextIndex = (group.nextIndex + 1) % group.maxParticles;
        }
    }

    /**
     * 에너지 흡수 효과 (마그넷)
     */
    createEnergyAbsorb(from, to, color = 0xff00ff) {
        const group = this.particleGroups.get('energy');
        if (!group) return;

        const count = 5;
        const colorObj = new THREE.Color(color);

        for (let i = 0; i < count; i++) {
            const idx = group.nextIndex;

            // 타겟을 향한 속도
            const dir = {
                x: to.x - from.x,
                y: to.y - from.y,
                z: to.z - from.z
            };

            const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
            const speed = 5;

            const vel = {
                x: (dir.x / dist) * speed,
                y: (dir.y / dist) * speed,
                z: (dir.z / dist) * speed
            };

            const particle = {
                index: idx,
                position: { ...from },
                velocity: vel,
                target: { ...to },
                life: 1.0,
                maxLife: 1.0,
                size: 0.12,
                homing: true,
                gravity: 0
            };

            // 버퍼 업데이트
            const posArray = group.geometry.attributes.position.array;
            const colorArray = group.geometry.attributes.customColor.array;
            const sizeArray = group.geometry.attributes.size.array;
            const alphaArray = group.geometry.attributes.alpha.array;

            posArray[idx * 3] = from.x;
            posArray[idx * 3 + 1] = from.y;
            posArray[idx * 3 + 2] = from.z;

            colorArray[idx * 3] = colorObj.r;
            colorArray[idx * 3 + 1] = colorObj.g;
            colorArray[idx * 3 + 2] = colorObj.b;

            sizeArray[idx] = particle.size;
            alphaArray[idx] = 1.0;

            group.particles.push(particle);
            group.nextIndex = (group.nextIndex + 1) % group.maxParticles;
        }
    }

    /**
     * 트레일 생성
     */
    createTrail(maxPoints = 50) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxPoints * 3);
        const colors = new Float32Array(maxPoints * 3);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        const trail = {
            line,
            geometry,
            positions: [],
            maxPoints,
            color: new THREE.Color(0x00ff88)
        };

        this.trails.push(trail);
        return trail;
    }

    /**
     * 트레일 업데이트
     */
    updateTrail(trail, newPosition) {
        trail.positions.push({ ...newPosition });

        if (trail.positions.length > trail.maxPoints) {
            trail.positions.shift();
        }

        const posArray = trail.geometry.attributes.position.array;
        const colorArray = trail.geometry.attributes.color.array;

        for (let i = 0; i < trail.positions.length; i++) {
            const pos = trail.positions[i];
            posArray[i * 3] = pos.x;
            posArray[i * 3 + 1] = pos.y;
            posArray[i * 3 + 2] = pos.z;

            const alpha = i / trail.positions.length;
            colorArray[i * 3] = trail.color.r * alpha;
            colorArray[i * 3 + 1] = trail.color.g * alpha;
            colorArray[i * 3 + 2] = trail.color.b * alpha;
        }

        trail.geometry.attributes.position.needsUpdate = true;
        trail.geometry.attributes.color.needsUpdate = true;
        trail.geometry.setDrawRange(0, trail.positions.length);
    }

    /**
     * 업데이트
     */
    update(deltaTime) {
        this.particleGroups.forEach((group, name) => {
            const posArray = group.geometry.attributes.position.array;
            const alphaArray = group.geometry.attributes.alpha.array;
            const sizeArray = group.geometry.attributes.size.array;

            for (let i = group.particles.length - 1; i >= 0; i--) {
                const p = group.particles[i];
                const idx = p.index;

                // 수명 감소
                p.life -= deltaTime / p.maxLife;

                if (p.life <= 0) {
                    // 파티클 제거
                    alphaArray[idx] = 0;
                    posArray[idx * 3 + 1] = -1000; // 화면 밖
                    group.particles.splice(i, 1);
                    continue;
                }

                // 호밍 (에너지 파티클)
                if (p.homing && p.target) {
                    const dx = p.target.x - p.position.x;
                    const dy = p.target.y - p.position.y;
                    const dz = p.target.z - p.position.z;

                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist > 0.1) {
                        const accel = 10;
                        p.velocity.x += (dx / dist) * accel * deltaTime;
                        p.velocity.y += (dy / dist) * accel * deltaTime;
                        p.velocity.z += (dz / dist) * accel * deltaTime;
                    }
                }

                // 중력
                if (p.gravity) {
                    p.velocity.y += p.gravity * deltaTime;
                }

                // 드래그
                const drag = 0.98;
                p.velocity.x *= drag;
                p.velocity.y *= drag;
                p.velocity.z *= drag;

                // 위치 업데이트
                p.position.x += p.velocity.x * deltaTime;
                p.position.y += p.velocity.y * deltaTime;
                p.position.z += p.velocity.z * deltaTime;

                // 버퍼 업데이트
                posArray[idx * 3] = p.position.x;
                posArray[idx * 3 + 1] = p.position.y;
                posArray[idx * 3 + 2] = p.position.z;

                alphaArray[idx] = p.life;
                sizeArray[idx] = p.size * p.life;
            }

            group.geometry.attributes.position.needsUpdate = true;
            group.geometry.attributes.alpha.needsUpdate = true;
            group.geometry.attributes.size.needsUpdate = true;
        });

        // 셰이더 유니폼 업데이트
        this.particleGroups.forEach(group => {
            if (group.material && group.material.uniforms) {
                this.shaderSystem.updateUniforms(group.material, deltaTime);
            }
        });
    }

    /**
     * 모든 파티클 클리어
     */
    clear() {
        this.particleGroups.forEach(group => {
            group.particles = [];
            group.nextIndex = 0;

            const alphaArray = group.geometry.attributes.alpha.array;
            for (let i = 0; i < alphaArray.length; i++) {
                alphaArray[i] = 0;
            }
            group.geometry.attributes.alpha.needsUpdate = true;
        });

        this.trails.forEach(trail => {
            trail.positions = [];
        });
    }

    /**
     * 정리
     */
    dispose() {
        this.particleGroups.forEach(group => {
            this.scene.remove(group.points);
            group.geometry.dispose();
            group.material.dispose();
        });

        this.trails.forEach(trail => {
            this.scene.remove(trail.line);
            trail.geometry.dispose();
            trail.material.dispose();
        });

        this.particleGroups.clear();
        this.trails = [];
    }
}
