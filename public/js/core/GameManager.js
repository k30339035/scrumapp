/**
 * 게임 매니저 - 모든 시스템 통합 관리
 */

import { GameStates, GameConfig } from './Config.js';
import { GameState } from './GameState.js';
import { GraphicsSystem } from '../systems/GraphicsSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { ShaderSystem } from '../systems/ShaderSystem.js';
import { AdvancedParticleSystem } from '../systems/AdvancedParticleSystem.js';
import { AudioManager } from '../managers/AudioManager.js';
import { UIManager } from '../managers/UIManager.js';
import { SaveManager } from '../managers/SaveManager.js';
import { WaveManager } from '../managers/WaveManager.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { Player } from '../entities/Player.js';

export class GameManager {
    constructor(canvas) {
        this.canvas = canvas;

        // 시스템
        this.graphicsSystem = null;
        this.shaderSystem = null;
        this.inputSystem = null;
        this.particleSystem = null;
        this.advancedParticles = null;
        this.audioManager = null;
        this.uiManager = null;
        this.saveManager = null;
        this.waveManager = null;
        this.performanceMonitor = null;

        // 게임 상태
        this.gameState = null;

        // 엔티티
        this.player = null;

        // 게임 루프
        this.animationFrameId = null;
        this.isRunning = false;

        this._init();
    }

    /**
     * 초기화
     */
    async _init() {
        console.log('[GameManager] Initializing...');

        // 게임 상태 생성
        this.gameState = new GameState();

        // 시스템 초기화
        this.graphicsSystem = new GraphicsSystem(this.canvas);
        this.shaderSystem = new ShaderSystem();
        this.inputSystem = new InputSystem();
        this.particleSystem = new ParticleSystem(this.graphicsSystem.getScene());
        this.advancedParticles = new AdvancedParticleSystem(
            this.graphicsSystem.getScene(),
            this.shaderSystem
        );
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager(this.gameState);
        this.saveManager = new SaveManager();
        this.waveManager = new WaveManager(
            this.graphicsSystem.getScene(),
            this.graphicsSystem,
            this.shaderSystem,
            this.advancedParticles
        );
        this.performanceMonitor = new PerformanceMonitor();

        // 플레이어 생성
        this.player = new Player(
            this.graphicsSystem.getScene(),
            this.graphicsSystem,
            this.shaderSystem
        );

        // 저장 데이터 로드
        this._loadSaveData();

        // UI 버튼 이벤트
        this._setupUIEvents();

        // 게임 상태를 메뉴로
        this.gameState.setState(GameStates.MENU);

        // 게임 루프 시작
        this._startGameLoop();

        console.log('[GameManager] Initialized');
    }

    /**
     * 저장 데이터 로드
     */
    _loadSaveData() {
        const saveData = this.saveManager.load();
        if (saveData) {
            this.gameState.loadSaveData(saveData);
            console.log('[GameManager] Save data loaded');
        }
    }

