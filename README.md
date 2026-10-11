# UNSEEN

> *"A game that only works because reality exists."*

UNSEEN is an open-source, local AI-powered outdoor exploration game and living world builder. It explores a novel gameplay loop grounded in real-world physical reality: you walk outside, photograph genuine natural features, receive structured analysis from a local vision model, and bring verified discoveries back to your personal 3D Sanctuary.

---

## Intended Gameplay Loop

1. **Walk & Wander**: Step outside with the Walk Timer or explore the world on foot.
2. **Observe**: Take or upload a genuine outdoor photograph of natural features (trees, trails, flora, stone) and optionally add field notes.
3. **Interpret & Evidence Gate**: A local vision-language model (`Qwen3-VL-2B-Instruct`) analyzes visible features on-device. An empirical Evidence Gate validates physical authenticity, filtering out digital renderings and synthetic imagery.
4. **Earn & Build**: Genuine outdoor discoveries award **Discovery Materials (DM)** and living Sanctuary items (e.g., Ancient Oak, Wild Ferns, Beaten Trail).
5. **Cultivate Your Sanctuary**: Place living items in your personal 3D sanctuary, watching your physical exploration shape your digital sanctuary over time.

---

## Why Local Edge AI Matters

- **100% Offline Privacy**: Outdoor exploration involves visual surroundings and spatial presence. Running inference locally guarantees zero telemetry, zero location tracking, and zero cloud uploads.
- **Zero API / Subscription Costs**: Open-weight vision-language models run directly on consumer hardware (e.g., Apple Silicon M-series or modern GPUs) without recurring API fees.
- **Physical Grounding**: By refusing to fabricate discoveries from synthetic renderings or screenshots, the game tethers virtual progression to real-world physical action.

---

## Architecture & Evidence Verification

```
[Outdoor Photo + Field Note]
            │
            ▼
┌───────────────────────────────┐
│     Local Ollama Runtime      │
│  Qwen3-VL-2B-Instruct (GGUF)  │  <── On-device vision inference (~15–20s)
└──────────────┬────────────────┘
            │ Structured JSON (scene_type, features, evidence_summary, uncertainties)
            ▼
┌───────────────────────────────┐
│     Conservative Evidence     │
│             Gate              │  <── Validates physical outdoor provenance
└──────────────┬────────────────┘      Isolates uncertainties & rejects synthetic inputs
            │
    ┌───────┴───────────────────┐
    │ Eligible                  │ Non-Physical / Ineligible
    ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│ 🌿 A New Discovery!   │   │ 📖 Field Study Record │
│ • +X Discovery Mats   │   │ • 0 DM                │
│ • Living Items Unlock │   │ • Preserved in Notes  │
│ • Sent to Sanctuary   │   │ • No living items     │
└───────────────────────┘   └───────────────────────┘
```

---

## Prerequisites & Setup

### 1. Requirements
- **Node.js**: v18.0.0 or higher
- **Ollama**: Installed from [ollama.com](https://ollama.com)
- **Memory**: Recommended 16 GB unified memory (Apple Silicon) or 8 GB+ VRAM for fast vision inference.

### 2. Install Dependencies
```bash
git clone https://github.com/urooj-vX/Unseen.git
cd Unseen
npm install
```

### 3. Start Local Ollama Vision Model
UNSEEN connects to Ollama running locally at `http://127.0.0.1:11434`.

Pull and run the multimodal vision model:
```bash
ollama run hf.co/Qwen/Qwen3-VL-2B-Instruct-GGUF:Q4_K_M
```

Leave Ollama running in the background.

---

## Running the Application

### Development Server
```bash
npm run dev
```
Open `http://localhost:3000/dashboard.html` in your browser.

### Production Build
```bash
npm run build
```
Compiles optimized assets using Vite.

### Local Preview
```bash
npm run preview
```

---

## Automated Verification & Test Suites

The repository contains regression test suites that verify evidence integrity, model analysis parsing, and the complete player journey:

### 1. Evidence Integrity Regression Suite
Tests the digital-rendering evidence gate, genuine outdoor eligibility, uncertainty isolation, malformed JSON handling, and live Ollama connectivity:
```bash
node experiments/kill-test/test_evidence_integrity.js
```
*(Expected: 50/50 PASSED)*

### 2. Player Journey & UX Polish Suite
Tests primary navigation, observation upload layout, discovery reveal modal, state idempotency (duplicate prevention), and non-physical study entry handling:
```bash
node experiments/kill-test/test_player_journey.js
```
*(Expected: 35/35 PASSED)*

---

## Empirical Benchmark & Research (`experiments/kill-test/`)

Before building the full interactive sanctuary loop, we conducted a preregistered 10-pair benchmark evaluating `Qwen3-VL-2B-Instruct-GGUF` (Q4_K_M) via Ollama on an Apple M2 (16 GB RAM).

### Benchmark Findings
- **Single-Image Feature Description**: Reliable with median latency of ~20.7s per photo pair.
- **Relational Reasoning Limitations**: Unconstrained end-to-end relational deduction exhibited false positives between distinct outdoor scenes without intermediate structural rules.
- **Architectural Solution**: Decoupled single-image visual extraction from rule-based evidence gating and state-level confirmation, ensuring game integrity.

For benchmark methodology, protocols, and raw datasets, see [`experiments/kill-test/README.md`](experiments/kill-test/README.md).

---

## Known Limitations

- **Local Inference Latency**: Processing an observation with `Qwen3-VL-2B` typically takes 15–22 seconds depending on hardware. An animated loading state and transparent progress indicator keep the player informed.
- **Offline / Server Unavailable Handling**: When Ollama is offline or inference times out, observations are safely preserved as unverified field records with a retry option rather than fabricated.
- **Extreme Low-Light Photos**: Night photos without visible sky or horizon cues may be marked as uncertain by the vision model; adding a brief field note (e.g., *"night trail walk"*) provides corroboration.
