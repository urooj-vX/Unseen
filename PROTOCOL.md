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
   - 10 total photo pairs (captured in real-world conditions on foot):
     - **6 Related Pairs**: Real physical, functional, or causal connections exist.
     - **4 Unrelated Pairs**: Distinct, unrelated objects/environments.

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
- The core mechanic is considered **validated** only if the model achieves high specificity and honesty on unrelated pairs without hallucination or generic output across all 10 pairs.
