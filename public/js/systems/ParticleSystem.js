/**
 * 파티클 시스템 - 고성능 VFX
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GameConfig } from '../core/Config.js';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particlePools = new Map();
        this.activeParticles = [];

        this._init();
    }

    /**
     * 초기화
     */
    _init() {
        // 다양한 파티클 타입 풀 생성
        this._createParticlePool('trail', 500, 0.1);
        this._createParticlePool('explosion', 300, 0.15);
        this._createParticlePool('powerup', 200, 0.12);
        this._createParticlePool('hit', 100, 0.2);
    }

    /**
     * 파티클 풀 생성
     */
    _createParticlePool(type, count, size) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);

        // 초기화
        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000; // 화면 밖
            positions[i * 3 + 2] = 0;

            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;

            sizes[i] = size;
            alphas[i] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        // 커스텀 셰이더 머티리얼
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vColor = color;
                    vAlpha = alpha;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    float alpha = vAlpha * (1.0 - dist * 2.0);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.particlePools.set(type, {
            points,
            geometry,
            material,
            particles: [],
            nextIndex: 0,
            maxCount: count,
        });
    }

    /**
     * 파티클 방출
     */
    emit(type, position, options = {}) {
        const pool = this.particlePools.get(type);
        if (!pool) return;

        const count = options.count || 10;
        const color = options.color || new THREE.Color(0xffffff);
        const velocity = options.velocity || { x: 0, y: 0, z: 0 };
        const spread = options.spread || 1;
        const lifetime = options.lifetime || 1;
        const size = options.size || 0.1;

        for (let i = 0; i < count; i++) {
            const particle = {
                index: pool.nextIndex,
                position: { ...position },
                velocity: {
                    x: velocity.x + (Math.random() - 0.5) * spread,
                    y: velocity.y + (Math.random() - 0.5) * spread,
                    z: velocity.z + (Math.random() - 0.5) * spread,
                },
                color: color,
                size: size,
                lifetime: lifetime,
                age: 0,
                gravity: options.gravity || 0,
                drag: options.drag || 0.95,
            };

            this._activateParticle(pool, particle);
            pool.nextIndex = (pool.nextIndex + 1) % pool.maxCount;
        }
    }

    /**
     * 파티클 활성화
     */
    _activateParticle(pool, particle) {
        const idx = particle.index;
        const positions = pool.geometry.attributes.position.array;
        const colors = pool.geometry.attributes.color.array;
        const sizes = pool.geometry.attributes.size.array;
        const alphas = pool.geometry.attributes.alpha.array;

        // 위치 설정
        positions[idx * 3] = particle.position.x;
        positions[idx * 3 + 1] = particle.position.y;
        positions[idx * 3 + 2] = particle.position.z;

        // 색상 설정
        colors[idx * 3] = particle.color.r;
        colors[idx * 3 + 1] = particle.color.g;
        colors[idx * 3 + 2] = particle.color.b;

        // 크기 설정
        sizes[idx] = particle.size;

        // 알파 설정
        alphas[idx] = 1;

        pool.particles.push(particle);
        this.activeParticles.push({ pool, particle });
    }

    /**
     * 업데이트
     */
    update(deltaTime) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const { pool, particle } = this.activeParticles[i];

            // 나이 증가
            particle.age += deltaTime;

            // 수명 체크
            if (particle.age >= particle.lifetime) {
                this._deactivateParticle(pool, particle, i);
                continue;
            }

            // 물리 업데이트
            particle.velocity.y -= particle.gravity * deltaTime;
            particle.velocity.x *= particle.drag;
            particle.velocity.y *= particle.drag;
            particle.velocity.z *= particle.drag;

            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;
            particle.position.z += particle.velocity.z * deltaTime;

            // 알파 페이드
            const lifeRatio = particle.age / particle.lifetime;
            const alpha = 1 - lifeRatio;

            // 버퍼 업데이트
            const idx = particle.index;
            const positions = pool.geometry.attributes.position.array;
            const alphas = pool.geometry.attributes.alpha.array;

            positions[idx * 3] = particle.position.x;
            positions[idx * 3 + 1] = particle.position.y;
            positions[idx * 3 + 2] = particle.position.z;

            alphas[idx] = alpha;
        }

        // 버퍼 업데이트 알림
        this.particlePools.forEach(pool => {
            pool.geometry.attributes.position.needsUpdate = true;
            pool.geometry.attributes.alpha.needsUpdate = true;
        });
    }

    /**
     * 파티클 비활성화
     */
    _deactivateParticle(pool, particle, arrayIndex) {
        const idx = particle.index;

        // 화면 밖으로 이동
        pool.geometry.attributes.position.array[idx * 3 + 1] = -1000;
        pool.geometry.attributes.alpha.array[idx] = 0;

        // 풀에서 제거
        const poolIndex = pool.particles.indexOf(particle);
        if (poolIndex > -1) {
            pool.particles.splice(poolIndex, 1);
        }

        // 활성 리스트에서 제거
        this.activeParticles.splice(arrayIndex, 1);
    }

    /**
     * 트레일 효과
     */
    createTrail(position, color) {
        this.emit('trail', position, {
            count: 3,
            color: color,
            velocity: { x: 0, y: -0.5, z: 0 },
            spread: 0.3,
            lifetime: 0.5,
            size: 0.08,
            gravity: 0.5,
            drag: 0.98,
        });
    }

    /**
     * 폭발 효과
     */
    createExplosion(position, color, intensity = 1) {
        this.emit('explosion', position, {
            count: Math.floor(30 * intensity),
            color: color,
            velocity: { x: 0, y: 2, z: 0 },
            spread: 3,
            lifetime: 1.0,
            size: 0.15,
            gravity: 2,
            drag: 0.90,
        });
    }

    /**
     * 파워업 수집 효과
     */
    createPowerUpEffect(position, color) {
        this.emit('powerup', position, {
            count: 20,
            color: color,
            velocity: { x: 0, y: 1, z: 0 },
            spread: 2,
            lifetime: 0.8,
            size: 0.12,
            gravity: -1,
            drag: 0.95,
        });
    }

    /**
     * 히트 효과
     */
    createHitEffect(position) {
        this.emit('hit', position, {
            count: 15,
            color: new THREE.Color(0xff0000),
            velocity: { x: 0, y: 0.5, z: 0 },
            spread: 1.5,
            lifetime: 0.6,
            size: 0.2,
            gravity: 1,
            drag: 0.92,
        });
    }

    /**
     * 활성 파티클 수 가져오기
     */
    getActiveCount() {
        return this.activeParticles.length;
    }

    /**
     * 모든 파티클 클리어
     */
    clear() {
        this.activeParticles = [];
        this.particlePools.forEach(pool => {
            pool.particles = [];
            pool.nextIndex = 0;

            const alphas = pool.geometry.attributes.alpha.array;
            for (let i = 0; i < alphas.length; i++) {
                alphas[i] = 0;
            }
            pool.geometry.attributes.alpha.needsUpdate = true;
        });
    }

    /**
     * 정리
     */
    dispose() {
        this.particlePools.forEach(pool => {
            this.scene.remove(pool.points);
            pool.geometry.dispose();
            pool.material.dispose();
        });

        this.particlePools.clear();
        this.activeParticles = [];
    }
}
