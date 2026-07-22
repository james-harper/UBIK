// ==========================================
// 🔊 HARDWARE INTEGRATION & AUDIO MODULE
// ==========================================

const OSCILLATORS = {
    SQUARE: 'square',
    TRIANGLE: 'triangle'
};

// Scientific Pitch Notation Frequency Map (values in Hz)
const FREQUENCY_MAP = {
    DEFAULT_A4: 440, // Standard global fallback pitch reference
    CLICK_BASE: 150, // Low pitch mechanical terminal stroke
    CLICK_DROP: 40,  // Target pitch slide depth
    D5: 587.33,      // Warning Alert tone
    A5: 880,         // Warning tone: Urgent
    B5: 987.77,      // Arcade chime introductory tone
    E6: 1318.51      // Arcade chime ascendant payoff tone
};

// Singleton Audio System State
let globalAudioCtx = null;

/**
 * Initializes global AudioContext instance.
 * Returns null if the browser restricts initialization due to autoplay rules.
 */
function setSharedAudioContext() {
    try {
        // Instantiate the Singleton if it doesn't exist yet
        if (!globalAudioCtx) {
            globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        // If the context was suspended by autoplay protection, do not attempt
        // to force execution (prevents the autoplay console error warning)
        if (globalAudioCtx.state === 'suspended') {
            return null;
        }

        return globalAudioCtx;
    } catch (e) {
        return null;
    }
}

/**
 * Low-level synthesizer helper to build standard retro sound waves.
 * Uses a configuration object to ensure crystal-clear parameter readability.
 */
function createOscillatorNode(ctx, options = {}) {
    const {
        type = OSCILLATORS.SQUARE,
        frequency = FREQUENCY_MAP.DEFAULT_A4,
        startTime = ctx.currentTime,
        volume = CONFIG.AUDIO.DEFAULTS.VOLUME,
        duration = CONFIG.AUDIO.DEFAULTS.DURATION,
        frequencySlideTarget = null
    } = options;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Apply pitch slide modulation if requested
    if (frequencySlideTarget) {
        osc.frequency.exponentialRampToValueAtTime(frequencySlideTarget, startTime + duration);
    }

    // Set standard exponential volume decay envelope
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

/**
 * Two-note classic arcade synthetic chime sequence.
 * Explicitly resumes the audio context since it is fired by a button click gesture.
 */
async function playCoinChime() {
    const now = globalAudioCtx.currentTime;

    // Note 1: First Chime Step
    createOscillatorNode(globalAudioCtx, {
        type: OSCILLATORS.SQUARE,
        frequency: FREQUENCY_MAP.B5,
        startTime: now,
        volume: CONFIG.AUDIO.CHIME.VOLUME,
        duration: CONFIG.AUDIO.CHIME.DURATION_NOTE_1
    });

    // Note 2: Jumping Payoff Step (Delayed slightly)
    createOscillatorNode(globalAudioCtx, {
        type: OSCILLATORS.SQUARE,
        frequency: FREQUENCY_MAP.E6,
        startTime: now + CONFIG.AUDIO.CHIME.DELAY_NOTE_2,
        volume: CONFIG.AUDIO.CHIME.VOLUME,
        duration: CONFIG.AUDIO.CHIME.DURATION_NOTE_2
    });
}

/**
 * Schedules a high-precision, accelerating 5-second countdown warning.
 * Safely ignores execution if the audio context is currently unavailable.
 */
function playDoorClosingWarning(warningWindowMs = CONFIG.ANIMATION.WARNING_WINDOW) {
    const now = globalAudioCtx.currentTime;
    const totalDurationSeconds = warningWindowMs / 1000;

    for (let i = 0; i < CONFIG.AUDIO.WARNING.TOTAL_BEEPS; i++) {
        // Calculate an accelerating curve where progress ranges from 0 to 1
        const progress = i / (CONFIG.AUDIO.WARNING.TOTAL_BEEPS - 1);
        // This exponential curve clusters the delay intervals closer together near the end
        const delay = totalDurationSeconds * (1 - Math.pow(1 - progress, 2));
        const isFinalBeep = i === CONFIG.AUDIO.WARNING.TOTAL_BEEPS - 1;

        createOscillatorNode(globalAudioCtx, {
            type: OSCILLATORS.SQUARE,
            // Automatically spikes the pitch on the final beep for urgency
            frequency: isFinalBeep ? FREQUENCY_MAP.A5 : FREQUENCY_MAP.D5,
            startTime: now + delay,
            volume: CONFIG.AUDIO.WARNING.VOLUME,
            duration: CONFIG.AUDIO.WARNING.DURATION
        });
    }
}

/**
 * 🔊 FLUENT TEXT-TO-SPEECH ENGINE
 */
const TtsEngine = {
    _cachedVoice: null,
    _isInitializing: false,
    _payload: {
        cleanText: "",
        onSpeechStart: null,
        onSpeechEnd: null
    },

    /**
     * Lifecycle initialization.
     * Returns a Promise that resolves the exact moment voices are available.
     * (Avoids race conditions where speech tries to execute before initialisation is complete)
     */
    init() {
        setSharedAudioContext();

        return new Promise((resolve) => {
            const loadVoice = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                if (!availableVoices || availableVoices.length === 0) return;

                // Match targets or fall back to English standard
                const mechanicalVoice = availableVoices.find(voice => {
                    const matchesTarget = CONFIG.AUDIO.TARGET_VOICES.some(targetName =>
                        voice.name.includes(targetName)
                    );
                    return matchesTarget || voice.lang.startsWith("en");
                });

                if (mechanicalVoice) {
                    CONFIG.AUDIO.SELECTED_VOICE = mechanicalVoice;
                    this._cachedVoice = mechanicalVoice;
                    resolve(mechanicalVoice); // Resolve the promise once locked
                }
            };

            // If already resolved by a previous hook, exit immediately
            if (this._cachedVoice) {
                resolve(this._cachedVoice);
                return;
            }

            loadVoice();

            // Some older engines require a listener callback to finish hydration
            if (window.speechSynthesis && !this._isInitializing) {
                this._isInitializing = true;
                window.speechSynthesis.onvoiceschanged = () => {
                    loadVoice();
                };
            }
        });
    },

    /**
     * Set data payload
     */
    data(inputData) {
        // Handle empty arguments or null inputs gracefully up front
        if (!inputData) {
            this._payload = { cleanText: "", onSpeechStart: null, onSpeechEnd: null };
            return this;
        }

        // Process, flatten, and sanitise text
        const rawText = Array.isArray(inputData) ? inputData.join(" ") : inputData;
        const cleanText = rawText.replace(/<b r>/g, " ");

        this._payload = { cleanText, onSpeechStart: null, onSpeechEnd: null };
        return this;
    },

    /**
     * (Optional): Register a custom synchronisation start callback.
     */
    onStart(callback) {
        if (typeof callback === "function") {
            this._payload.onSpeechStart = callback;
        }
        return this;
    },

    /**
     * (Optional): Register a custom synchronisation completion callback.
     */
    onEnd(callback) {
        if (typeof callback === "function") {
            this._payload.onSpeechEnd = callback;
        }
        return this;
    },

    /**
     *  Execute the final speech synthesis operation.
     */
    async speak() {
        try {
            // Lazy-load safety shield: If called before init finishes, wait for it!
            if (!this._cachedVoice) {
                await this.init();
            }

            window.speechSynthesis.cancel();

            const { cleanText, onSpeechStart, onSpeechEnd } = this._payload;
            if (!cleanText) return; // Silent guard against empty string executions

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.voice = this._cachedVoice;
            utterance.rate = 1.05;
            utterance.pitch = 0.75;

            if (onSpeechStart) utterance.onstart = () => onSpeechStart();
            if (onSpeechEnd) utterance.onend = () => onSpeechEnd();

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            // Isolation layer for unsupported browser profiles
        }
    }
};
