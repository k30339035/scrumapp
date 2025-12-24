/**
 * 웨이브 매니저 - 난이도 및 스폰 관리
 */

import { GameConfig, AIPatterns, PowerUpTypes } from '../core/Config.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Drone } from '../entities/Drone.js';
import { PowerUp } from '../entities/PowerUp.js';

export class WaveManager {
    constructor(scene, graphicsSystem, shaderSystem, advancedParticles) {
        this.scene = scene;
        this.graphicsSystem = graphicsSystem;
        this.shaderSystem = shaderSystem;
        this.advancedParticles = advancedParticles;

        this.currentWave = 1;
        this.drones = [];
        this.powerUps = [];

        this.spawnTimer = 0;
        this.waveComplete = false;

        this.difficulty = 1;
    }

    /**
     * 웨이브 시작
     */
    startWave(waveNumber) {
        this.currentWave = waveNumber;
        this.waveComplete = false;
        this.spawnTimer = 0;

        // 난이도 계산
        this.difficulty = Math.pow(GameConfig.WAVE.DIFFICULTY_MULTIPLIER, waveNumber - 1);

        // 드론 수 계산
        const droneCount = GameConfig.WAVE.START_DRONES + (waveNumber - 1) * GameConfig.WAVE.DRONES_PER_WAVE;
        const maxDrones = Math.min(droneCount, GameConfig.PERFORMANCE.MAX_DRONES);

        console.log(`[WaveManager] Wave ${waveNumber} started - ${maxDrones} drones, difficulty ${this.difficulty.toFixed(2)}`);

        this.dronesRemaining = maxDrones;
        this.dronesSpawned = 0;
        this.totalDrones = maxDrones;
    }

    /**
     * 업데이트
     */
    update(deltaTime, playerPosition, gameState, particleSystem, audioManager, timeScale = 1) {
        // 드론 스폰
        if (this.dronesSpawned < this.totalDrones) {
            this.spawnTimer += deltaTime * 1000;

            if (this.spawnTimer >= GameConfig.WAVE.SPAWN_INTERVAL / this.difficulty) {
                this._spawnDrone();
                this.spawnTimer = 0;
            }
        }

        // 드론 업데이트
        for (let i = this.drones.length - 1; i >= 0; i--) {
            const drone = this.drones[i];

            drone.update(deltaTime, playerPosition, timeScale, this.advancedParticles);

            // 플레이어와 충돌 체크
            if (drone.getIsActive() && drone.checkCollision(playerPosition, 0.6)) {
                const wasHit = gameState.playerHit();

                if (wasHit) {
                    // 실제 피격
                    particleSystem.createHitEffect(playerPosition);
                    audioManager.play('hit');
                } else {
                    // 쉴드로 막음
                    particleSystem.createExplosion(drone.getPosition(), 0x00ccff, 0.5);
                    if (this.advancedParticles) {
                        this.advancedParticles.createExplosion(drone.getPosition(), 0x00ccff, 0.8);
                    }
                    audioManager.play('explosion');
                }

                drone.deactivate();
                particleSystem.createExplosion(drone.getPosition(), 0xff3366, 1);
            }

            // 비활성 드론 제거
            if (!drone.getIsActive()) {
                if (drone.getIsDodged()) {
                    // 회피 성공
                    gameState.incrementCombo();
                    const multiplier = Math.min(gameState.combo / 5, GameConfig.SCORE.MAX_COMBO / 5);
                    gameState.addScore(GameConfig.SCORE.DODGE_BASE, 1 + multiplier);

                    audioManager.play('dodge');
                    if (gameState.combo % 5 === 0) {
                        audioManager.play('combo', { combo: gameState.combo });
                    }
                }

                drone.dispose();
                this.drones.splice(i, 1);
                this.dronesRemaining--;
            }
        }

        // 파워업 업데이트
        const hasMagnet = gameState.hasPowerUp('MAGNET');

        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];

            powerUp.update(deltaTime, playerPosition, hasMagnet);

            // 플레이어와 충돌 체크
            if (powerUp.getIsActive() && powerUp.checkCollision(playerPosition, 0.6)) {
                this._collectPowerUp(powerUp, gameState, particleSystem, audioManager);
            }

            // 비활성 파워업 제거
            if (!powerUp.getIsActive()) {
                powerUp.dispose();
                this.powerUps.splice(i, 1);
            }
        }

        // 웨이브 완료 체크
        if (this.dronesRemaining <= 0 && !this.waveComplete) {
            this.waveComplete = true;
            console.log(`[WaveManager] Wave ${this.currentWave} complete!`);
        }

        return this.waveComplete;
    }

    /**
     * 드론 스폰
     */
    _spawnDrone() {
        // AI 패턴 선택 (가중치 기반)
        const pattern = MathUtils.weightedRandom(GameConfig.DRONE.PATTERN_WEIGHTS);

        // 스폰 위치 (화면 가장자리)
        const angle = Math.random() * Math.PI * 2;
        const radius = 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const drone = new Drone(
            this.scene,
            this.graphicsSystem,
            this.shaderSystem,
            pattern,
            this.difficulty
        );

        drone.position.x = x;
        drone.position.z = z;
        drone.mesh.position.set(x, GameConfig.DRONE.SPAWN_HEIGHT, z);

        this.drones.push(drone);
        this.dronesSpawned++;

        // 파워업 스폰 확률
        if (MathUtils.chance(GameConfig.POWERUP.SPAWN_CHANCE)) {
            this._spawnPowerUp({ x, y: 10, z });
        }
    }

    /**
     * 파워업 스폰
     */
    _spawnPowerUp(position) {
        const types = Object.values(PowerUpTypes);
        const type = MathUtils.randomChoice(types);

        const powerUp = new PowerUp(
            this.scene,
            this.graphicsSystem,
            type,
            position
        );

        this.powerUps.push(powerUp);
    }

    /**
     * 파워업 수집
     */
    _collectPowerUp(powerUp, gameState, particleSystem, audioManager) {
        const type = powerUp.getType();
        const config = powerUp._getConfig();

        gameState.addPowerUp(type, config.duration);
        powerUp.collect();

        particleSystem.createPowerUpEffect(powerUp.position, config.color);
        audioManager.play('powerup');

        console.log(`[WaveManager] PowerUp collected: ${type}`);
    }

    /**
     * 웨이브 완료 여부
     */
    isWaveComplete() {
        return this.waveComplete;
    }

    /**
     * 현재 웨이브 번호
     */
    getCurrentWave() {
        return this.currentWave;
    }

    /**
     * 남은 드론 수
     */
    getDronesRemaining() {
        return this.dronesRemaining;
    }

    /**
     * 리셋
     */
    reset() {
        // 모든 드론 제거
        this.drones.forEach(drone => drone.dispose());
        this.drones = [];

        // 모든 파워업 제거
        this.powerUps.forEach(powerUp => powerUp.dispose());
        this.powerUps = [];

        this.currentWave = 1;
        this.difficulty = 1;
        this.waveComplete = false;
        this.spawnTimer = 0;
    }

    /**
     * 정리
     */
    dispose() {
        this.reset();
    }
}
