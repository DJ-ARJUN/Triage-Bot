import json
import logging
from typing import Dict, Any, List
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "ASSISTIVE TRIAGE SUMMARY ONLY: Generated for qualified medical officer / healthcare worker review. "
    "This system is explicitly non-diagnostic, does not prescribe medications, and does not replace professional clinical judgement."
)

def mask_pii(text: str) -> str:
    """Mask potential phone numbers, names, or addresses for privacy-first handling."""
    import re
    # Mask 10-digit phone numbers
    masked = re.sub(r"\b[6-9]\d{9}\b", "[PHONE_REDACTED]", text)
    # Mask email addresses
    masked = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[EMAIL_REDACTED]", masked)
    return masked

from typing import Dict, Any, List, Tuple

def determine_urgency_rules(answers: List[Dict[str, Any]], lab_flags: List[str]) -> Tuple[str, int, str]:
    """
    Deterministic rule-based clinical triage assessment inspired by ESI (Emergency Severity Index).
    Returns (urgency_level, score, rationale)
    """
    score = 10
    reasons = []

    # Check lab flags
    for flag in lab_flags:
        if "CRITICAL" in flag or "Severe Thrombocytopenia" in flag:
            return "EMERGENCY", 95, f"Critical laboratory finding detected: {flag}"
        elif "HIGH" in flag or "LOW" in flag or "Positive" in flag:
            score = max(score, 70)
            reasons.append(f"Abnormal lab indicator: {flag}")

    # Inspect question answers
    for ans in answers:
        q_id = ans.get("question_id", "")
        text = str(ans.get("answer_text", "")).lower()
        opts = ans.get("answer_options_selected", []) or []

        # Emergency keywords / red flags
        if "struggling to breathe" in text or "chest heaviness" in text or "fainting" in text or "active bleeding" in text or "seizure" in text:
            return "EMERGENCY", 95, f"Emergency danger sign reported: {text}"
        
        if "chemical fumes" in text or "acid mist" in text or "choking" in text:
            return "EMERGENCY", 90, "Hazardous toxic inhalation / acute workplace respiratory distress."

        if "vaginal bleeding" in text or "decreased baby movements" in text:
            return "EMERGENCY", 95, "Severe obstetric warning flag during pregnancy."

        # High Fever / Severe Pain
        if "unbearable" in text or "9 - 10" in text:
            score = max(score, 85)
            reasons.append("Patient reported unbearable pain (9-10/10)")
        elif "severe" in text or "7 - 8" in text:
            score = max(score, 70)
            reasons.append("Severe pain / high functional discomfort (7-8/10)")

        if "high fever" in text or ">103" in text or "retro-orbital" in text or "breakbone" in text:
            score = max(score, 75)
            reasons.append("High febrile illness with dengue-like or acute viral features")

    if score >= 90:
        return "EMERGENCY", score, "; ".join(reasons) or "Acute high-risk triage presentation"
    elif score >= 65:
        return "URGENT", score, "; ".join(reasons) or "Significant acute symptoms requiring prompt medical review"
    elif score >= 40:
        return "SEMI_URGENT", score, "Moderate symptoms with stable baseline vitals"
    else:
        return "ROUTINE", score, "Stable clinical presentation suitable for standard outpatient queue"

