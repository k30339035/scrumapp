/**
 * 게임 상태 관리 클래스
 * 상태 머신 패턴을 사용한 게임 상태 전환
 */

import { GameStates, GameEvents } from './Config.js';

export class GameState {
    constructor() {
        this.currentState = GameStates.LOADING;
        this.previousState = null;
        this.listeners = new Map();

        // 게임 데이터
        this.score = 0;
        this.highScore = 0;
        this.wave = 1;
        this.combo = 0;
        this.lives = 3;
        this.activePowerUps = new Set();
        this.startTime = 0;
        this.pauseTime = 0;
        this.totalPauseTime = 0;
    }

    /**
     * 상태 전환
     */
    setState(newState) {
        if (this.currentState === newState) return;

        const oldState = this.currentState;
        this.previousState = oldState;
        this.currentState = newState;

        console.log(`[GameState] ${oldState} → ${newState}`);

        // 상태별 초기화
        this._onStateEnter(newState);
        this._onStateExit(oldState);

        // 이벤트 발생
        this.emit(GameEvents.STATE_CHANGE, { oldState, newState });
    }

    /**
     * 상태 진입 시 처리
     */
    _onStateEnter(state) {
        switch (state) {
            case GameStates.PLAYING:
                if (this.previousState !== GameStates.PAUSED) {
                    this.startTime = Date.now();
                    this.totalPauseTime = 0;
                }
                break;

            case GameStates.PAUSED:
                this.pauseTime = Date.now();
                break;

            case GameStates.MENU:
                this.resetGame();
                break;

            case GameStates.GAMEOVER:
                this.updateHighScore();
                break;
        }
    }

    /**
     * 상태 종료 시 처리
     */
    _onStateExit(state) {
        if (state === GameStates.PAUSED) {
            this.totalPauseTime += Date.now() - this.pauseTime;
        }
    }

    /**
     * 점수 추가
     */
    addScore(points, multiplier = 1) {
        const actualPoints = Math.floor(points * multiplier);
        this.score += actualPoints;
        this.emit(GameEvents.SCORE_UPDATE, { score: this.score, added: actualPoints });
    }

    /**
     * 콤보 증가
     */
    incrementCombo() {
        this.combo++;
        this.emit(GameEvents.COMBO_UPDATE, { combo: this.combo });
    }

    /**
     * 콤보 리셋
     */
    resetCombo() {
        if (this.combo > 0) {
            this.combo = 0;
            this.emit(GameEvents.COMBO_UPDATE, { combo: 0 });
        }
    }

    /**
     * 웨이브 증가
     */
    nextWave() {
        this.wave++;
        this.emit(GameEvents.WAVE_COMPLETE, { wave: this.wave });
    }

    /**
     * 플레이어 피격
     */
    playerHit() {
        if (this.activePowerUps.has('SHIELD')) {
            this.removePowerUp('SHIELD');
            return false; // 피격 무효
        }

        this.lives--;
        this.resetCombo();
        this.emit(GameEvents.PLAYER_HIT, { lives: this.lives });

        if (this.lives <= 0) {
            this.setState(GameStates.GAMEOVER);
            this.emit(GameEvents.GAME_OVER, { score: this.score, wave: this.wave });
        }

        return true; // 실제 피격
    }

    /**
     * 파워업 추가
     */
    addPowerUp(type, duration) {
        this.activePowerUps.add(type);
        this.emit(GameEvents.POWERUP_COLLECTED, { type, duration });

        // 일정 시간 후 제거
        setTimeout(() => {
            this.removePowerUp(type);
        }, duration);
    }

    /**
     * 파워업 제거
     */
    removePowerUp(type) {
        this.activePowerUps.delete(type);
    }

    /**
     * 파워업 활성화 여부
     */
    hasPowerUp(type) {
        return this.activePowerUps.has(type);
    }

    /**
     * 최고 점수 업데이트
     */
    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            return true;
        }
        return false;
    }

    /**
     * 게임 리셋
     */
    resetGame() {
        this.score = 0;
        this.wave = 1;
        this.combo = 0;
        this.lives = 3;
        this.activePowerUps.clear();
        this.startTime = 0;
        this.pauseTime = 0;
        this.totalPauseTime = 0;
    }

    /**
     * 플레이 타임 가져오기 (초)
     */
    getPlayTime() {
        if (this.startTime === 0) return 0;
        const current = this.currentState === GameStates.PAUSED ? this.pauseTime : Date.now();
        return Math.floor((current - this.startTime - this.totalPauseTime) / 1000);
    }

    /**
     * 이벤트 리스너 등록
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * 이벤트 리스너 제거
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * 이벤트 발생
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => callback(data));
    }

    /**
     * 현재 상태 확인
     */
    isState(state) {
        return this.currentState === state;
    }

    /**
     * 게임 진행 중인지 확인
     */
    isPlaying() {
        return this.currentState === GameStates.PLAYING;
    }

    /**
     * 일시정지 가능 여부
     */
    canPause() {
        return this.currentState === GameStates.PLAYING;
    }

    /**
     * 재개 가능 여부
     */
    canResume() {
        return this.currentState === GameStates.PAUSED;
    }

    /**
     * 상태 데이터 가져오기 (저장용)
     */
    getSaveData() {
        return {
            highScore: this.highScore,
            totalGames: this.totalGames || 0,
            totalPlayTime: this.totalPlayTime || 0,
        };
    }

    /**
     * 상태 데이터 로드
     */
    loadSaveData(data) {
        if (data.highScore !== undefined) this.highScore = data.highScore;
        if (data.totalGames !== undefined) this.totalGames = data.totalGames;
        if (data.totalPlayTime !== undefined) this.totalPlayTime = data.totalPlayTime;
    }
}
