// ==========================================
// ⚙️ GLOBAL CONFIGURATION & CORE STATE
// ==========================================
const CONFIG = {
    TYPE_SPEED: 30, // Milliseconds per character
    ANIMATION: {
        STAGE_2_DELAY: 300,
        STAGE_3_DELAY: 420,
        STAGE_4_DELAY: 600,
        // Blinking timing constants
        BLINK: {
            MAX_OPEN_DURATION: 4000, // Maximum time eyes stay open (ms)
            MIN_OPEN_DURATION: 2000, // Minimum time eyes stay open (ms)
            CLOSED_DURATION: 120     // How long eyes remain shut (ms)
        },
        // Static burst timings (Glitchy TV noise effect)
        STATIC: {
            MAX_INTERVAL: 12000, // Maximum time between static bursts (12s)
            MIN_INTERVAL: 6000,  // Minimum time between static bursts (6s)
            DURATION: 250,        // How long the static burst lasts (250ms)
            FLICKER: 40 // Scrambles data create a high-speed shimmering flicker
        },
        WARNING_WINDOW: 5000,   // How long the warning alert sequence lasts,
    },
    // Ambient CRT phosphor glow values
    SHADOWS: {
        STANDARD: "0 0 8px",
        SPIKE: "0 0 12px"
    },
    // Volume and duration profiles for sounds
    AUDIO: {
        DEFAULTS: {
            VOLUME: 0.05,
            DURATION: 0.1
        },
        CLICK: {
            VOLUME: 0.015,
            DURATION: 0.03
        },
        CHIME: {
            VOLUME: 0.08,
            DURATION_NOTE_1: 0.08,
            DURATION_NOTE_2: 0.35,
            DELAY_NOTE_2: 0.08
        },
        // List of robotic/clinical TTS voice
        TARGET_VOICES: ['Google US English', 'Zira', 'Hazel'],
        // Lock in whichever TTS voice is found to create a consistent personality
        SELECTED_VOICE: null
    }
};

// ==========================================
// 🎨 STYLE PALETTE CONFIGURATION
// ==========================================
const PALETTE = {
    ERROR: "var(--pc98-red)",
    SUCCESS: "var(--pc98-green)",
    ALERT_FACE: "var(--pc98-white)",
    TRANSITION: "var(--pc98-magenta)",
    DIM_GLOW: "rgba(0, 255, 0, 0.3)"
};

let textTimeout; // Holds the active character timing reference for the typewriter
const DOM = {
    status: document.getElementById('status-msg'),
    face: document.getElementById('face-element'),
    coinButton: document.querySelector('.coin-button'),
    textBox: document.getElementById('text-box')
};

// ==========================================
// 🎨 ASCII FACE STATES
// ==========================================
let isGlitched = false; // System lock flag to prevent blink animations during payment spikes
let blinkTimeout;       // Holds our blinking sequence timer reference

// Add a closed eye configuration to your existing FACES object
const FACES = {
    NORMAL: [
        "   /\\       /\\   ",
        "  /  \\_____/  \\  ",
        " |  /       \\  | ",
        " | |  _   _  | | ",
        " | | ▀█   █▀ | | ",
        " | |  ░   ░  | | ",
        " |  \\   _   /  | ",
        "  \\  \\_____/  /  ",
        "   \\/       \\/   "
    ].join("\n"),

    BLINK: [
        "   /\\       /\\   ",
        "  /  \\_____/  \\  ",
        " |  /       \\  | ",
        " | |  _   _  | | ",
        " | | ▄▄   ▄▄ | | ",
        " | |  ░   ░  | | ",
        " |  \\   _   /  | ",
        "  \\  \\_____/  /  ",
        "   \\/       \\/   "
    ].join("\n"),

    GLITCH: [
        "   /\\       /\\   ",
        "  /  \\_?_?_/  \\  ",
        " |  /       \\  | ",
        " | |  █   ░  | | ",
        " | | ▄▀   ▀▄ | | ",
        " | |  ░   █  | | ",
        " |  \\   █   /  | ",
        "  \\  \\_?_?_/  /  ",
        "   \\/       \\/   "
    ].join("\n"),

    MOCKING: [
        "   /\\       /\\   ",
        "  /  \\_____/  \\  ",
        " |  /       \\  | ",
        " | |  ▀▀   ▀▀  | | ",
        " | | ▄█▀   ▀█▄ | | ",
        " | |  ░     ░  | | ",
        " |  \\   ▄▄  /  | ",
        "  \\  \\_____/  /  ",
        "   \\/       \\/   "
    ].join("\n")
};