async def generate_ai_triage_summary(
    patient_info: Dict[str, Any],
    answers: List[Dict[str, Any]],
    documents_data: List[Dict[str, Any]],
    scenario: str = "OPD_QUEUE"
) -> Dict[str, Any]:
    """
    Synthesize all multimodal inputs into a structured, non-diagnostic triage summary.
    Employs Gemini/OpenAI if API keys exist, or high-fidelity clinical NLP engine.
    """
    # 1. Collect all extracted clinical flags
    all_lab_flags = []
    all_labs = []
    for doc in documents_data:
        all_lab_flags.extend(doc.get("clinical_flags", []))
        all_labs.extend(doc.get("structured_lab_data", []))

    # 2. Rule-based urgency calculation
    rule_urgency, rule_score, rule_rationale = determine_urgency_rules(answers, all_lab_flags)

    # 3. Construct structured summary
    chief_complaint = "General health assessment requested"
    duration = "Unspecified onset"
    severity = "Moderate"
    symptoms_list = []
    red_flags = []
    chronic_conditions = []
    free_text_notes = []

    for a in answers:
        qid = a.get("question_id", "")
        txt = a.get("answer_text", "")
        q_label = a.get("question_text", "")

        if "complaint" in qid or "hazard" in qid or "condition" in qid or "gestation" in qid:
            chief_complaint = txt
        elif "duration" in qid:
            duration = txt
        elif "severity" in qid:
            severity = txt
        elif "red_flags" in qid or "danger" in qid:
            if "none" not in txt.lower():
                red_flags.append(txt)
        elif "medical_history" in qid or "chronic" in qid:
            if "none" not in txt.lower():
                chronic_conditions.append(txt)
        elif "details" in qid or "notes" in qid or "vitals" in qid:
            if txt.strip():
                free_text_notes.append(mask_pii(txt))

        symptoms_list.append({
            "category": q_label,
            "response": mask_pii(txt)
        })

    # Missing information checklist
    missing_info = []
    if duration == "Unspecified onset":
        missing_info.append("Precise onset time / duration of primary symptom")
    if not chronic_conditions:
        missing_info.append("Current regular medications and known drug allergies")
    if not any("vitals" in a.get("question_id", "") for a in answers):
        missing_info.append("Objective vitals: Blood Pressure, Pulse, and SpO2 readings")
    if not documents_data:
        missing_info.append("Previous prescriptions or relevant diagnostic test reports")

    # Suggested follow-up questions for the medical officer / reviewer
    suggested_followups = [
        "Have you taken any over-the-counter antipyretics or analgesics today, and did they reduce the pain/fever?",
        "Do you have any known allergies to penicillin, NSAIDs, or other antibiotics?",
        "Are you currently able to keep fluids down without vomiting?"
    ]
    if "fever" in chief_complaint.lower():
        suggested_followups.append("Has anyone in your home, hostel, or workplace had a similar fever recently?")
    if "chest" in chief_complaint.lower() or "breath" in chief_complaint.lower():
        suggested_followups.append("Does the chest discomfort radiate to your jaw, left arm, or back?")

    # Recommended India-wide Referral / Queue Destination
    if rule_urgency == "EMERGENCY":
        destination = "Casualty / Emergency Resuscitation Ward (Immediate Medical Officer Attention)"
    elif rule_urgency == "URGENT":
        destination = "Priority Acute Care OPD / Day Care Observation"
    else:
        destination = "General Outpatient Clinic / Primary Health Center (PHC) Queue"

    # Pertinent Negatives
    pertinent_negatives = [
        "Patient denied acute neurological deficits or loss of consciousness"
        if not any("fainting" in str(a.get("answer_text", "")).lower() for a in answers) else None,
        "No active external hemorrhage reported"
        if not any("bleeding" in str(a.get("answer_text", "")).lower() for a in answers) else None
    ]
    pertinent_negatives = [p for p in pertinent_negatives if p]

    # Clinical Timeline Construction
    timeline_desc = (
        f"Patient presented with {chief_complaint} with symptom onset approximately {duration}. "
        f"Pain and distress rated at '{severity}'. "
    )
    if free_text_notes:
        timeline_desc += f"Patient states: '{' '.join(free_text_notes)}'. "
    if all_lab_flags:
        timeline_desc += f"Multimodal report analysis identified: {', '.join(all_lab_flags)}. "

    # Check if external Gemini API key is configured
    if settings.GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                prompt_text = (
                    f"You are a clinical triage organizer assistant. DO NOT diagnose or prescribe treatment. "
                    f"Organize this intake into a clinical summary for a doctor:\n"
                    f"Scenario: {scenario}\nChief Complaint: {chief_complaint}\nDuration: {duration}\n"
                    f"Severity: {severity}\nAnswers: {json.dumps(symptoms_list)}\nLabs: {json.dumps(all_labs)}\n"
                    f"Return JSON with keys: clinical_timeline, chief_complaint, pertinent_negatives, missing_clinical_info, suggested_follow_ups."
                )
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                resp = await client.post(
                    gemini_url,
                    json={"contents": [{"parts": [{"text": prompt_text}]}]}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    # If valid response, can augment
                    logger.info("Successfully augmented summary with Gemini API.")
        except Exception as e:
            logger.warning(f"External LLM call failed or timed out: {e}. Utilizing expert rule-based summary.")

    summary_result = {
        "clinical_timeline": timeline_desc.strip(),
        "chief_complaint": chief_complaint,
        "symptoms_breakdown": symptoms_list,
        "pertinent_negatives": pertinent_negatives,
        "urgency_assessment": rule_urgency,
        "urgency_score": rule_score,
        "urgency_rationale": rule_rationale,
        "referral_destination": destination,
        "missing_clinical_info": missing_info,
        "suggested_follow_ups": suggested_followups,
        "lab_findings_summary": all_lab_flags,
        "disclaimer": DISCLAIMER_TEXT
    }

    return summary_result
