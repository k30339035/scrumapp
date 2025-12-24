/**
 * 성능 모니터링 및 동적 품질 조정
 */

import { GameConfig } from '../core/Config.js';

export class PerformanceMonitor {
    constructor() {
        this.fps = 60;
        this.frameTimes = [];
        this.maxSamples = 60;
        this.lastTime = performance.now();
        this.deltaTime = 0;

        // 품질 레벨 (0: Low, 1: Medium, 2: High)
        this.qualityLevel = GameConfig.GRAPHICS.IS_MOBILE ? 0 : 2;
        this.autoQuality = GameConfig.PERFORMANCE.AUTO_QUALITY;

        // 성능 통계
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            points: 0,
            particles: 0,
        };

        // 저사양 모드 플래그
        this.lowPerfMode = false;
        this.frameDropCount = 0;
    }

    /**
     * 프레임 업데이트
     */
    update() {
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000; // 초 단위
        this.lastTime = currentTime;

        // FPS 계산
        const frameTime = this.deltaTime * 1000;
        this.frameTimes.push(frameTime);

        if (this.frameTimes.length > this.maxSamples) {
            this.frameTimes.shift();
        }

        // 평균 FPS 계산
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.fps = Math.round(1000 / avgFrameTime);

        // 자동 품질 조정
        if (this.autoQuality) {
            this._adjustQuality();
        }

        return this.deltaTime;
    }

    /**
     * 품질 자동 조정
     */
    _adjustQuality() {
        const targetFPS = GameConfig.PERFORMANCE.FPS_TARGET;
        const lowThreshold = GameConfig.PERFORMANCE.FPS_LOW_THRESHOLD;

        // 저사양 감지
        if (this.fps < lowThreshold) {
            this.frameDropCount++;

            if (this.frameDropCount > 10 && this.qualityLevel > 0) {
                this.qualityLevel--;
                this.frameDropCount = 0;
                console.log(`[PerformanceMonitor] Quality decreased to ${this.qualityLevel}`);
                this._applyQualitySettings();
            }
        } else if (this.fps > targetFPS * 0.9) {
            this.frameDropCount = Math.max(0, this.frameDropCount - 1);

            // 성능 여유가 있으면 품질 상승
            if (this.frameDropCount === 0 && this.qualityLevel < 2 && this.fps > targetFPS * 1.1) {
                this.qualityLevel++;
                console.log(`[PerformanceMonitor] Quality increased to ${this.qualityLevel}`);
                this._applyQualitySettings();
            }
        }
    }

    /**
     * 품질 설정 적용
     */
    _applyQualitySettings() {
        switch (this.qualityLevel) {
            case 0: // Low
                GameConfig.PERFORMANCE.MAX_PARTICLES = 500;
                GameConfig.PERFORMANCE.MAX_DRONES = 30;
                GameConfig.GRAPHICS.SHADOW_MAP_SIZE = 512;
                this.lowPerfMode = true;
                break;

            case 1: // Medium
                GameConfig.PERFORMANCE.MAX_PARTICLES = 1000;
                GameConfig.PERFORMANCE.MAX_DRONES = 40;
                GameConfig.GRAPHICS.SHADOW_MAP_SIZE = 1024;
                this.lowPerfMode = false;
                break;

            case 2: // High
                GameConfig.PERFORMANCE.MAX_PARTICLES = 2000;
                GameConfig.PERFORMANCE.MAX_DRONES = 50;
                GameConfig.GRAPHICS.SHADOW_MAP_SIZE = 2048;
                this.lowPerfMode = false;
                break;
        }
    }

    /**
     * 렌더러 정보 업데이트
     */
    updateRendererInfo(renderer) {
        const info = renderer.info;
        this.stats.drawCalls = info.render.calls;
        this.stats.triangles = info.render.triangles;
        this.stats.points = info.render.points;
    }

    /**
     * 파티클 수 업데이트
     */
    updateParticleCount(count) {
        this.stats.particles = count;
    }

    /**
     * FPS 가져오기
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Delta Time 가져오기
     */
    getDeltaTime() {
        return Math.min(this.deltaTime, 0.1); // 최대 100ms로 제한
    }

    /**
     * 품질 레벨 가져오기
     */
    getQualityLevel() {
        return this.qualityLevel;
    }

    /**
     * 품질 레벨 설정
     */
    setQualityLevel(level) {
        this.qualityLevel = Math.max(0, Math.min(2, level));
        this._applyQualitySettings();
    }

    /**
     * 성능 통계 가져오기
     */
    getStats() {
        return {
            fps: this.fps,
            deltaTime: this.deltaTime,
            qualityLevel: this.qualityLevel,
            lowPerfMode: this.lowPerfMode,
            ...this.stats,
        };
    }

    /**
     * 성능 경고 체크
     */
    isPerformanceWarning() {
        return this.fps < GameConfig.PERFORMANCE.FPS_LOW_THRESHOLD;
    }

    /**
     * 메모리 정보 가져오기 (가능한 경우)
     */
    getMemoryInfo() {
        if (performance.memory) {
            return {
                usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
                totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
                jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
            };
        }
        return null;
    }

    /**
     * 디버그 정보 출력
     */
    logDebugInfo() {
        console.log('[PerformanceMonitor]', {
            fps: this.fps,
            qualityLevel: this.qualityLevel,
            lowPerfMode: this.lowPerfMode,
            stats: this.stats,
            memory: this.getMemoryInfo(),
        });
    }
}