// ==========================================
// ⌨️ TYPEWRITER ENGINE MODULE
// ==========================================
/**
 * Detects if a string pointer sits directly at an HTML line break boundary.
 */
function parseHtmlBreak(text, index) {
    if (text.substring(index, index + 4) === "<br>") {
        return { isTag: true, advanceBy: 4, value: "<br>" };
    }
    return { isTag: false, advanceBy: 1, value: text.charAt(index) };
}

/**
 * Types out the given text string (or array of lines) letter-by-letter,
 * rendering HTML line breaks correctly. Executes an optional callback on completion.
 */
function typeText(inputData, onCompleteCallback = null) {
    if (!DOM.textBox) return; // Abort if render canvas is missing

    const text = Array.isArray(inputData) ? inputData.join("<br>") : inputData;
    let index = 0;

    clearTimeout(textTimeout);
    DOM.textBox.innerHTML = "";

    function nextCharacter() {
        //  Handle sequence completion and trigger callback immediately
        if (index >= text.length && typeof onCompleteCallback === "function") {
            onCompleteCallback();
            return;
        }

        // Secondary Fallback Guard: If length is exhausted but no callback exists, just halt
        if (index >= text.length) return;

        // Process the current character space using our isolated extractor
        const nextToken = parseHtmlBreak(text, index);
        DOM.textBox.innerHTML += nextToken.value;
        index += nextToken.advanceBy;

        // Skip mechanical clicking calculations for raw layout breaks or spaces
        if (!nextToken.isTag && nextToken.value !== " ") {
            playTextClick();
        }

        textTimeout = setTimeout(nextCharacter, CONFIG.TYPE_SPEED);
    }


    nextCharacter();
}

// ==========================================
// 👁️ BLINK ENGINE MODULE
// ==========================================
/**
 * Recursively fires a natural, random blinking sequence.
 * Automatically halts execution if the global glitch lock is active.
 */
function runBlinkLoop() {
    clearTimeout(blinkTimeout);

    // Dynamically calculate the randomized idle delay using extracted boundaries
    const openRange = CONFIG.ANIMATION.BLINK.MAX_OPEN_DURATION - CONFIG.ANIMATION.BLINK.MIN_OPEN_DURATION;
    const nextBlinkDelay = Math.random() * openRange + CONFIG.ANIMATION.BLINK.MIN_OPEN_DURATION;

    blinkTimeout = setTimeout(() => {
        // Guard Clause: If a system override state is running, skip this blink cycle
        if (isGlitched) {
            runBlinkLoop();
            return;
        }

        // Snap wireframe eyelids shut
        if (DOM.face) DOM.face.innerText = FACES.BLINK;

        // Hold closed using the configured frame gate before reopening
        setTimeout(() => {
            if (!isGlitched && DOM.face) {
                DOM.face.innerText = FACES.NORMAL;
            }
            runBlinkLoop(); // Recursive step: schedule the next blink
        }, CONFIG.ANIMATION.BLINK.CLOSED_DURATION);

    }, nextBlinkDelay);
}

// ==========================================
// 📺 STATIC NOISE ENGINE MODULE
// ==========================================

/**
 * Procedurally generates a block of text matrix characters to simulate TV static.
 */
function generateWhiteNoiseText() {
    const staticChars = ["░", "▒", "▓", "█", "?", "$", "!", "#", "@", "%", "&"];
    const rows = 9;
    const columns = 17; // Matches the exact width padding of the face arrays
    let noiseMatrix = [];

    for (let r = 0; r < rows; r++) {
        let rowString = "";
        for (let c = 0; c < columns; c++) {
            const randomIndex = Math.floor(Math.random() * staticChars.length);
            rowString += staticChars[randomIndex];
        }
        noiseMatrix.push(rowString);
    }

    return noiseMatrix.join("\n");
}

/**
 * Recursively schedules unpredictable white noise static bursts on the face panel.
 */
function runStaticNoiseLoop() {
    // Calculate a randomized interval window using our extracted boundaries
    const staticRange = CONFIG.ANIMATION.STATIC.MAX_INTERVAL - CONFIG.ANIMATION.STATIC.MIN_INTERVAL;
    const nextStaticDelay = Math.random() * staticRange + CONFIG.ANIMATION.STATIC.MIN_INTERVAL;

    setTimeout(() => {
        // Guard Clause: If a system override sequence is active, abort this burst
        if (isGlitched) {
            runStaticNoiseLoop();
            return;
        }

        // Engage the FSM static parameters
        transitionToState(STATE_KEYS.STATIC);

        // Generate continuous scrambling frames inside the duration window
        const frameInterval = setInterval(() => {
            if (!isGlitched && DOM.face) {
                DOM.face.innerText = generateWhiteNoiseText();
            }
        }, CONFIG.ANIMATION.STATIC.FLICKER);

        // Kill the noise burst and recover smoothly after the configured duration gate
        setTimeout(() => {
            clearInterval(frameInterval);

            if (!isGlitched) {
                // Return cleanly back to standard active states based on current authorization
                const currentAuthorized = DOM.status && DOM.status.innerText === "ACCESS_GRANTED";
                transitionToState(currentAuthorized ? STATE_KEYS.AUTHORIZED : STATE_KEYS.INSOLVENT);
            }

            runStaticNoiseLoop(); // Recursive step: schedule the next background burst
        }, CONFIG.ANIMATION.STATIC.DURATION);

    }, nextStaticDelay);
}

