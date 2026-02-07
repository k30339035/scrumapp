/**
 * 오디오 매니저 - Web Audio API 기반
 */

import { GameConfig } from '../core/Config.js';

export class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;

        this.sounds = new Map();
        this.activeSounds = new Set();

        this._init();
    }

    /**
     * 초기화
     */
    _init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // 마스터 게인
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = GameConfig.AUDIO.MASTER_VOLUME;
            this.masterGain.connect(this.context.destination);

            // SFX 게인
            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = GameConfig.AUDIO.SFX_VOLUME;
            this.sfxGain.connect(this.masterGain);

            // 뮤직 게인
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = GameConfig.AUDIO.MUSIC_VOLUME;
            this.musicGain.connect(this.masterGain);

            console.log('[AudioManager] Initialized');
        } catch (e) {
            console.warn('[AudioManager] Web Audio API not supported', e);
        }
    }

    /**
     * 사운드 재생
     */
    play(type, options = {}) {
        if (!this.context) return;

        // 컨텍스트 재개 (사용자 인터랙션 필요)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const soundFunc = this._getSoundGenerator(type);
        if (soundFunc) {
            soundFunc(options);
        }
    }

    /**
     * 사운드 생성기 가져오기
     */
    _getSoundGenerator(type) {
        const generators = {
            'playerMove': (opt) => this._generatePlayerMove(opt),
            'droneSpawn': (opt) => this._generateDroneSpawn(opt),
            'dodge': (opt) => this._generateDodge(opt),
            'hit': (opt) => this._generateHit(opt),
            'powerup': (opt) => this._generatePowerUp(opt),
            'explosion': (opt) => this._generateExplosion(opt),
            'ui': (opt) => this._generateUI(opt),
            'combo': (opt) => this._generateCombo(opt),
            'waveComplete': (opt) => this._generateWaveComplete(opt),
            'gameOver': (opt) => this._generateGameOver(opt),
        };

        return generators[type];
    }

    /**
     * 플레이어 이동 사운드 (미묘한 윙)
     */
    _generatePlayerMove(options) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.context.currentTime + 0.1);

        gain.gain.setValueAtTime(0.05, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.1);
    }

    /**
     * 드론 스폰 사운드
     */
    _generateDroneSpawn(options) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.context.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.3);
    }

    /**
     * 회피 성공 사운드
     */
    _generateDodge(options) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.1);

        gain.gain.setValueAtTime(0.15, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.1);
    }

    /**
     * 히트 사운드
     */
    _generateHit(options) {
        // 노이즈 + 저주파
        const bufferSize = this.context.sampleRate * 0.3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, this.context.currentTime);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.4, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(this.context.currentTime);
        noise.stop(this.context.currentTime + 0.3);
    }

    /**
     * 파워업 사운드
     */
    _generatePowerUp(options) {
        const osc1 = this.context.createOscillator();
        const osc2 = this.context.createOscillator();
        const gain = this.context.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(400, this.context.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.2);

        osc2.frequency.setValueAtTime(600, this.context.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1200, this.context.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start(this.context.currentTime);
        osc2.start(this.context.currentTime);
        osc1.stop(this.context.currentTime + 0.2);
        osc2.stop(this.context.currentTime + 0.2);
    }

    /**
     * 폭발 사운드
     */
    _generateExplosion(options) {
        const bufferSize = this.context.sampleRate * 0.5;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 5);
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.5, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);

        noise.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(this.context.currentTime);
    }

    /**
     * UI 사운드 (클릭, 호버)
     */
    _generateUI(options) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.context.currentTime);

        gain.gain.setValueAtTime(0.1, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.05);
    }

    /**
     * 콤보 사운드
     */
    _generateCombo(options) {
        const combo = options.combo || 1;
        const pitch = 400 + combo * 50;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, this.context.currentTime);

        gain.gain.setValueAtTime(0.15, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.15);
    }

    /**
     * 웨이브 완료 사운드
     */
    _generateWaveComplete(options) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.context.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.2);

        gain.gain.setValueAtTime(0.25, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.4);
    }

    /**
     * 게임 오버 사운드
     */
    _generateGameOver(options) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.8);

        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.8);
    }

    /**
     * 볼륨 설정
     */
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    setSFXVolume(volume) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    setMusicVolume(volume) {
        if (this.musicGain) {
            this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * 음소거
     */
    mute() {
        if (this.masterGain) {
            this.masterGain.gain.value = 0;
        }
    }

    unmute() {
        if (this.masterGain) {
            this.masterGain.gain.value = GameConfig.AUDIO.MASTER_VOLUME;
        }
    }

    /**
     * 정리
     */
    dispose() {
        if (this.context) {
            this.context.close();
        }
    }
}
