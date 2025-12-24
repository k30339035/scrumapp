/**
 * 입력 시스템 - 키보드, 마우스, 터치 통합 관리
 */

import { GameConfig } from '../core/Config.js';

export class InputSystem {
    constructor() {
        this.keys = new Map();
        this.mousePos = { x: 0, y: 0 };
        this.touchPos = { x: 0, y: 0 };
        this.touchStartPos = { x: 0, y: 0 };
        this.touchStartTime = 0;

        // 입력 벡터 (-1 ~ 1)
        this.inputVector = { x: 0, z: 0 };

        // 터치/마우스 활성화
        this.isTouching = false;
        this.isMouseDown = false;

        // 스와이프 감지
        this.swipeDirection = null;

        this._initListeners();
    }

    /**
     * 이벤트 리스너 초기화
     */
    _initListeners() {
        // 키보드
        if (GameConfig.INPUT.KEYBOARD_ENABLED) {
            window.addEventListener('keydown', (e) => this._onKeyDown(e));
            window.addEventListener('keyup', (e) => this._onKeyUp(e));
        }

        // 마우스
        if (GameConfig.INPUT.MOUSE_ENABLED) {
            window.addEventListener('mousemove', (e) => this._onMouseMove(e));
            window.addEventListener('mousedown', (e) => this._onMouseDown(e));
            window.addEventListener('mouseup', (e) => this._onMouseUp(e));
        }

        // 터치
        if (GameConfig.INPUT.TOUCH_ENABLED) {
            window.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
            window.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
            window.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        }

        // 컨텍스트 메뉴 비활성화
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * 키보드 이벤트
     */
    _onKeyDown(e) {
        this.keys.set(e.code, true);

        // ESC, Space 등 기본 동작 방지
        if (['Space', 'Escape'].includes(e.code)) {
            e.preventDefault();
        }
    }

    _onKeyUp(e) {
        this.keys.set(e.code, false);
    }

    /**
     * 마우스 이벤트
     */
    _onMouseMove(e) {
        this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    _onMouseDown(e) {
        this.isMouseDown = true;
    }

    _onMouseUp(e) {
        this.isMouseDown = false;
    }

    /**
     * 터치 이벤트
     */
    _onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];

        this.touchStartPos.x = touch.clientX;
        this.touchStartPos.y = touch.clientY;
        this.touchStartTime = Date.now();
        this.isTouching = true;

        this._updateTouchPosition(touch);
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            this._updateTouchPosition(e.touches[0]);
        }
    }

    _onTouchEnd(e) {
        e.preventDefault();

        // 스와이프 감지
        const deltaTime = Date.now() - this.touchStartTime;
        if (deltaTime < 300) { // 빠른 스와이프
            const deltaX = this.touchPos.x - this.touchStartPos.x;
            const deltaY = this.touchPos.y - this.touchStartPos.y;
            const threshold = GameConfig.INPUT.SWIPE_THRESHOLD;

            if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    this.swipeDirection = deltaX > 0 ? 'right' : 'left';
                } else {
                    this.swipeDirection = deltaY > 0 ? 'down' : 'up';
                }
            }
        }

        this.isTouching = false;
        this.inputVector.x = 0;
        this.inputVector.z = 0;
    }

    _updateTouchPosition(touch) {
        this.touchPos.x = touch.clientX;
        this.touchPos.y = touch.clientY;
    }

    /**
     * 입력 업데이트 (매 프레임 호출)
     */
    update() {
        // 키보드 입력
        const keyX = (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight') ? 1 : 0) -
                     (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft') ? 1 : 0);
        const keyZ = (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown') ? 1 : 0) -
                     (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp') ? 1 : 0);

        // 터치 입력 (화면 중심 기준)
        let touchX = 0;
        let touchZ = 0;

        if (this.isTouching) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            touchX = (this.touchPos.x - centerX) / centerX;
            touchZ = (this.touchPos.y - centerY) / centerY;

            // 데드존 적용
            const deadzone = 0.1;
            if (Math.abs(touchX) < deadzone) touchX = 0;
            if (Math.abs(touchZ) < deadzone) touchZ = 0;
        }

        // 입력 병합 (키보드 우선)
        this.inputVector.x = keyX !== 0 ? keyX : touchX;
        this.inputVector.z = keyZ !== 0 ? keyZ : touchZ;

        // 정규화 (대각선 이동 속도 보정)
        const magnitude = Math.sqrt(
            this.inputVector.x * this.inputVector.x +
            this.inputVector.z * this.inputVector.z
        );

        if (magnitude > 1) {
            this.inputVector.x /= magnitude;
            this.inputVector.z /= magnitude;
        }

        // 스와이프 방향 리셋
        const currentSwipe = this.swipeDirection;
        this.swipeDirection = null;

        return currentSwipe;
    }

    /**
     * 키 눌림 상태 확인
     */
    isKeyPressed(keyCode) {
        return this.keys.get(keyCode) === true;
    }

    /**
     * 키가 방금 눌렸는지 확인 (한 번만 true)
     */
    isKeyJustPressed(keyCode) {
        if (this.keys.get(keyCode) === true) {
            this.keys.set(keyCode, 'processed');
            return true;
        }
        return false;
    }

    /**
     * 입력 벡터 가져오기
     */
    getInputVector() {
        return { ...this.inputVector };
    }

    /**
     * 마우스 위치 가져오기 (정규화)
     */
    getMousePosition() {
        return { ...this.mousePos };
    }

    /**
     * 터치 위치 가져오기
     */
    getTouchPosition() {
        return { ...this.touchPos };
    }

    /**
     * 입력 활성화 여부
     */
    hasInput() {
        return this.inputVector.x !== 0 || this.inputVector.z !== 0;
    }

    /**
     * 일시정지 키 확인
     */
    isPausePressed() {
        return this.isKeyJustPressed('Escape') || this.isKeyJustPressed('KeyP');
    }

    /**
     * 재시작 키 확인
     */
    isRestartPressed() {
        return this.isKeyJustPressed('KeyR') || this.isKeyJustPressed('Enter');
    }

    /**
     * 입력 리셋
     */
    reset() {
        this.inputVector.x = 0;
        this.inputVector.z = 0;
        this.isTouching = false;
        this.isMouseDown = false;
        this.swipeDirection = null;
    }

    /**
     * 진동 피드백 (모바일)
     */
    vibrate(duration = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }

    /**
     * 정리
     */
    dispose() {
        this.keys.clear();
        this.reset();
    }
}
