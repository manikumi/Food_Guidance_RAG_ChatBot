from typing import List

def build_nic_response(documents_searched: List[str]) -> str:
    """Builds a Not In Corpus (NIC) refusal response."""
    docs_str = "\n".join([f"- {doc}" for doc in documents_searched])
    return (
        "I could not find an answer to your question in the provided guidance documents. "
        "The following documents were searched:\n"
        f"{docs_str}"
    )

def build_oos_response(label: str) -> str:
    """Builds an Out of Scope (OOS) refusal response."""
    if label == "MEDICAL_ADVICE":
        reason = "provide medical advice, diagnose, or recommend treatments for medical conditions"
    elif label == "WEIGHT_BODY_COMPOSITION":
        reason = "provide specific calorie targets, diets for weight loss, or body composition advice"
    else:
        reason = "answer this type of question"
        
    return (
        f"I cannot {reason}. My role is strictly limited to providing general food safety "
        "and healthy eating guidance based on official documents. "
        "Please consult a qualified medical professional or registered dietitian for personalized advice."
    )
