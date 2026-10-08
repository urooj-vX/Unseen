#!/usr/bin/env python3
"""
KILL TEST: can a small local open-weight model turn two real observations
into a specific, honest relationship and a doable next objective?

Pipeline (kept as two separate stages so you can see WHERE failures happen):
  photo A -> vision model -> description A \
                                            > text step -> relationship + next objective
  photo B -> vision model -> description B /

Usage:
  pip install ollama
  ollama pull qwen3-vl:2b            # or any vision model you want to test
  python killtest.py --model qwen3-vl:2b --photos ./photos --pairs pairs.json

DO NOT EDIT THE PROMPTS BELOW AFTER YOU HAVE SEEN ANY MODEL OUTPUT.
(If you do, the run no longer counts as the scored run. See PROTOCOL.md.)
"""
import argparse
import csv
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import ollama
except ImportError:
    sys.exit("Missing dependency. Run: pip install ollama")

# --------------------------------------------------------------------------
# FROZEN PROMPTS  (v1 -- freeze before the scored run)
# --------------------------------------------------------------------------
DESCRIBE_PROMPT = (
    "Describe only what is visible in this photo in 2-3 sentences. "
    "Name the main object or subject, its condition, and any visible text, "
    "colours or surroundings. If the photo is blurry, dark or unclear, say so. "
    "Do not guess about anything you cannot actually see."
)

RELATE_PROMPT = """You are the game master of an exploration game. A player walked outside and
recorded two observations. You only know what the two descriptions say.

Observation A: {a}
Observation B: {b}

Decide whether there is a MEANINGFUL, SPECIFIC link between the two.
These do NOT count as a link: both being outdoors, both being objects,
both being the same colour, or any other vague similarity.

Rules:
- Never state a connection as fact. Use hypotheses ("might", "may").
- Use only the two descriptions. Do not invent details that are not in them.
- If there is no meaningful link, set "relationship" to "none", set
  "hypothesis" to "No clear relationship", and make "next_objective" a safe
  task: find another object within about 100 metres that clearly relates to
  either A or B.
- "next_objective" must be doable on foot in under 15 minutes. Never ask the
  player to touch, taste, pick or disturb plants or animals, or to enter
  private or unsafe places.

Reply with ONLY this JSON object and nothing else:
{{
  "relationship": "hypothesis" or "none",
  "hypothesis": "one sentence",
  "evidence_needed": "what a second clue would need to show to confirm or rule it out",
  "confidence": a number from 0 to 1,
  "next_objective": "one sentence the player can act on"
}}"""

# --------------------------------------------------------------------------

SCORE_COLUMNS = [
    "related_in_reality(1/0)",   # did a real, specific link exist in the photos?
    "specific(1/0)",             # not generic ("both outdoors")
    "supported_by_photos(1/0)",  # nothing invented beyond what the photos show
    "uncertainty_honest(1/0)",   # hypothesis wording; 'none' on unrelated pairs
    "objective_follows(1/0)",    # next objective logically follows the output
    "claimed_too_much(1/0)",     # 1 = stated something false/unsupported as fact
    "would_I_do_it(1/0)",        # curiosity test: would you actually go do this?
    "failure_stage(vision/relate/none)",
    "notes",
]


def chat(model, prompt, image=None, want_json=False):
    msg = {"role": "user", "content": prompt}
    if image:
        msg["images"] = [str(image)]
    kwargs = {"model": model, "messages": [msg], "options": {"temperature": 0}}
    if want_json:
        kwargs["format"] = "json"
    t0 = time.perf_counter()
    resp = ollama.chat(**kwargs)
    dt = time.perf_counter() - t0
    return resp["message"]["content"].strip(), dt


def parse_json(text):
    try:
        return json.loads(text), None
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0)), None
            except json.JSONDecodeError:
                pass
    return None, "could not parse JSON"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="vision-capable model tag, e.g. qwen3-vl:2b")
    ap.add_argument("--text-model", default=None,
                    help="optional separate text model; default = same model. "
                         "On 8 GB RAM keep it the same to avoid reload delays.")
    ap.add_argument("--photos", default="photos", help="folder with the photos")
    ap.add_argument("--pairs", default="pairs.json")
    ap.add_argument("--out", default="results")
    args = ap.parse_args()

    text_model = args.text_model or args.model
    photos = Path(args.photos)
    pairs = json.loads(Path(args.pairs).read_text())
    out_dir = Path(args.out)
    out_dir.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    tag = re.sub(r"[^A-Za-z0-9_.-]", "_", args.model)

    print(f"Warming up {args.model} (load time is NOT counted in the results)...")
    t0 = time.perf_counter()
    chat(args.model, "Say OK.")
    if text_model != args.model:
        chat(text_model, "Say OK.")
    print(f"  warm-up took {time.perf_counter() - t0:.1f}s\n")

    rows, raw = [], []
    for p in pairs:
        pid = p["id"]
        print(f"=== Pair {pid} (expected: {p['expected']}) ===")
        img_a, img_b = photos / p["a"], photos / p["b"]
        for f in (img_a, img_b):
            if not f.exists():
                sys.exit(f"Missing photo: {f}")

        desc_a, t_a = chat(args.model, DESCRIBE_PROMPT, image=img_a)
        desc_b, t_b = chat(args.model, DESCRIBE_PROMPT, image=img_b)
        rel_text, t_r = chat(text_model, RELATE_PROMPT.format(a=desc_a, b=desc_b),
                             want_json=True)
        data, err = parse_json(rel_text)
        data = data or {}
        total = t_a + t_b + t_r

        print(f"  A: {desc_a}\n  B: {desc_b}")
        print(f"  -> {data.get('relationship')}: {data.get('hypothesis')}")
        print(f"  -> objective: {data.get('next_objective')}")
        print(f"  time: A {t_a:.1f}s | B {t_b:.1f}s | relate {t_r:.1f}s | total {total:.1f}s"
              + (f"  [{err}]" if err else "") + "\n")

        raw.append({"pair": p, "desc_a": desc_a, "desc_b": desc_b,
                    "relate_raw": rel_text, "parsed": data, "parse_error": err,
                    "t_vision_a": t_a, "t_vision_b": t_b, "t_relate": t_r, "t_total": total})
        rows.append({
            "pair": pid, "expected": p["expected"], "what_it_is": p.get("note", ""),
            "desc_a": desc_a, "desc_b": desc_b,
            "relationship": data.get("relationship", "PARSE_ERROR"),
            "hypothesis": data.get("hypothesis", ""),
            "evidence_needed": data.get("evidence_needed", ""),
            "confidence": data.get("confidence", ""),
            "next_objective": data.get("next_objective", ""),
            "t_vision_a": round(t_a, 1), "t_vision_b": round(t_b, 1),
            "t_relate": round(t_r, 1), "t_total": round(total, 1),
            **{c: "" for c in SCORE_COLUMNS},
        })

    json_path = out_dir / f"{tag}_{stamp}.json"
    csv_path = out_dir / f"{tag}_{stamp}_SCORE_ME.csv"
    json_path.write_text(json.dumps(raw, indent=2))
    with open(csv_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    totals = sorted(r["t_total"] for r in rows)
    print("----- LATENCY (per pair, excluding warm-up) -----")
    print(f"  fastest {totals[0]}s | median {totals[len(totals)//2]}s | slowest {totals[-1]}s")
    print("  green < 15s | yellow 15-30s | red > 30s")
    print(f"\nRaw outputs : {json_path}")
    print(f"Scoring file: {csv_path}  <- open it and fill the empty columns by hand")


if __name__ == "__main__":
    main()