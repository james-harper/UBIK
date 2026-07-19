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
    B5: 987.77,      // Arcade chime introductory tone
    E6: 1318.51      // Arcade chime ascendant payoff tone
};

// Singleton Audio System State
let globalAudioCtx = null;

/**
 * Initializes or resumes a single, global AudioContext instance.
 * Returns null if the browser restricts initialization due to autoplay rules.
 */
function getSharedAudioContext() {
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
 * Text-crawl mechanical audio feedback loop.
 * Safely ignores execution if the page has not received a user interaction yet.
 */
function playTextClick() {
    const audioCtx = getSharedAudioContext();
    if (!audioCtx) return; // Silent guard: page hasn't been clicked yet, stay quiet

    createOscillatorNode(audioCtx, {
        type: OSCILLATORS.TRIANGLE,
        frequency: FREQUENCY_MAP.CLICK_BASE,
        frequencySlideTarget: FREQUENCY_MAP.CLICK_DROP,
        startTime: audioCtx.currentTime,
        volume: CONFIG.AUDIO.CLICK.VOLUME,
        duration: CONFIG.AUDIO.CLICK.DURATION
    });
}

/**
 * Two-note classic arcade synthetic chime sequence.
 * Explicitly resumes the audio context since it is fired by a button click gesture.
 */
async function playCoinChime() {
    // If the singleton doesn't exist, create it
    if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Explicitly resume the context. Because this is fired by a button click,
    // the browser will unlock the hardware channel instantly and permanently.
    if (globalAudioCtx.state === 'suspended') {
        await globalAudioCtx.resume();
    }

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

            // Bind native async listener if voices weren't ready on the first pass
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
        if (!inputData) {
            this._payload = { cleanText: "", onSpeechStart: null, onSpeechEnd: null };
            return this;
        }

        const rawText = Array.isArray(inputData) ? inputData.join(" ") : inputData;
        const cleanText = rawText.replace(/<b r>/g, " ");

        this._payload = { cleanText, onSpeechStart: null, onSpeechEnd: null };
        return this;
    },

    /**
     * Stage 2 (Optional): Register a custom synchronization start callback.
     */
    onStart(callback) {
        if (typeof callback === "function") {
            this._payload.onSpeechStart = callback;
        }
        return this;
    },

    /**
     * Stage 3 (Optional): Register a custom synchronization completion callback.
     */
    onEnd(callback) {
        if (typeof callback === "function") {
            this._payload.onSpeechEnd = callback;
        }
        return this;
    },

    /**
     * Stage 4: Asynchronously execute speech synthesis once the audio channel is ready.
     */
    async speak() {
        try {
            // Lazy-load safety shield: If called before init finishes, wait for it!
            if (!this._cachedVoice) {
                await this.init();
            }

            window.speechSynthesis.cancel();

            const { cleanText, onSpeechStart, onSpeechEnd } = this._payload;
            if (!cleanText) return;

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
