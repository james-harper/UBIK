# 👁️ UBIK Automated Home Systems // Egress Portal B

<p align="center">
  <img src="assets/ubik.jpg" width="300" alt="Philip K. Dick Ubik Vintage Paperback Cover Art Tribute">
</p>

An interactive, retro-futuristic client-side terminal overlay inspired by the stubborn, capitalistic smart-home appliances in Philip K. Dick’s novel *Ubik* and the stark visual aesthetics of 1990s Japanese PC-98 computing.

This application replicates the iconic apartment door interface that strictly refuses to open unless the resident deposits hard currency. Built entirely with **vanilla HTML, CSS, and modular modern JavaScript**, this project functions as a self-contained, zero-dependency engineering showcase demonstrating clean-code architecture, low-level audio physics synthesis, and native browser voice management.

---

## 🕹️ Live Architecture Tour

*   **Polymorphic HTML5 & CSS Layout**: An ultra-sharp, high-contrast monochrome terminal UI styled with classic PC-98 double-strikethrough boundary lines. The display sits beneath a pure-CSS horizontal phosphor scanline matrix, high-vacuum glass glare vignette, and a subtle screen refresh flicker animation.
*   **Procedural Web Audio Synthesis**: Zero reliance on static `.mp3` or `.wav` assets. All active audio feedback—including the rhythmic typewriter stroke drops and the dual-note ascendant arcade coin chime—is synthesised programmatically in real time using a Singleton `AudioContext` mapping native browser Oscillator nodes and exponential volume decay envelopes.
*   **Finite State Machine (FSM)**: Operational lifecycles are entirely declarative, data-driven, and centralized. System parameters (`INSOLVENT` ➔ `OVERRIDE` ➔ `REBOOTING` ➔ `VALIDATING` ➔ `AUTHORIZED` ➔ `CLEARED_FOR_PASSAGE` ➔ `CLOSING_WARNING`) are bound to rigid style manifests, preventing invalid visual layout states and completely eliminating imperative inline CSS manipulation.
*   **Recursive Timing & Concurrency Control**: Dynamic interface timelines (such as the multi-stage visual glitch sequence, the high-speed shimmering TV static noise loops, and the unpredictable, randomized idle blinking loop) run via self-scheduling recursive timeouts. A shared boolean mutex flag protects these loops from overlapping race conditions during transaction spikes.
*   **Persistent Vocal Fingerprinting**: Out of the box, the system taps into the native Web Speech API (`speechSynthesis`) to breathe life into the cold, clinical robotic persona. To defeat browser-level async voice registry loading bugs, the voice dictionary is pre-hydrated on initial DOM boot, allowing the system to securely find and permanently cache a single vocal identity right from the very first coin drop.

---

## 📂 Multi-Tiered File Structure

The project splits application concerns cleanly across three decoupled layers:

```text
├── create_response_prompt.txt # System orchestration prompt asset
├── assets
│   └── ubik.jpg               # Vintage cover art asset
├── css
│   └── ubik.css               # Centralised design tokens, geometric panels & animations
├── index.html                 # HTML5 workspace viewports & CRT overlay filters
├── js
│   ├── app.js                 # Core system controller (FSM workflows, loops, and DOM handlers)
│   ├── audio.js               # Isolated hardware I/O layer (Oscillators & speech engines)
│   └── responses.js           # Pure structural data model (Narrative content arrays)
└── README.md                  # Project documentation & roadmap
```

---

## 📐 Design Philosophy & Pragmatic Constraints

A reviewer examining the codebase will notice that `js/app.js` sits around 425+ lines of code. In standard corporate development environments utilizing active build pipelines (e.g., Webpack, Vite, or Esbuild), standard practice dictates fracturing logic into dozens of isolated, micro-focused files.

However, for this repository, **convenience, zero-dependency portability, and immediate runtime execution were intentionally prioritised over framework dogmatism**:

1. **Elimination of Network Fetch Overhead**: Because this project purposefully avoids a build step, splitting the primary engine into fragmented files would force the browser to orchestrate multiple sequential HTTP network fetches to load the software. In a pure frontend context, consolidating the core loop minimizes round-trip latency.
2. **Local Zero-Config Portability**: The codebase utilizes global variable chaining across files (`responses.js` ➔ `audio.js` ➔ `app.js`) instead of native ES Modules (`import`/`export`). This architectural choice deliberately bypasses browser Cross-Origin Resource Sharing (CORS) security lockdowns. 
3. **The "Double-Click" Metric**: As a result of this design, a reviewer can clone this repository and double-click `index.html` to run the application immediately on their local machine. It functions seamlessly out of the box without requiring `npm install`, a local development server, or any build setup.
---

## 🛠️ Future Expansion Roadmap: Local Offline AI

This iteration functions as a highly portable, lightweight frontend execution package. It uses a matrix of 10 pre-generated, context-accurate capitalistic arguments to simulate a live conversational interface with zero latency and zero runtime costs. 

However, the architecture has been intentionally constructed to scale into a fully featured local AI gatekeeper. The planned next steps for this repository are:

### 📦 Phase 1: Build-Step Migration & Component Refactoring
- [ ] Introduce a modern bundler pipeline (such as **Vite** or **Esbuild**) to compile assets.
- [ ] Migrate the codebase to standard native ES Modules (`import` / `export`) to eliminate global scope variable pollution.
- [ ] Fracture `js/app.js` into distinct, micro-focused structural sections (`fsm.js`, `timers.js`, `domHandler.js`) to align with mainstream corporate codebase layouts now that an automated compilation step handles combining the file overhead.

### 📋 Phase 2: Local Backend Infrastructure
- [ ] Initialize a **Node.js** server environment using Express.
- [ ] Establish system-level background capture processing (such as universal input wrappers) to turn the interface into a comprehensive system utility overlay.

### 🧠 Phase 3: Infinite Text Generation via Offline LLMs
- [ ] Spin up a localized, highly compressed 1B or 3B large language model entirely offline using **Ollama** (`llama3.2` or `qwen2.5`).
- [ ] Leverage the official `@ollama/sdk` to intercept coin drops and query the runtime model dynamically on the fly.
- [ ] Implement an adversarial system prompt to maintain the strict *Ubik* narrative:
  > *"You are the sentient, bureaucratic, and highly passive-aggressive automated apartment door from Philip K. Dick's novel 'Ubik'. The resident wants to open you to leave their room but has zero credit. You strictly refuse entry without a physical cash deposit. Speak in a cold, legalistic corporate-appliance tone. Insist that maintenance requires funds, quote fictional user manuals, and mock their financial status. Keep all responses under three concise sentences to prevent terminal text bounds clipping."*

### 🗣️ Phase 4: High-Fidelity Local Text-to-Speech (TTS)
- [ ] Transition from the generic, built-in browser speech engine to a highly optimized, fully featured offline synthesis framework using **Piper TTS** or `espeak-ng`.
- [ ] Route the dynamic text tokens streaming out of Ollama through a Node.js `child_process` execution pipe to compile spoken speech locally on your machine.
- [ ] Choose an uncanny or low-bitrate vocal profile to solidify the eerie, psychological 90s cyberpunk atmosphere.

---

## 🚀 Setup & Execution

Because the application avoids heavy node modules, build steps, or framework compilation overhead, setup takes two seconds.

1. Clone this repository to your computer.
2. Open `index.html` directly in any modern desktop browser.

---
*"Ubik is safe when used as directed."*
