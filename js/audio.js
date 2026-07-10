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
 * Resolves the operational vocal personality.
 * Checks for a cached instance first, otherwise filters and locks the best system match.
 */
function getSystemVoice() {
    // Return the cached vocal fingerprint immediately if it exists
    if (CONFIG.AUDIO.SELECTED_VOICE) {
        return CONFIG.AUDIO.SELECTED_VOICE;
    }

    const availableVoices = window.speechSynthesis.getVoices();
    // Fall back to default browser behavior if registry hasn't loaded yet
    if (!availableVoices || availableVoices.length === 0) {
        return null;
    }

    // Single-pass search algorithm to parse names or language codes
    const mechanicalVoice = availableVoices.find(voice => {
        const matchesTarget = CONFIG.AUDIO.TARGET_VOICES.some(targetName =>
            voice.name.includes(targetName)
        );
        return matchesTarget || voice.lang.startsWith("en");
    });

    // Cache the resolved profile permanently into global state before returning
    if (mechanicalVoice) {
        CONFIG.AUDIO.SELECTED_VOICE = mechanicalVoice;
    }

    return CONFIG.AUDIO.SELECTED_VOICE;
}

/**
 * Synthesizes browser text-to-speech output using the native Web Speech API.
 * Safely handles both flat strings and line layout arrays.
 */
function speakTextWithBrowser(inputData, onSpeechStart = null, onSpeechEnd = null) {
    try {
        window.speechSynthesis.cancel();

        const rawText = Array.isArray(inputData) ? inputData.join(" ") : inputData;
        const cleanText = rawText.replace(/<br>/g, " ");

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 0.75;

        // Direct, flat assignment using our extracted utility helper
        const assignedVoice = getSystemVoice();
        if (assignedVoice) {
            utterance.voice = assignedVoice;
        }

        // Use onstart/onend callbacks to synchronise audio with text
        utterance.onstart = () => {
            if (typeof onSpeechStart === "function") onSpeechStart();
        };

        utterance.onend = () => {
            if (typeof onSpeechEnd === "function") onSpeechEnd();
        };
    window.speechSynthesis.speak(utterance);
    } catch (e) {
        // Graceful error isolation for browsers with restricted profiles
    }
}

