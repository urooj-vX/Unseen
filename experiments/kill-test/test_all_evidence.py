
import json
from pathlib import Path

from evidence_gate import check_evidence

results_dir = Path("results")

# Keep the newest saved description for each pair.
latest_by_pair = {}

for path in results_dir.glob("*.json"):
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        continue

    if not isinstance(data, list):
        continue

    for item in data:
        if not isinstance(item, dict) or "pair" not in item:
            continue
        if "desc_a" not in item or "desc_b" not in item:
            continue

        pair_id = item["pair"]["id"]
        timestamp = path.stat().st_mtime

        if (
            pair_id not in latest_by_pair
            or timestamp > latest_by_pair[pair_id][0]
        ):
            latest_by_pair[pair_id] = (timestamp, path, item)

if not latest_by_pair:
    raise SystemExit(
        "No saved pair descriptions found. "
        "Nothing was run; no model benchmark was started."
    )

print(f"Found saved descriptions for {len(latest_by_pair)}/10 pairs.\n")

for pair_id in sorted(latest_by_pair):
    _, path, item = latest_by_pair[pair_id]
    pair = item["pair"]

    result = check_evidence(item["desc_a"], item["desc_b"])

    print(
        f"Pair {pair_id} | expected={pair['expected']} | "
        f"gate={result['decision']}"
    )
    print(f"  Source: {path.name}")
    print(f"  Reason: {result['reason']}\n")

print(
    "Reminder: plausible means a possible relationship, not a verified "
    "physical connection. insufficient means the rules found inadequate "
    "evidence; it does not prove the photos are unrelated."
)