// ==========================================
// 🌀 SYSTEM ANIMATION & STATE PIPELINE
// ==========================================
const STATE_KEYS = {
    INSOLVENT: 'INSOLVENT',
    OVERRIDE: 'OVERRIDE',
    REBOOTING: 'REBOOTING',
    VALIDATING: 'VALIDATING',
    AUTHORIZED: 'AUTHORIZED',
    CLEARED_FOR_PASSAGE: 'CLEARED_FOR_PASSAGE',
    CLOSING_WARNING: 'CLOSING_WARNING', // Door is about to close
    STATIC: 'STATIC'
};

/** Finite state machine to handle UI styles based on state */
const STATES = {
    [STATE_KEYS.INSOLVENT]: {
        faceText: FACES.NORMAL,
        faceColor: PALETTE.ALERT_FACE,
        textShadow: `${CONFIG.SHADOWS.STANDARD} ${PALETTE.ERROR}`,
        statusText: "INSOLVENT_LOCKED",
        statusColor: PALETTE.ERROR
    },
    [STATE_KEYS.OVERRIDE]: {
        faceText: FACES.GLITCH,
        faceColor: PALETTE.TRANSITION,
        textShadow: `${CONFIG.SHADOWS.SPIKE} ${PALETTE.TRANSITION}`,
        statusText: "ACCESS_OVERRIDE...",
        statusColor: PALETTE.TRANSITION
    },
    [STATE_KEYS.REBOOTING]: {
        faceText: FACES.NORMAL,
        faceColor: PALETTE.DIM_GLOW,
        textShadow: "none",
        statusText: "RETRACTING_BOLTS...",
        statusColor: PALETTE.TRANSITION
    },
    [STATE_KEYS.VALIDATING]: {
        faceText: FACES.GLITCH,
        faceColor: PALETTE.TRANSITION,
        textShadow: `${CONFIG.SHADOWS.STANDARD} ${PALETTE.TRANSITION}`,
        statusText: "CLEARING_EGRESS...",
        statusColor: PALETTE.TRANSITION
    },
    [STATE_KEYS.AUTHORIZED]: {
        faceText: FACES.NORMAL,
        faceColor: PALETTE.SUCCESS,
        textShadow: `${CONFIG.SHADOWS.STANDARD} ${PALETTE.SUCCESS}`,
        statusText: "ACCESS_GRANTED",
        statusColor: PALETTE.SUCCESS
    },
    // This state is when the door is physically open
    [STATE_KEYS.CLEARED_FOR_PASSAGE]: {
        faceText: FACES.NORMAL,
        faceColor: PALETTE.SUCCESS,
        textShadow: `${CONFIG.SHADOWS.STANDARD} ${PALETTE.SUCCESS}`,
        statusText: "ACCESS_GRANTED",
        statusColor: PALETTE.SUCCESS,
        isSystemLocked: false
    },
    [STATE_KEYS.CLOSING_WARNING]: {
        faceText: FACES.MOCKING,
        faceColor: PALETTE.ALERT_FACE,
        textShadow: `${CONFIG.SHADOWS.STANDARD} ${PALETTE.ERROR}`,
        statusText: "DOOR CLOSING...",
        statusColor: PALETTE.TRANSITION,
        isSystemLocked: false
    },
    [STATE_KEYS.STATIC]: {
        faceColor: "rgba(0, 255, 0, 0.4)",
        textShadow: `0 0 4px ${PALETTE.SUCCESS}`
    }
};

// ==========================================
// 💬 NARRATIVE CONTENT MANIFEST
// ==========================================
const MESSAGES = {
    INITIAL: [
        "I am sorry, but your current residential credit rating is insufficient.",
        "To actuate the secondary deadbolts and grant exit authorization from this domicile, please deposit 50p into the physical slot.",
        "I do not operate on credit, nor do I tolerate emotional appeals."
    ]
};

