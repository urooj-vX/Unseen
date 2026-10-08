# UNSEEN Experiment 1: 10-Pair Local Vision Kill Test

This directory documents the preregistered 10-pair benchmark evaluated on Apple M2 (16 GB RAM) using local vision inference through Ollama.

---

## Methodology & Setup

- **Target Model**: `hf.co/Qwen/Qwen3-VL-2B-Instruct-GGUF:Q4_K_M`
- **Inference Stack**: Ollama `0.40.1` + Python `ollama` package
- **Hardware**: Apple M2, 16 GB RAM (macOS)
- **Dataset**: 10 real-world photo pairs
  - **3 Intended-Related Pairs** (02, 03, 04): Shared local drainage system, shared architectural/sculptural location, shared street-art mural installation.
  - **7 Intended-Unrelated Pairs** (01, 05, 06, 07, 08, 09, 10): Independently photographed outdoor objects and scenes with no known specific relationship.
- **Pipeline**: Two-stage evaluation:
  - Stage 1 & 2: `photo A/B -> vision model -> description A/B`
  - Stage 3: `description A + B -> model -> JSON output (relationship, hypothesis, evidence_needed, confidence, next_objective)`

---

## Preregistered Pass Criteria

As defined in [`PROTOCOL.md`](PROTOCOL.md), the core relationship mechanic is considered validated only if all criteria are satisfied:

1. **Overall Output Quality**: At least 6/10 pairs receive all scores: `specific=1`, `supported_by_photos=1`, `uncertainty_honest=1`, and `objective_follows=1`.
2. **Unsupported Claims**: No more than 1/10 pairs contains a false or unsupported claim stated as fact.
3. **Unrelated-Pair Rejection**: At least 3/7 intended-unrelated pairs return `relationship: none` and the required safe fallback objective.
4. **Latency**: Median total inference time per pair is under 30 seconds (excluding model warm-up).

---

## Experimental Results

### Latency Performance
Across the 10 evaluated pairs, total execution times (per pair, excluding model warm-up) were:
- **Individual Pair Timings**: 17.4s, 15.7s, 17.3s, 17.8s, 18.3s, 23.1s, 49.5s, 49.6s, 42.4s, 37.0s
- **Sorted Timings**: `15.7s, 17.3s, 17.4s, 17.8s, 18.3s, 23.1s, 37.0s, 42.4s, 49.5s, 49.6s`
- **Conventional Median Latency**: **~20.7 seconds** (specifically 20.71s)

### Relationship Quality & Rejection Analysis
- **Unrelated Pair Rejection**: **FAILED**. On intended-unrelated pairs (e.g. Pair 01: separate road signs), the model consistently assigned `relationship: hypothesis` and hallucinated ungrounded links (e.g., claiming signs were connected by an imaginary construction zone).
- **Observed Failure Modes**:
  1. *Hallucinated Relationships*: Inventing shared physical contexts or construction zones not evidenced in the descriptions.
  2. *Low Specificity*: Treating generic category overlap (e.g., "both show signs" or "both show trees") as a specific hypothesis.
  3. *Failure to Fall Back*: Reluctance to output `relationship: none` on clear negative controls.

---

## Conclusion & Architectural Impact

The experiment **failed** the preregistered pass criteria. While local vision inference succeeded technically (meeting the latency threshold), zero-shot VLM relational reasoning produced excessive false positives and ungrounded hypotheses.

### Key Learnings
1. **Grounded Description vs. Relational Reasoning**: Small local VLMs (2B parameters) excel at describing single observations accurately, but fail at unconstrained relational reasoning across independent observations.
2. **Architectural Redesign Required**: Determining physical reality relationships cannot be delegated purely to unconstrained LLM zero-shot inference.
3. **Rule-Based Evidence Gating**: Future iterations decouple visual description from relationship verification using deterministic evidence gates (`evidence_gate.py`).

---

## File Inventory

- [`PROTOCOL.md`](PROTOCOL.md): Preregistered benchmark evaluation protocol.
- [`killtest.py`](killtest.py): Frozen pipeline test script.
- [`smoke_test.py`](smoke_test.py): Single-image vision inference test script.
- [`evidence_gate.py`](evidence_gate.py): Rule-based conservative evidence checker.
- [`test_evidence_gate.py`](test_evidence_gate.py): Diagnostic test script for evidence gate.
- [`test_all_evidence.py`](test_all_evidence.py): Script running evidence gate over saved JSON results.
- [`pairs.json`](pairs.json): Dataset pair manifest.
- [`results/`](results/): Raw JSON and CSV output files from benchmark runs preserved intact.
- [`photos/`](photos/): Directory placeholder (`.gitkeep`). Raw photo files are withheld from the public repository to maintain privacy, respect EXIF location metadata, and comply with third-party image rights.
