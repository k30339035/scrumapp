/**
 * 게임 설정 및 상수
 * 모든 게임 파라미터를 중앙 집중식으로 관리
 */

export const GameConfig = {
    // 렌더링 설정
    RENDERER: {
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
        alpha: false,
    },

    // 그래픽 품질 설정
    GRAPHICS: {
        SHADOW_MAP_SIZE: 2048,
        SHADOW_BIAS: -0.0001,
        SHADOW_RADIUS: 2,
        PIXEL_RATIO: Math.min(window.devicePixelRatio, 2),
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        // 모바일 감지
        IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    },

    // 성능 설정
    PERFORMANCE: {
        MAX_PARTICLES: 2000,
        MAX_DRONES: 50,
        POLY_COUNT_TARGET: 50000,
        AUTO_QUALITY: true,
        FPS_TARGET: 60,
        FPS_LOW_THRESHOLD: 30,
    },

    // 플레이어 설정
    PLAYER: {
        SPEED: 0.15,
        MOBILE_SPEED: 0.12,
        SIZE: 0.5,
        BOUNDARY_X: 15,
        BOUNDARY_Z: 15,
        INERTIA: 0.85,
        COLLISION_RADIUS: 0.6,
        INVINCIBILITY_TIME: 2000, // ms
    },

    // 드론 설정
    DRONE: {
        BASE_SPEED: 0.08,
        SIZE: 0.4,
        SPAWN_HEIGHT: 20,
        DESPAWN_HEIGHT: -5,
        ROTATION_SPEED: 0.05,
        // AI 패턴별 가중치
        PATTERN_WEIGHTS: {
            TRACKING: 0.4,
            PREDICTIVE: 0.3,
            SWARM: 0.2,
            RANDOM: 0.1,
        },
    },

    // 웨이브 시스템
    WAVE: {
        START_DRONES: 3,
        DRONES_PER_WAVE: 2,
        SPAWN_INTERVAL: 1500, // ms
        DIFFICULTY_MULTIPLIER: 1.15,
        MAX_WAVE: 50,
    },

    // 파워업 설정
    POWERUP: {
        SPAWN_CHANCE: 0.15,
        DURATION: {
            SHIELD: 5000,
            TIME_SLOW: 4000,
            MAGNET: 6000,
        },
        TIME_SLOW_FACTOR: 0.4,
        MAGNET_RADIUS: 3,
        FALL_SPEED: 0.05,
    },

    // 점수 시스템
    SCORE: {
        DODGE_BASE: 10,
        COMBO_MULTIPLIER: 1.5,
        COMBO_TIMEOUT: 2000, // ms
        MAX_COMBO: 20,
        WAVE_BONUS: 100,
    },

    // 색상 테마 (PBR 호환)
    COLORS: {
        PLAYER: 0x00ff88,
        DRONE: 0xff3366,
        SHIELD: 0x00ccff,
        TIME_SLOW: 0xffaa00,
        MAGNET: 0xff00ff,
        TRAIL: 0x88ffff,
        GROUND: 0x1a1a2e,
        SKY: 0x0f0f1e,
    },

    // 라이팅
    LIGHTING: {
        AMBIENT: {
            color: 0x404060,
            intensity: 0.4,
        },
        DIRECTIONAL: {
            color: 0xffffff,
            intensity: 1.0,
            position: { x: 10, y: 20, z: 10 },
        },
        POINT: {
            color: 0x00ffff,
            intensity: 0.5,
            distance: 30,
        },
    },

    // 오디오
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.8,
        MUSIC_VOLUME: 0.5,
        OSCILLATOR_TYPES: ['sine', 'square', 'sawtooth', 'triangle'],
    },

    // 입력
    INPUT: {
        KEYBOARD_ENABLED: true,
        MOUSE_ENABLED: true,
        TOUCH_ENABLED: true,
        GAMEPAD_ENABLED: false,
        SWIPE_THRESHOLD: 30,
        TAP_THRESHOLD: 200, // ms
    },

    // 저장
    SAVE: {
        KEY: 'drone_game_save',
        AUTO_SAVE: true,
        VERSION: '1.0.0',
    },
};

// 게임 상태 열거형
export const GameStates = {
    LOADING: 'LOADING',
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER',
};

// AI 패턴 타입
export const AIPatterns = {
    TRACKING: 'TRACKING',       // 플레이어 직접 추적
    PREDICTIVE: 'PREDICTIVE',   // 플레이어 이동 예측
    SWARM: 'SWARM',            // 집단 행동
    RANDOM: 'RANDOM',          // 랜덤 움직임
};

// 파워업 타입
export const PowerUpTypes = {
    SHIELD: 'SHIELD',
    TIME_SLOW: 'TIME_SLOW',
    MAGNET: 'MAGNET',
};

// 이벤트 타입
export const GameEvents = {
    STATE_CHANGE: 'stateChange',
    SCORE_UPDATE: 'scoreUpdate',
    COMBO_UPDATE: 'comboUpdate',
    WAVE_COMPLETE: 'waveComplete',
    PLAYER_HIT: 'playerHit',
    POWERUP_COLLECTED: 'powerupCollected',
    GAME_OVER: 'gameOver',
    DRONE_DODGED: 'droneDodged',
};