/**
 * Transitions the system to a predefined operational state.
 * Schedules the change if a delay is provided, otherwise updates immediately.
 */
function transitionToState(stateKey, delayMs = 0) {
    const state = STATES[stateKey];
    if (!state) return; // Guard clause: state must exist in manifest

    // Handle delayed scheduling
    if (delayMs > 0) {
        // Explicitly call with delay set to 0 to avoid infinite loop
        setTimeout(() => transitionToState(stateKey, 0), delayMs);
        return;
    }

    // Handle immediate execution (0ms)
    if (DOM.face) {
        // Determine the safe visual fallback layout context dynamically
        const isClosing = DOM.status && DOM.status.innerText === "PORTAL_CLOSING...";
        const defaultFace = isClosing ? FACES.MOCKING : FACES.NORMAL;

        // Falls back to the correct background face during static recoveries
        DOM.face.innerText = state.faceText !== undefined ? state.faceText : defaultFace;
        DOM.face.style.color = state.faceColor;
        DOM.face.style.textShadow = state.textShadow;
    }

    if (DOM.status) {
        // Determine the current underlying core status layout safely
        const isAuthorized = DOM.status.innerText === "ACCESS_GRANTED";
        const fallbackStatus = isAuthorized ? "ACCESS_GRANTED" : "INSOLVENT_LOCKED";

        //  If a state omits a status identifier (like STATIC),
        // cleanly fall back to its baseline state text rather than leaking variables.
        DOM.status.innerText = state.statusText !== undefined ? state.statusText : fallbackStatus;

        // If a status color is omitted, safely fall back to the face color or base error red
        DOM.status.style.color = state.statusColor !== undefined ? state.statusColor : (state.faceColor || PALETTE.ERROR);
    }

}

/**
 * Disable "Insert Coin" button - prevent multiple submissions
 */
function disableCoinButton(status = true) {
    // If the top-level selector didn't fetch it during boot, find it dynamically right now
    const btn = DOM.coinButton || document.querySelector('.coin-button');
    if (btn) {
        btn.disabled = status;
    }
}

/**
 * Orchestrates the payment token validation sequence
 * Absolute scheduling is used rather than relative to avoid cascading delays
 */
async function triggerCoinChime() {
    disableCoinButton();
    playCoinChime();

    // Schedule validation timeline
    transitionToState(STATE_KEYS.OVERRIDE);
    transitionToState(STATE_KEYS.REBOOTING,  CONFIG.ANIMATION.STAGE_2_DELAY);
    transitionToState(STATE_KEYS.VALIDATING,  CONFIG.ANIMATION.STAGE_3_DELAY);
    transitionToState(STATE_KEYS.AUTHORIZED,  CONFIG.ANIMATION.STAGE_4_DELAY);

    // On authorisation success, door is immediately opened
    transitionToState(STATE_KEYS.CLEARED_FOR_PASSAGE, CONFIG.ANIMATION.STAGE_4_DELAY);

    // Select and broadcast randomized narrative content
    const randomIndex = Math.floor(Math.random() * NARRATIVE_RESPONSES.length);
    const selectedResponse = NARRATIVE_RESPONSES[randomIndex];

    speakTextWithBrowser(
        selectedResponse,
        () => typeText(selectedResponse),
        () => initiateLockdownSequence()
    );
}

/**
 * Executes the structural closing alerts and restores hardware button interactivity.
 */
function initiateLockdownSequence() {
    // Text-to-speech takes longer to complete than typewriter text - so we are adding an intentional delay to give it time to catch up
    setTimeout(() => {
        transitionToState(STATE_KEYS.CLOSING_WARNING);
        transitionToState(STATE_KEYS.INSOLVENT, CONFIG.ANIMATION.WARNING_WINDOW);

        // Display warning before unlocking button again
        setTimeout(() => {
            disableCoinButton(false);
        }, CONFIG.ANIMATION.WARNING_WINDOW);
    }, CONFIG.ANIMATION.TTS_BUFFER_DELAY);
}



// ==========================================
// 🚀 INITIALIZATION INTERACTION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    transitionToState(STATE_KEYS.INSOLVENT);
    disableCoinButton(true);
    typeText(MESSAGES.INITIAL, () => disableCoinButton(false));
    runBlinkLoop();
    runStaticNoiseLoop();

    // PRE-HYDRATE THE SPEECH REGISTRY
    // Tapping the speech engine instantly tells the OS to stream all available
    // voice profiles into the browser cache right now, so they are fully loaded
    // long before the user clicks the button.
    if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.getVoices();

        // Some older engines require a listener callback to finish hydration
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }
});
