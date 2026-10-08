# UNSEEN

> *"A game that only works because reality exists."*

UNSEEN is an open-source, local AI-powered outdoor exploration game experiment.

---

## Core Concept & Gameplay Loop

UNSEEN explores a novel gameplay loop grounded in real-world physical reality:

1. **Observe**: A player walks outdoors and records physical observations (capturing photo pairs of real surroundings).
2. **Interpret**: A local vision-language model describes visible features in detail.
3. **Connect & Gate**: The system evaluates whether a real, specific connection exists between observations.
4. **Explore**: Validated relationships generate safe, actionable physical exploration objectives (clues) achievable on foot in under 15 minutes.

---

## Why Local Open-Weight Models Matter

- **Complete Offline Privacy**: Outdoor exploration requires location and visual data. Running inference locally guarantees zero data tracking or cloud transmission.
- **Zero Subscription / API Costs**: Open-weight models (e.g. `Qwen3-VL-2B-Instruct`) enable accessible, self-contained gaming on consumer edge devices (such as Apple Silicon Mac/mobile).
- **Physical Grounding**: Pushing open-weight models to interpret physical reality tests the frontier of local AI capabilities.

---

## Initial Experiment & Benchmark Findings

We conducted a preregistered 10-pair benchmark (`experiments/kill-test/`) evaluating `Qwen3-VL-2B-Instruct-GGUF` (Q4_K_M) via Ollama on an Apple M2 (16 GB RAM).

### Key Findings
- **Vision Inference Performance**: Local vision description performed reliably with a median per-pair total latency of **~20.7 seconds**.
- **Relational Reasoning Failure**: The end-to-end unconstrained model failed the preregistered pass criteria. It exhibited significant false-positive rates on unrelated photo pairs (e.g., hallucinating construction-zone connections between distinct road signs rather than returning `relationship: none`).

For full details, methodology, timing breakdowns, and raw JSON/CSV outputs, see [`experiments/kill-test/README.md`](experiments/kill-test/README.md).

---

## Redesign & Planned Architecture

Because unconstrained model inference cannot be trusted as an absolute ground-truth arbiter, UNSEEN is being redesigned to decouple visual description from relationship validation:

```
Photo A ──> Local VLM (Stage 1) ──> Description A ┐
                                                   ├──> Conservative Evidence Gate ──> Game Master LLM ──> Objective
Photo B ──> Local VLM (Stage 2) ──> Description B ┘       (Rule-based Verification)      (Constrained Narrative)
```

1. **Stage 1 (Local VLM)**: Generates strictly grounded single-photo visual descriptions.
2. **Stage 2 (Evidence Gate)**: A deterministic, rule-based filter (`evidence_gate.py`) evaluates structural alignment and rejects vague category overlaps.
3. **Stage 3 (Game Master LLM)**: Produces safe, constrained physical exploration objectives only when the evidence gate authorizes a plausible hypothesis.

---

## Reproducibility & Limitations

### Project Structure
```
├── README.md                      # Main project documentation & architecture overview
├── .gitignore                     # Repository file ignore definitions
└── experiments/
    └── kill-test/                 # Preregistered 10-pair kill test benchmark
        ├── README.md              # Methodology, failure analysis, & latency report
        ├── PROTOCOL.md            # Benchmark rules & pass/fail criteria
        ├── killtest.py            # Pipeline test execution script
        ├── smoke_test.py          # Single-image vision inference test script
        ├── evidence_gate.py       # Conservative rule-based evidence gate
        ├── test_evidence_gate.py  # Diagnostic gate runner
        ├── test_all_evidence.py   # Batch evidence gate test script
        ├── pairs.json             # Manifest defining 10 evaluation pairs
        ├── photos/                # Photo dataset directory (.gitkeep)
        └── results/               # Preserved raw JSON and CSV benchmark outputs
```

### Known Limitations & Dataset Withholding
- **Raw Image Dataset Withheld**: Actual photo files (`photos/*.jpeg`) used in the kill test are omitted from the public repository to protect privacy, respect EXIF location metadata, and comply with third-party image rights.
- **Implementation Status**: The core application redesign is actively in progress. The benchmark result is preserved as an empirical baseline demonstrating current model limitations.
