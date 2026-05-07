"""
Structured narrative generation for the smart decision pipeline.
"""


def generate_analysis(
    fruit_reason: str,
    image_reason: str,
    price_source_reason: str,
    price_reason: str,
    decision_reason: str,
    hold_reason: str,
    hold_instructions: str,
) -> str:
    parts = [
        fruit_reason,
        image_reason,
        price_source_reason,
        price_reason,
        decision_reason,
        hold_reason,
        hold_instructions,
    ]
    return " ".join(part.strip() for part in parts if part and part.strip())
