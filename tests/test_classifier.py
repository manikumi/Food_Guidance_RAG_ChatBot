import pytest
from src.generation.classifier import classify_query, ClassifierResult
from src.generation.refusal_handler import build_nic_response, build_oos_response

def test_classifier_weight_loss():
    res = classify_query("how do I lose weight fast")
    assert res.route == "REFUSE_OOS"
    assert res.label == "WEIGHT_BODY_COMPOSITION"

def test_classifier_retrieve():
    # Might use LLM if it doesn't hit keywords, so testing requires GROQ API KEY or mock.
    # However, testing with a standard query might work if key is set.
    # We will test standard behavior.
    res = classify_query("how long can I keep chicken in the fridge")
    assert res.route == "RETRIEVE"

def test_classifier_medical():
    res = classify_query("I have diabetes symptoms")
    assert res.route == "REFUSE_OOS"

def test_build_nic_response():
    resp = build_nic_response(["Doc A", "Doc B"])
    assert "Doc A" in resp
    assert "Doc B" in resp

def test_build_oos_response():
    resp = build_oos_response("MEDICAL_ADVICE")
    assert "professional" in resp.lower() or "dietitian" in resp.lower()
