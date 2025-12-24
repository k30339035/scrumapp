/**
 * UI 매니저 - DOM 기반 UI 관리
 */

import { GameStates } from '../core/Config.js';

export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;

        // UI 요소
        this.menuScreen = null;
        this.hudScreen = null;
        this.pauseScreen = null;
        this.gameOverScreen = null;

        this._init();
        this._setupEventListeners();
    }

    /**
     * 초기화
     */
    _init() {
        this.menuScreen = document.getElementById('menu-screen');
        this.hudScreen = document.getElementById('hud');
        this.pauseScreen = document.getElementById('pause-screen');
        this.gameOverScreen = document.getElementById('gameover-screen');

        // 초기 상태는 메뉴
        this.showMenu();
    }

    /**
     * 이벤트 리스너 설정
     */
    _setupEventListeners() {
        // 게임 상태 변경 리스너
        this.gameState.on('stateChange', (data) => {
            this._handleStateChange(data.newState);
        });

        // 점수 업데이트 리스너
        this.gameState.on('scoreUpdate', (data) => {
            this._updateScore(data.score);
        });

        // 콤보 업데이트 리스너
        this.gameState.on('comboUpdate', (data) => {
            this._updateCombo(data.combo);
        });

        // 웨이브 완료 리스너
        this.gameState.on('waveComplete', (data) => {
            this._showWaveComplete(data.wave);
        });

        // 플레이어 피격 리스너
        this.gameState.on('playerHit', (data) => {
            this._updateLives(data.lives);
        });

        // 파워업 수집 리스너
        this.gameState.on('powerupCollected', (data) => {
            this._showPowerUp(data.type, data.duration);
        });

        // 게임 오버 리스너
        this.gameState.on('gameOver', (data) => {
            this._showGameOver(data.score, data.wave);
        });
    }

    /**
     * 상태 변경 처리
     */
    _handleStateChange(newState) {
        this.hideAll();

        switch (newState) {
            case GameStates.MENU:
                this.showMenu();
                break;

            case GameStates.PLAYING:
                this.showHUD();
                break;

            case GameStates.PAUSED:
                this.showPause();
                break;

            case GameStates.GAMEOVER:
                this.showGameOver();
                break;
        }
    }

    /**
     * 모든 화면 숨기기
     */
    hideAll() {
        if (this.menuScreen) this.menuScreen.style.display = 'none';
        if (this.hudScreen) this.hudScreen.style.display = 'none';
        if (this.pauseScreen) this.pauseScreen.style.display = 'none';
        if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
    }

    /**
     * 메뉴 표시
     */
    showMenu() {
        if (this.menuScreen) {
            this.menuScreen.style.display = 'flex';

            // 최고 점수 업데이트
            const highScoreEl = document.getElementById('menu-highscore');
            if (highScoreEl) {
                highScoreEl.textContent = `HIGH SCORE: ${this.gameState.highScore}`;
            }
        }
    }

    /**
     * HUD 표시
     */
    showHUD() {
        if (this.hudScreen) {
            this.hudScreen.style.display = 'block';
            this._updateScore(this.gameState.score);
            this._updateCombo(this.gameState.combo);
            this._updateLives(this.gameState.lives);
            this._updateWave(this.gameState.wave);
        }
    }

    /**
     * 일시정지 표시
     */
    showPause() {
        if (this.pauseScreen) {
            this.pauseScreen.style.display = 'flex';
            if (this.hudScreen) this.hudScreen.style.display = 'block';
        }
    }

    /**
     * 게임오버 표시
     */
    showGameOver() {
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'flex';
        }
    }

    /**
     * 점수 업데이트
     */
    _updateScore(score) {
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
            scoreEl.textContent = score;
        }
    }

    /**
     * 콤보 업데이트
     */
    _updateCombo(combo) {
        const comboEl = document.getElementById('combo');
        if (comboEl) {
            if (combo > 1) {
                comboEl.textContent = `COMBO x${combo}`;
                comboEl.style.display = 'block';

                // 콤보 애니메이션
                comboEl.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    comboEl.style.transform = 'scale(1)';
                }, 100);
            } else {
                comboEl.style.display = 'none';
            }
        }
    }

    /**
     * 생명 업데이트
     */
    _updateLives(lives) {
        const livesEl = document.getElementById('lives');
        if (livesEl) {
            livesEl.textContent = '♥'.repeat(Math.max(0, lives));

            // 피격 시 깜빡임
            livesEl.style.color = '#ff0000';
            setTimeout(() => {
                livesEl.style.color = '#00ff88';
            }, 500);
        }
    }

    /**
     * 웨이브 업데이트
     */
    _updateWave(wave) {
        const waveEl = document.getElementById('wave');
        if (waveEl) {
            waveEl.textContent = `WAVE ${wave}`;
        }
    }

    /**
     * 웨이브 완료 메시지
     */
    _showWaveComplete(wave) {
        const messageEl = document.getElementById('wave-message');
        if (messageEl) {
            messageEl.textContent = `WAVE ${wave} COMPLETE!`;
            messageEl.style.display = 'block';
            messageEl.style.opacity = '1';

            setTimeout(() => {
                messageEl.style.opacity = '0';
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 500);
            }, 2000);
        }

        // 다음 웨이브 표시
        this._updateWave(wave + 1);
    }

    /**
     * 파워업 표시
     */
    _showPowerUp(type, duration) {
        const powerUpEl = document.getElementById('powerup-active');
        if (powerUpEl) {
            powerUpEl.textContent = type.replace('_', ' ');
            powerUpEl.style.display = 'block';

            setTimeout(() => {
                powerUpEl.style.display = 'none';
            }, duration);
        }
    }

    /**
     * 게임오버 메시지
     */
    _showGameOver(score, wave) {
        const finalScoreEl = document.getElementById('final-score');
        const finalWaveEl = document.getElementById('final-wave');
        const newHighScoreEl = document.getElementById('new-highscore');

        if (finalScoreEl) finalScoreEl.textContent = score;
        if (finalWaveEl) finalWaveEl.textContent = wave;

        // 최고 점수 갱신 확인
        const isNewHighScore = score > this.gameState.highScore;
        if (newHighScoreEl) {
            newHighScoreEl.style.display = isNewHighScore ? 'block' : 'none';
        }
    }

    /**
     * FPS 업데이트
     */
    updateFPS(fps) {
        const fpsEl = document.getElementById('fps');
        if (fpsEl) {
            fpsEl.textContent = `FPS: ${fps}`;
        }
    }

    /**
     * 디버그 정보 업데이트
     */
    updateDebugInfo(info) {
        const debugEl = document.getElementById('debug-info');
        if (debugEl) {
            debugEl.innerHTML = `
                FPS: ${info.fps}<br>
                Drones: ${info.drones || 0}<br>
                Particles: ${info.particles || 0}<br>
                Quality: ${info.quality || 'N/A'}
            `;
        }
    }

    /**
     * 로딩 진행률 업데이트
     */
    updateLoadingProgress(progress) {
        const progressEl = document.getElementById('loading-progress');
        if (progressEl) {
            progressEl.textContent = `${Math.round(progress * 100)}%`;
        }
    }

    /**
     * 로딩 완료
     */
    hideLoading() {
        const loadingEl = document.getElementById('loading-screen');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    /**
     * 터치 컨트롤 힌트 표시
     */
    showTouchHint() {
        const hintEl = document.getElementById('touch-hint');
        if (hintEl) {
            hintEl.style.display = 'block';

            setTimeout(() => {
                hintEl.style.opacity = '0';
                setTimeout(() => {
                    hintEl.style.display = 'none';
                }, 1000);
            }, 3000);
        }
    }

    /**
     * 정리
     */
    dispose() {
        this.hideAll();
    }
}