    /**
     * UI 이벤트 설정
     */
    _setupUIEvents() {
        // 게임 시작
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.audioManager.play('ui');
                this.startGame();
            });
        }

        // 재시작
        const restartBtns = document.querySelectorAll('.restart-btn');
        restartBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.audioManager.play('ui');
                this.restartGame();
            });
        });

        // 계속하기 (일시정지)
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.audioManager.play('ui');
                this.resumeGame();
            });
        }

        // 메뉴로
        const menuBtns = document.querySelectorAll('.menu-btn');
        menuBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.audioManager.play('ui');
                this.returnToMenu();
            });
        });
    }

    /**
     * 게임 시작
     */
    startGame() {
        console.log('[GameManager] Starting game...');

        this.gameState.setState(GameStates.PLAYING);
        this.player.reset();
        this.waveManager.reset();
        this.particleSystem.clear();
        this.advancedParticles.clear();

        this.waveManager.startWave(1);

        // 터치 힌트 (모바일)
        if (GameConfig.GRAPHICS.IS_MOBILE) {
            this.uiManager.showTouchHint();
        }
    }

    /**
     * 게임 재시작
     */
    restartGame() {
        this.startGame();
    }

    /**
     * 게임 일시정지
     */
    pauseGame() {
        if (this.gameState.canPause()) {
            this.gameState.setState(GameStates.PAUSED);
            this.audioManager.play('ui');
        }
    }

    /**
     * 게임 재개
     */
    resumeGame() {
        if (this.gameState.canResume()) {
            this.gameState.setState(GameStates.PLAYING);
        }
    }

    /**
     * 메뉴로 돌아가기
     */
    returnToMenu() {
        this.gameState.setState(GameStates.MENU);
        this.player.reset();
        this.waveManager.reset();
        this.particleSystem.clear();
        this.advancedParticles.clear();

        // 저장
        this.saveManager.save(this.gameState);
    }

    /**
     * 게임 루프 시작
     */
    _startGameLoop() {
        this.isRunning = true;
        this._gameLoop();
    }

    /**
     * 게임 루프
     */
    _gameLoop() {
        if (!this.isRunning) return;

        // 성능 모니터링
        const deltaTime = this.performanceMonitor.update();

        // 게임 상태별 업데이트
        if (this.gameState.isPlaying()) {
            this._updateGame(deltaTime);
        }

        // 입력 처리 (일시정지 등)
        this._handleInput();

        // 파티클 업데이트 (항상)
        this.particleSystem.update(deltaTime);
        this.advancedParticles.update(deltaTime);

        // 렌더링
        this.graphicsSystem.render();

        // 성능 정보 업데이트
        this.performanceMonitor.updateRendererInfo(this.graphicsSystem.getRenderer());
        this.performanceMonitor.updateParticleCount(this.particleSystem.getActiveCount());

        // 디버그 정보 업데이트
        this._updateDebugInfo();

        // 다음 프레임
        this.animationFrameId = requestAnimationFrame(() => this._gameLoop());
    }

    /**
     * 게임 업데이트
     */
    _updateGame(deltaTime) {
        // 타임스케일 (슬로우 모션)
        const timeScale = this.gameState.hasPowerUp('TIME_SLOW')
            ? GameConfig.POWERUP.TIME_SLOW_FACTOR
            : 1;

        // 입력 가져오기
        const inputVector = this.inputSystem.getInputVector();

        // 플레이어 업데이트
        this.player.update(deltaTime, inputVector, this.particleSystem);

        // 파워업 적용
        if (this.gameState.hasPowerUp('SHIELD')) {
            this.player.activateShield();
        } else {
            this.player.deactivateShield();
        }

        // 웨이브 업데이트
        const waveComplete = this.waveManager.update(
            deltaTime,
            this.player.getPosition(),
            this.gameState,
            this.particleSystem,
            this.audioManager,
            timeScale
        );

        // 웨이브 완료 시 다음 웨이브
        if (waveComplete) {
            this.gameState.nextWave();
            this.gameState.addScore(GameConfig.SCORE.WAVE_BONUS);
            this.audioManager.play('waveComplete');

            setTimeout(() => {
                this.waveManager.startWave(this.gameState.wave);
            }, 2000);
        }

        // 콤보 타임아웃 체크
        this._checkComboTimeout();
    }

    /**
     * 입력 처리
     */
    _handleInput() {
        const swipe = this.inputSystem.update();

        // 일시정지
        if (this.inputSystem.isPausePressed()) {
            if (this.gameState.isPlaying()) {
                this.pauseGame();
            } else if (this.gameState.canResume()) {
                this.resumeGame();
            }
        }

        // 재시작 (게임오버 시)
        if (this.gameState.isState(GameStates.GAMEOVER)) {
            if (this.inputSystem.isRestartPressed() || swipe) {
                this.restartGame();
            }
        }

        // 게임 시작 (메뉴에서)
        if (this.gameState.isState(GameStates.MENU)) {
            if (this.inputSystem.isRestartPressed() || swipe) {
                this.startGame();
            }
        }
    }

    /**
     * 콤보 타임아웃 체크
     */
    _checkComboTimeout() {
        if (!this._lastDodgeTime) {
            this._lastDodgeTime = Date.now();
        }

        if (this.gameState.combo > 0) {
            if (Date.now() - this._lastDodgeTime > GameConfig.SCORE.COMBO_TIMEOUT) {
                this.gameState.resetCombo();
            }
        }

        // 드론 회피 시 타임스탬프 업데이트
        this.gameState.on('droneDodged', () => {
            this._lastDodgeTime = Date.now();
        });
    }

    /**
     * 디버그 정보 업데이트
     */
    _updateDebugInfo() {
        const stats = this.performanceMonitor.getStats();

        this.uiManager.updateDebugInfo({
            fps: stats.fps,
            drones: this.waveManager.getDronesRemaining(),
            particles: this.particleSystem.getActiveCount(),
            quality: ['Low', 'Medium', 'High'][stats.qualityLevel],
        });

        // 품질 자동 조정
        if (this.performanceMonitor.lowPerfMode) {
            this.graphicsSystem.updateQuality(stats.qualityLevel);
        }
    }

    /**
     * 게임 종료
     */
    destroy() {
        this.isRunning = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // 저장
        this.saveManager.save(this.gameState);

        // 정리
        if (this.player) this.player.dispose();
        if (this.waveManager) this.waveManager.dispose();
        if (this.particleSystem) this.particleSystem.dispose();
        if (this.graphicsSystem) this.graphicsSystem.dispose();
        if (this.inputSystem) this.inputSystem.dispose();
        if (this.audioManager) this.audioManager.dispose();
        if (this.uiManager) this.uiManager.dispose();

        console.log('[GameManager] Destroyed');
    }
}
