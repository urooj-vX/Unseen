
import json
from pathlib import Path

from evidence_gate import check_evidence

RESULTS = Path("results")

# Use the most recent diagnostic output containing both pairs.
candidates = sorted(
    RESULTS.glob("*20261009_040847.json"),
    key=lambda p: p.stat().st_mtime,
)

if not candidates:
    raise SystemExit(
        "Could not find the expected diagnostic JSON file in results/."
    )

result_path = candidates[-1]
results = json.loads(result_path.read_text())

print(f"Reading: {result_path}\n")

for item in results:
    pair = item["pair"]
    description_a = item["desc_a"]
    description_b = item["desc_b"]

    gate_result = check_evidence(description_a, description_b)

    print(f"Pair {pair['id']} (expected: {pair['expected']})")
    print(f"  Gate decision: {gate_result['decision']}")
    print(f"  Reason: {gate_result['reason']}")
    print()
