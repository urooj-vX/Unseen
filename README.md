# UNSEEN

> *"A game that only works because reality exists."*

UNSEEN is an exploration game experiment where a local open-weight vision model interprets real-world observations and eventually turns relationships between observations into physical exploration objectives.

---

## Current Status: Local Vision Smoke Test Completed

- **Status**: Smoke test passed (local inference verified).
- **Execution Time**: 12.24 seconds for first image vision inference.
- **Hardware**: Apple M2, 16 GB RAM
- **Local Stack**: Ollama `0.40.1` + `qwen3-vl:2b` + Python (`ollama` package)

> **Important Note**: The first local vision smoke test confirms that local vision inference functions correctly on target hardware. **This is ONLY a smoke test.** The core relationship/reasoning mechanic and full 10-pair kill test have **NOT** yet been run or proven.

---

## Next Milestone: The 10-Pair Kill Test

The upcoming milestone will run the frozen test script (`killtest.py`) against 10 real-world photo pairs:
- **6 Related Pairs**: Real physical, functional, or causal connections.
- **4 Unrelated Pairs**: Distinct, unrelated objects/environments to test honesty under uncertainty.

### Test Pipeline
```
Photo A ──> Vision Model ──> Description A ┐
                                            ├──> Text Stage ──> Relationship + Next Objective
Photo B ──> Vision Model ──> Description B ┘
```

---

## Repository Structure

```
├── PROTOCOL.md      # Protocol & evaluation rules for the 10-pair kill test
├── killtest.py      # Frozen pipeline test script & scoring CSV generator
├── smoke_test.py    # Single-image local inference verification script
├── pairs.json       # Manifest defining test image pairs & expected labels
├── photos/          # Directory for real-world test pair photos
├── results/         # Benchmark results and human scoring output CSVs
└── README.md        # Project overview and current experiment state
```

---

## Quick Start

### 1. Prerequisites
Ensure [Ollama](https://ollama.com) is installed and running locally, then pull the target model:
```bash
ollama pull qwen3-vl:2b
pip install ollama
```

### 2. Run Smoke Test
Verify local vision inference:
```bash
python3 smoke_test.py
```

### 3. Run Kill Test
Once photo pairs are populated in `photos/` and defined in `pairs.json`:
```bash
python3 killtest.py --model qwen3-vl:2b --photos ./photos --pairs pairs.json
```
