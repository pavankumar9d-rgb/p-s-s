/**
 * SoundManager.js
 * Synthesizes background music loops and arcade SFX dynamically using the Web Audio API.
 * Avoids heavy assets and provides zero-latency sound feedback.
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isEnabled = true;
        
        // Sequencer variables for procedural BGM
        this.isPlayingBGM = false;
        this.bpm = 125;
        this.stepTime = 60 / this.bpm / 2; // eighth notes
        this.nextNoteTime = 0.0;
        this.currentStep = 0;
        this.timerId = null;
        
        // Bassline pattern (notes relative to key of C minor)
        // frequencies: C2 (65Hz), Eb2 (77Hz), G2 (98Hz), Bb2 (116Hz)
        this.bassFrequencies = [65.41, 65.41, 77.78, 77.78, 98.00, 98.00, 116.54, 116.54];
        
        // Load settings
        const storedAudio = localStorage.getItem("neon_velocity_audio");
        if (storedAudio !== null) {
            this.isEnabled = JSON.parse(storedAudio);
        }
    }

    init() {
        if (this.ctx) return;
        
        // Create context on user interaction
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.setValueAtTime(this.isEnabled ? 0.35 : 0.0, this.ctx.currentTime);
        
        console.log("Web Audio API Synthesizer Initialized.");
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem("neon_velocity_audio", JSON.stringify(enabled));
        
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(enabled ? 0.35 : 0.0, this.ctx.currentTime);
        }
        
        if (enabled && this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Dynamic tempo adjustment relative to running speed
    adjustTempo(speedRatio) {
        // speedRatio is typically 1.0 up to 2.5
        const baseBpm = 125;
        this.bpm = Math.min(180, Math.floor(baseBpm * (0.85 + speedRatio * 0.15)));
        this.stepTime = 60 / this.bpm / 2;
    }

    // PROCEDURAL SYNTHWAVE SOUND EFFECTS

    // 1. Coin collect chime
    playCoin() {
        if (!this.isEnabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // High crystalline chime: dual sine waves
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now); // B5 note
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6 note

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, now);
        osc2.frequency.exponentialRampToValueAtTime(1975.53, now + 0.12); // B6 note

        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    }

    // 2. Swipe sweep (whoosh)
    playSwipe() {
        if (!this.isEnabled) return;
        this.init();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        filter.Q.setValueAtTime(3.0, now);

        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // 3. Jump grunting/sweep
    playJump() {
        if (!this.isEnabled) return;
        this.init();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.15);

        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // 4. Slide landing impact (friction noise)
    playSlide() {
        if (!this.isEnabled) return;
        this.init();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Low-freq buzz for friction
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.35);

        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.45);
    }

    // 5. Jetpack booster hum
    playJetpack(durationSecs) {
        if (!this.isEnabled) return null;
        this.init();

        const now = this.ctx.currentTime;
        
        // Continuous thruster sound
        const osc = this.ctx.createOscillator();
        const noise = this._createNoiseNode();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65.41, now); // Low C rumble
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        gainNode.gain.setValueAtTime(0.1, now);
        
        if (noise) {
            noise.connect(filter);
        }
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        if (noise) noise.start(now);

        // Return controller object so we can stop it early
        return {
            stop: () => {
                const stopTime = this.ctx.currentTime;
                gainNode.gain.cancelScheduledValues(stopTime);
                gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.2);
                setTimeout(() => {
                    try { osc.stop(); } catch(e){}
                    try { if (noise) noise.stop(); } catch(e){}
                }, 250);
            }
        };
    }

    // 6. Shield hit (laser block chime)
    playShieldHit() {
        if (!this.isEnabled) return;
        this.init();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);

        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    // 7. Crash explosion (bass drop & white noise)
    playCrash() {
        if (!this.isEnabled) return;
        this.init();
        this.stopBGM(); // Stop music immediately on death

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noise = this._createNoiseNode();
        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();

        // Sub bass drop
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.6);

        // Explosion noise
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + 0.65);

        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gainNode);
        if (noise) {
            noise.connect(filter);
            filter.connect(gainNode);
        }
        gainNode.connect(this.masterGain);

        osc.start(now);
        if (noise) noise.start(now);
        
        osc.stop(now + 0.85);
        if (noise) noise.stop(now + 0.85);
    }

    // Helper to create procedural white noise
    _createNoiseNode() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        return source;
    }

    // PROCEDURAL BACKGROUND MUSIC SEQUENCE RUNNER

    startBGM() {
        if (this.isPlayingBGM) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.isPlayingBGM = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime;
        
        this._schedulerLoop();
        console.log("Procedural Synthwave Music Started.");
    }

    stopBGM() {
        this.isPlayingBGM = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    _schedulerLoop() {
        if (!this.isPlayingBGM) return;

        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this._schedulePlayStep(this.currentStep, this.nextNoteTime);
            this._advanceStep();
        }
        
        this.timerId = setTimeout(() => this._schedulerLoop(), 25);
    }

    _advanceStep() {
        this.currentStep = (this.currentStep + 1) % 16;
        this.nextNoteTime += this.stepTime;
    }

    _schedulePlayStep(step, time) {
        if (!this.isEnabled || !this.ctx) return;

        // 1. Synth Bassline (every step has a sub bass beat, standard pumping)
        const bassFreq = this.bassFrequencies[Math.floor(step / 2) % this.bassFrequencies.length];
        // Introduce simple octave jumps on odd steps
        const freq = (step % 2 === 1) ? bassFreq * 2 : bassFreq;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        // Low pass filter to make it sound warm and retro
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, time);
        
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + this.stepTime * 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(time);
        osc.stop(time + this.stepTime);

        // 2. Synthesized drums
        // Kick on step 0, 4, 8, 12 (four-on-the-floor)
        if (step % 4 === 0) {
            this._synthesizeKick(time);
        }

        // Snare on step 4, 12
        if (step % 8 === 4) {
            this._synthesizeSnare(time);
        }
    }

    _synthesizeKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    _synthesizeSnare(time) {
        // High-pass noise snare
        const noise = this._createNoiseNode();
        if (!noise) return;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.07, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + 0.15);
    }
}

export { SoundManager };
export default SoundManager;
