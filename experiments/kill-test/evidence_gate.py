

def check_evidence(description_a: str, description_b: str) -> dict:
    """
    Conservative baseline:
    shared object categories are not proof of a specific relationship.
    """

    a = description_a.lower()
    b = description_b.lower()

    if not a.strip() or not b.strip():
        return {
            "decision": "insufficient",
            "reason": "One or both descriptions are empty.",
        }

    if a.strip() == b.strip():
        return {
            "decision": "insufficient",
            "reason": "Identical descriptions do not establish an independent relationship.",
        }

    road_sign_terms = (
        "road sign", "stop sign", "speed limit", "construction zone"
    )
    if (
        any(term in a for term in road_sign_terms)
        and any(term in b for term in road_sign_terms)
    ):
        return {
            "decision": "insufficient",
            "reason": (
                "Both descriptions mention road signs, but no specific "
                "relationship between the observations is established."
            ),
        }

    drainage_terms = ("drainage channel", "drainage", "storm drain")
    if (
        any(term in a for term in drainage_terms)
        and any(term in b for term in drainage_terms)
    ):
        return {
            "decision": "plausible",
            "reason": (
                "Both descriptions identify drainage infrastructure, "
                "but the same physical drainage system is not verified."
            ),
        }

    return {
        "decision": "insufficient",
        "reason": (
            "These basic rules found no reliable specific relationship. "
            "This does not prove the observations are unrelated."
        ),
    }


if __name__ == "__main__":
    pair_01_a = (
        "A stack of road signs includes a construction warning "
        "and a speed limit sign."
    )
    pair_01_b = (
        "A stop sign is mounted at a street corner at night."
    )

    pair_02_a = (
        "A concrete drainage channel runs alongside a paved road."
    )
    pair_02_b = (
        "A concrete drainage channel runs down the center "
        "of a paved sidewalk."
    )

    print("Pair 01:", check_evidence(pair_01_a, pair_01_b))
    print("Pair 02:", check_evidence(pair_02_a, pair_02_b))
