/**
 * 메인 엔트리 포인트
 */

import { GameManager } from './core/GameManager.js';

// 게임 인스턴스
let game = null;

/**
 * 초기화
 */
function init() {
    console.log('[Main] Initializing Drone Dodge Game...');

    // 캔버스 가져오기
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('[Main] Canvas not found!');
        return;
    }

    // 게임 매니저 생성
    game = new GameManager(canvas);

    // 윈도우 종료 시 저장
    window.addEventListener('beforeunload', () => {
        if (game) {
            game.destroy();
        }
    });

    // 가시성 변경 시 일시정지
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game && game.gameState.isPlaying()) {
            game.pauseGame();
        }
    });

    console.log('[Main] Game initialized');
}

// DOM 로드 완료 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 전역 접근 (디버깅용)
window.game = game;
