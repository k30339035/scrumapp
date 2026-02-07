/**
 * 저장 매니저 - LocalStorage 기반
 */

import { GameConfig } from '../core/Config.js';

export class SaveManager {
    constructor() {
        this.saveKey = GameConfig.SAVE.KEY;
        this.version = GameConfig.SAVE.VERSION;
    }

    /**
     * 데이터 저장
     */
    save(gameState) {
        try {
            const saveData = {
                version: this.version,
                timestamp: Date.now(),
                ...gameState.getSaveData(),
            };

            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            console.log('[SaveManager] Game saved', saveData);
            return true;
        } catch (e) {
            console.error('[SaveManager] Save failed', e);
            return false;
        }
    }

    /**
     * 데이터 로드
     */
    load() {
        try {
            const savedData = localStorage.getItem(this.saveKey);

            if (!savedData) {
                console.log('[SaveManager] No save data found');
                return null;
            }

            const data = JSON.parse(savedData);

            // 버전 체크
            if (data.version !== this.version) {
                console.warn('[SaveManager] Save version mismatch, resetting');
                this.clear();
                return null;
            }

            console.log('[SaveManager] Game loaded', data);
            return data;
        } catch (e) {
            console.error('[SaveManager] Load failed', e);
            return null;
        }
    }

    /**
     * 데이터 존재 여부
     */
    hasSaveData() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    /**
     * 데이터 삭제
     */
    clear() {
        try {
            localStorage.removeItem(this.saveKey);
            console.log('[SaveManager] Save data cleared');
            return true;
        } catch (e) {
            console.error('[SaveManager] Clear failed', e);
            return false;
        }
    }

    /**
     * 통계 업데이트
     */
    updateStats(stats) {
        try {
            const current = this.load() || {};

            const updated = {
                ...current,
                ...stats,
                lastPlayed: Date.now(),
            };

            localStorage.setItem(this.saveKey, JSON.stringify(updated));
            return true;
        } catch (e) {
            console.error('[SaveManager] Stats update failed', e);
            return false;
        }
    }

    /**
     * 최고 점수 가져오기
     */
    getHighScore() {
        const data = this.load();
        return data ? data.highScore || 0 : 0;
    }

    /**
     * 최고 점수 설정
     */
    setHighScore(score) {
        const current = this.load() || {};
        current.highScore = score;
        current.version = this.version;
        localStorage.setItem(this.saveKey, JSON.stringify(current));
    }
}
