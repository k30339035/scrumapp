/**
 * 커스텀 셰이더 시스템 - 프리미엄 시각 효과
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class ShaderSystem {
    constructor() {
        this.shaders = new Map();
        this._initShaders();
    }

    /**
     * 셰이더 초기화
     */
    _initShaders() {
        // 드론 후광 셰이더
        this.shaders.set('droneGlow', {
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPositionNormal;

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                uniform float intensity;
                uniform float power;

                varying vec3 vNormal;
                varying vec3 vPositionNormal;

                void main() {
                    float fresnel = pow(1.0 - abs(dot(vNormal, vPositionNormal)), power);
                    vec3 glow = glowColor * fresnel * intensity;

                    gl_FragColor = vec4(glow, fresnel);
                }
            `,
            uniforms: {
                glowColor: { value: new THREE.Color(0xff3366) },
                intensity: { value: 2.0 },
                power: { value: 3.0 }
            }
        });

        // 홀로그램 셰이더
        this.shaders.set('hologram', {
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;

                void main() {
                    vPosition = position;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                uniform float opacity;

                varying vec3 vPosition;
                varying vec3 vNormal;

                void main() {
                    // 스캔라인 효과
                    float scanline = sin(vPosition.y * 20.0 + time * 5.0) * 0.5 + 0.5;

                    // 프레넬 효과
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float fresnel = pow(1.0 - abs(dot(vNormal, viewDirection)), 2.0);

                    // 글리치 효과
                    float glitch = step(0.98, sin(time * 10.0 + vPosition.x * 50.0));

                    vec3 finalColor = color * (scanline * 0.5 + 0.5) + glitch * 0.3;
                    float finalAlpha = (fresnel + scanline * 0.3) * opacity;

                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            uniforms: {
                color: { value: new THREE.Color(0x00ff88) },
                time: { value: 0.0 },
                opacity: { value: 0.8 }
            }
        });

        // 에너지 쉴드 셰이더
        this.shaders.set('energyShield', {
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 shieldColor;
                uniform float time;
                uniform float hitIntensity;
                uniform vec3 hitPosition;

                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vUv;

                // 노이즈 함수
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }

                void main() {
                    // 프레넬 효과
                    vec3 viewDir = normalize(vViewPosition);
                    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

                    // 육각형 패턴
                    vec2 hexUv = vUv * 10.0;
                    float hexPattern = abs(sin(hexUv.x * 3.14159) * sin(hexUv.y * 3.14159));
                    hexPattern = smoothstep(0.4, 0.6, hexPattern);

                    // 펄스 효과
                    float pulse = sin(time * 2.0) * 0.3 + 0.7;

                    // 히트 웨이브
                    float hitWave = 0.0;
                    if (hitIntensity > 0.0) {
                        float dist = length(vUv - vec2(0.5));
                        hitWave = smoothstep(1.0, 0.0, abs(dist - time * 2.0)) * hitIntensity;
                    }

                    // 최종 색상
                    vec3 finalColor = shieldColor * (pulse + hitWave);
                    float alpha = (fresnel * 0.6 + hexPattern * 0.3 + hitWave) * 0.8;

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            uniforms: {
                shieldColor: { value: new THREE.Color(0x00ccff) },
                time: { value: 0.0 },
                hitIntensity: { value: 0.0 },
                hitPosition: { value: new THREE.Vector3() }
            }
        });

        // 파티클 트레일 셰이더
        this.shaders.set('particleTrail', {
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute vec3 customColor;

                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vColor = customColor;
                    vAlpha = alpha;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;

                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    // 원형 그라디언트
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);

                    if (dist > 0.5) discard;

                    // 부드러운 가장자리
                    float alpha = vAlpha * (1.0 - smoothstep(0.3, 0.5, dist));

                    // 중심 밝기
                    float brightness = 1.0 - smoothstep(0.0, 0.3, dist);
                    vec3 color = vColor * (0.5 + brightness * 0.5);

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            uniforms: {
                pointTexture: { value: null }
            }
        });

        // 왜곡 효과 셰이더 (시간 감속)
        this.shaders.set('distortion', {
            vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform float intensity;
                uniform vec2 center;

                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;

                    // 중심으로부터의 거리
                    vec2 toCenter = center - uv;
                    float dist = length(toCenter);

                    // 왜곡 효과
                    float waveStrength = sin(dist * 20.0 - time * 5.0) * intensity;
                    vec2 distortion = normalize(toCenter) * waveStrength * 0.02;

                    uv += distortion;

                    vec4 color = texture2D(tDiffuse, uv);

                    // 색수차 (Chromatic Aberration)
                    float aberration = intensity * 0.01;
                    float r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;

                    gl_FragColor = vec4(r, g, b, 1.0);
                }
            `,
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0.0 },
                intensity: { value: 0.5 },
                center: { value: new THREE.Vector2(0.5, 0.5) }
            }
        });

        // 전기 효과 셰이더
        this.shaders.set('electricity', {
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;

                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 electricColor;
                uniform float time;
                uniform float intensity;

                varying vec2 vUv;
                varying vec3 vPosition;

                // 노이즈 함수
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }

                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);

                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));

                    vec2 u = f * f * (3.0 - 2.0 * f);

                    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }

                void main() {
                    // 번개 패턴
                    float bolt = noise(vUv * 10.0 + time * 2.0);
                    bolt = smoothstep(0.6, 0.8, bolt);

                    // 번쩍임
                    float flash = sin(time * 20.0 + vPosition.x * 10.0) * 0.5 + 0.5;
                    flash = step(0.95, flash);

                    vec3 color = electricColor * (bolt + flash) * intensity;
                    float alpha = bolt + flash * 0.5;

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            uniforms: {
                electricColor: { value: new THREE.Color(0x00ffff) },
                time: { value: 0.0 },
                intensity: { value: 1.0 }
            }
        });
    }

    /**
     * 셰이더 머티리얼 생성
     */
    createMaterial(shaderName, customUniforms = {}) {
        const shader = this.shaders.get(shaderName);

        if (!shader) {
            console.warn(`[ShaderSystem] Shader "${shaderName}" not found`);
            return null;
        }

        // 유니폼 병합
        const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        Object.keys(customUniforms).forEach(key => {
            if (uniforms[key]) {
                uniforms[key].value = customUniforms[key];
            }
        });

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    }

    /**
     * 유니폼 업데이트
     */
    updateUniforms(material, deltaTime) {
        if (!material.uniforms) return;

        // 시간 업데이트
        if (material.uniforms.time) {
            material.uniforms.time.value += deltaTime;
        }
    }

    /**
     * 후광 효과 생성
     */
    createGlowMesh(baseMesh, color = 0xff3366, scale = 1.2) {
        const glowMaterial = this.createMaterial('droneGlow', {
            glowColor: new THREE.Color(color)
        });

        const glowMesh = new THREE.Mesh(baseMesh.geometry, glowMaterial);
        glowMesh.scale.multiplyScalar(scale);

        return glowMesh;
    }

    /**
     * 홀로그램 효과 생성
     */
    createHologram(geometry, color = 0x00ff88) {
        const material = this.createMaterial('hologram', {
            color: new THREE.Color(color)
        });

        return new THREE.Mesh(geometry, material);
    }

    /**
     * 에너지 쉴드 생성
     */
    createEnergyShield(radius = 1, color = 0x00ccff) {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = this.createMaterial('energyShield', {
            shieldColor: new THREE.Color(color)
        });

        const shield = new THREE.Mesh(geometry, material);
        shield.userData.isShield = true;

        return shield;
    }

    /**
     * 쉬드 히트 효과
     */
    triggerShieldHit(shieldMesh, hitPosition) {
        if (!shieldMesh.material.uniforms) return;

        shieldMesh.material.uniforms.hitIntensity.value = 1.0;
        shieldMesh.material.uniforms.hitPosition.value.copy(hitPosition);
        shieldMesh.material.uniforms.time.value = 0.0;

        // 페이드 아웃
        const fadeOut = () => {
            if (shieldMesh.material.uniforms.hitIntensity.value > 0) {
                shieldMesh.material.uniforms.hitIntensity.value -= 0.05;
                requestAnimationFrame(fadeOut);
            }
        };
        fadeOut();
    }

    /**
     * 정리
     */
    dispose() {
        this.shaders.clear();
    }
}
