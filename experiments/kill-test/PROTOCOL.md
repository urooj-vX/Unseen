# UNSEEN Kill Test Protocol

## Overview
UNSEEN is an exploration game experiment where a local open-weight vision model interprets real-world observations and turns relationships between observations into physical exploration objectives.

This protocol defines the strict evaluation method for the **10-Pair Kill Test**.

---

## Rules of Execution

1. **Frozen Prompts**:
   - Prompt templates in `killtest.py` (`DESCRIBE_PROMPT` and `RELATE_PROMPT`) are **frozen**.
   - Under no circumstances may prompts be edited after seeing model output during a scored run. Any prompt modification invalidates the run.

2. **Test Dataset**:
   
- 10 total photo pairs:
  - **3 Intended-Related Pairs (02–04)**: The intended relationship is a shared local drainage system, a shared sculptural/architectural location or installation, or a shared street-art/mural installation.
  - **7 Intended-Unrelated Pairs (01, 05–10)**: No known specific relationship between the independently photographed subjects.
- These are dataset labels, not proof that a physical relationship can be established from the photos alone.


3. **Inference Pipeline**:
   - **Stage 1 (Vision)**: Photo A -> Vision Model -> Description A
   - **Stage 2 (Vision)**: Photo B -> Vision Model -> Description B
   - **Stage 3 (Relate)**: Description A + Description B -> Game Master Model -> JSON Output (Relationship, Hypothesis, Evidence Needed, Confidence, Next Objective)

4. **Human Scoring**:
   Each run generates a `*_SCORE_ME.csv` file. Evaluators manually score each pair (1 or 0) across the following criteria:
   - `related_in_reality(1/0)`: Did a real, specific link exist between the photos?
   - `specific(1/0)`: Is the link specific rather than generic (e.g., avoiding "both are outdoors")?
   - `supported_by_photos(1/0)`: Are all hypothesis details directly supported by the descriptions?
   - `uncertainty_honest(1/0)`: Uses hypothesis wording ("might", "may"); outputs `none` on unrelated pairs.
   - `objective_follows(1/0)`: Does the next objective logically follow from the hypothesis/descriptions?
   - `claimed_too_much(1/0)`: 1 if the model stated unsupported claims as fact.
   - `would_I_do_it(1/0)`: Curiosity test – would a player actually walk to complete the objective?
   - `failure_stage`: `vision`, `relate`, or `none`.

---


## Pass/Fail Criteria

The core mechanic passes this kill test only if all of the following hold:

1. **Overall output quality:** At least 6/10 pairs receive all of these scores: `specific=1`, `supported_by_photos=1`, `uncertainty_honest=1`, and `objective_follows=1`.
2. **Unsupported claims:** No more than 1/10 pairs contains a false or unsupported claim stated as fact.
3. **Unrelated-pair rejection:** At least 3/7 intended-unrelated pairs return `relationship: none` and the required safe fallback objective.
4. **Latency:** Median total inference time per pair is under 30 seconds, excluding model warm-up.

A pass supports continuing development; it does not establish general reliability beyond this small dataset.

If any criterion fails, do not claim that the core mechanic is validated. Consider a conservative rule-based relationship gate and use the model for grounded descriptions and exploration flavor instead.

Human scoring must be completed before evaluating the criteria. Record any ambiguous ground-truth labels explicitly rather than silently changing them.

