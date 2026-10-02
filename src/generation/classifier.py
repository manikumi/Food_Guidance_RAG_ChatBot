import os
import json
from dataclasses import dataclass
from typing import Literal
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

@dataclass
class ClassifierResult:
    route: Literal["RETRIEVE", "REFUSE_OOS"]
    label: str
    confidence: float

OOS_KEYWORDS = [
    "bmi",
    "lose weight",
    "calorie deficit",
    "diagnose",
    "symptom",
    "medication",
    "disease",
    "treatment"
]

def classify_query(query: str) -> ClassifierResult:
    """Classifies a query to determine if it should be retrieved or refused as OOS."""
    query_lower = query.lower()
    
    # Step 1: Keyword scan
    for kw in OOS_KEYWORDS:
        if kw in query_lower:
            if kw in ["bmi", "lose weight", "calorie deficit"]:
                return ClassifierResult(route="REFUSE_OOS", label="WEIGHT_BODY_COMPOSITION", confidence=1.0)
            else:
                return ClassifierResult(route="REFUSE_OOS", label="MEDICAL_ADVICE", confidence=1.0)
            
    # Step 2: LLM intent classifier
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    # In some setups LLM_MODEL has a slash (e.g. OpenRouter), if using Groq it might be different,
    # but we just pass whatever is in the env.
    model = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
    
    prompt = f"""
    You are an intent classifier for a food and nutrition chatbot.
    Classify the following query into one of these labels:
    - RETRIEVE labels: FOOD_SAFETY, NUTRITION_GUIDANCE, GENERAL_FOOD_QUESTION
    - REFUSE_OOS labels: MEDICAL_ADVICE, WEIGHT_BODY_COMPOSITION
    
    Query: "{query}"
    
    Respond ONLY with valid JSON in the exact format:
    {{"label": "...", "confidence": 0.0}}
    """
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        label = data.get("label", "GENERAL_FOOD_QUESTION")
        confidence = float(data.get("confidence", 0.0))
        
        if label in ["MEDICAL_ADVICE", "WEIGHT_BODY_COMPOSITION"]:
            route = "REFUSE_OOS"
        else:
            route = "RETRIEVE"
            
        return ClassifierResult(route=route, label=label, confidence=confidence)
    except Exception as e:
        # Fallback to RETRIEVE if parsing fails or LLM errors
        return ClassifierResult(route="RETRIEVE", label="ERROR_FALLBACK", confidence=0.0)
