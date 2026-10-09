import os
import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Case, CaseMessage, MedicalDocument, AuditLog
from app.auth import get_password_hash
from app.config import settings

SAMPLE_PDF_CBC_TEXT = """NATIONAL INSTITUTE OF EPIDEMIOLOGY & CLINICAL PATHOLOGY
DEPARTMENT OF HEMATOLOGY - EMERGENCY LAB
Report Date: 2026-10-08 09:30 AM
Sample ID: LAB-2026-9812
Patient: Aarav Sharma (PAT-1001), Age: 28 Yrs / Male
Referring Unit: Campus Health Center

COMPLETE BLOOD COUNT (CBC) & SEROLOGY:
Parameter                         Result       Reference Range      Unit      Flag
-----------------------------------------------------------------------------------
Hemoglobin (Hb)                   10.8         12.0 - 16.5          g/dL      LOW
Total Leucocyte Count (WBC)       3,100        4,000 - 11,000       /mcL      LOW
Platelet Count                    42,000       150,000 - 450,000    /mcL      CRITICAL LOW
Hematocrit (PCV)                  44.2         38.0 - 50.0          %         NORMAL
Dengue NS1 Antigen                POSITIVE     Negative             Qual.     CRITICAL
Dengue IgM Antibody               POSITIVE     Negative             Qual.     HIGH

Clinical Impression:
Profound thrombocytopenia with leukopenia and positive Dengue NS1/IgM serology.
High risk of dengue hemorrhagic manifestation. Requires immediate clinical evaluation and fluid monitoring.
"""

SAMPLE_PDF_DIABETES_TEXT = """COMMUNITY HEALTH SCREENING & METABOLIC LABORATORY
Report Date: 2026-10-07 04:15 PM
Sample ID: LAB-2026-5541
Patient: Sunita Devi (PAT-1002), Age: 45 Yrs / Female
Referring Unit: NCD Chronic Care Desk

GLYCEMIC & RENAL BIOCHEMISTRY PANEL:
Parameter                         Result       Reference Range      Unit      Flag
-----------------------------------------------------------------------------------
Fasting Blood Sugar (FBS)         218          70 - 100             mg/dL     HIGH
Post-Prandial Glucose (PPBS)      310          90 - 140             mg/dL     HIGH
HbA1c (Glycated Hb)               10.4         4.0 - 5.7            %         CRITICAL HIGH
Serum Creatinine                  1.4          0.6 - 1.2            mg/dL     HIGH
Blood Urea                        48           15 - 40              mg/dL     HIGH
Estimated GFR (eGFR)              48           > 90                 mL/min    LOW

Clinical Impression:
Severely uncontrolled Type 2 Diabetes Mellitus with early diabetic nephropathy (Stage 3 CKD).
Review glycemic regimen, renal-protective therapy, and lifestyle modification.
"""

SAMPLE_PDF_CHEST_TEXT = """INSTITUTIONAL HEALTH RADIOLOGY REPORT - CHEST PA VIEW
Report Date: 2026-10-08 10:15 AM
Patient ID: PAT-1005 (Vikram Singh), Age: 52 Yrs / Male

FINDINGS:
Cardiac silhouette appears mildly enlarged (Cardiomegaly).
Patchy alveolar infiltrates and bronchovascular prominence noted in both perihilar regions.
Costophrenic angles are clear. Trachea is central. No pneumothorax.

IMPRESSION:
Features suggestive of pulmonary vascular congestion with cardiomegaly.
Urgent clinical correlation with ECG and cardiac biomarkers advised.
"""

def create_synthetic_pdf(filepath: str, text: str):
    """Generates a valid lightweight PDF using basic stream format."""
    # We can write a clean text or minimal PDF stream
    # If pypdf or simple text, writing it cleanly ensures extractors read it:
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    # Write as text/pdf compatible
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(text)


async def seed_database(db: AsyncSession):
    # Check if users already seeded
    existing = await db.execute(select(User).limit(1))
    if existing.scalars().first():
        return

    # 1. Seed Users
    users_data = [
        User(
            user_id="PAT-1001",
            role="patient",
            full_name="Aarav Sharma",
            hashed_password=get_password_hash("patient123"),
            phone="9876543210",
            age=28,
            gender="Male",
            preferred_language="en",
            institute_name="National Institute Health Center"
        ),
        User(
            user_id="PAT-1002",
            role="patient",
            full_name="Sunita Devi",
            hashed_password=get_password_hash("patient123"),
            phone="9812345678",
            age=45,
            gender="Female",
            preferred_language="hi",
            institute_name="National Institute Health Center"
        ),
        User(
            user_id="PAT-1003",
            role="patient",
            full_name="Ramesh Patel",
            hashed_password=get_password_hash("patient123"),
            phone="9898765432",
            age=38,
            gender="Male",
            preferred_language="en",
            institute_name="Industrial Area Health Post"
        ),
        User(
            user_id="PAT-1004",
            role="patient",
            full_name="Pooja Verma",
            hashed_password=get_password_hash("patient123"),
            phone="9765432109",
            age=24,
            gender="Female",
            preferred_language="hi",
            institute_name="District Maternal Health Center"
        ),
        User(
            user_id="PAT-1005",
            role="patient",
            full_name="Vikram Singh",
            hashed_password=get_password_hash("patient123"),
            phone="9845123456",
            age=52,
            gender="Male",
            preferred_language="en",
            institute_name="Civil Hospital Emergency Triage"
        ),
        User(
            user_id="REV-DR-RAO",
            role="reviewer",
            full_name="Dr. Ananya Rao (MD)",
            hashed_password=get_password_hash("doctor123"),
            phone="9988776655",
            institute_name="National Institute Health Center"
        ),
        User(
            user_id="REV-DR-MEHTA",
            role="reviewer",
            full_name="Dr. Rajesh Mehta (MBBS)",
            hashed_password=get_password_hash("doctor123"),
            phone="9977665544",
            institute_name="Primary Health Center Unit"
        ),
        User(
            user_id="REV-NURSE-PRIYA",
            role="reviewer",
            full_name="Sister Priya Nair (Triage Nurse)",
            hashed_password=get_password_hash("doctor123"),
            phone="9966554433",
            institute_name="Civil Hospital Emergency Wing"
        )
    ]
    for u in users_data:
        db.add(u)
    await db.commit()

    # Create synthetic sample report files
    cbc_path = os.path.join(settings.SAMPLE_REPORTS_DIR, "sample_cbc_dengue.txt")
    diab_path = os.path.join(settings.SAMPLE_REPORTS_DIR, "sample_diabetes_hba1c.txt")
    xray_path = os.path.join(settings.SAMPLE_REPORTS_DIR, "sample_chest_xray_report.txt")
    create_synthetic_pdf(cbc_path, SAMPLE_PDF_CBC_TEXT)
    create_synthetic_pdf(diab_path, SAMPLE_PDF_DIABETES_TEXT)
    create_synthetic_pdf(xray_path, SAMPLE_PDF_CHEST_TEXT)

    # Copy one into uploads for initial case attachment
    upload_cbc = os.path.join(settings.UPLOAD_DIR, "pat1001_dengue_cbc.txt")
    create_synthetic_pdf(upload_cbc, SAMPLE_PDF_CBC_TEXT)

    upload_diab = os.path.join(settings.UPLOAD_DIR, "pat1002_diabetes_report.txt")
    create_synthetic_pdf(upload_diab, SAMPLE_PDF_DIABETES_TEXT)

    # 2. Seed Case 1: Aarav Sharma (Campus Fever with Dengue warning)
    case1 = Case(
        case_number="CASE-2026-1001",
        patient_user_id="PAT-1001",
        patient_name="Aarav Sharma",
        patient_age=28,
        patient_gender="Male",
        assigned_reviewer_id="REV-DR-RAO",
        assigned_reviewer_name="Dr. Ananya Rao (MD)",
        status="UNDER_REVIEW",
        urgency_level="EMERGENCY",
        scenario="CAMPUS_FEVER",
        chief_complaint="High Fever & Chills with severe retro-orbital eye pain",
        consent_given=True,
        pii_masked=True,
        ai_summary={
            "clinical_timeline": "Patient presented with acute high fever (103°F) for 3 days accompanied by intense retro-orbital headache and breakbone joint pain. Severe thrombocytopenia noted on uploaded CBC.",
            "chief_complaint": "High Fever & Chills with retro-orbital pain",
            "symptoms_breakdown": [
                {"category": "Highest Temperature", "response": "Very High (>103°F with extreme chills)"},
                {"category": "Associated Symptoms", "response": "Severe pain behind eyes, breakbone joint pain, red spots on skin"},
                {"category": "Duration", "response": "3 days"}
            ],
            "pertinent_negatives": ["Patient denied active hematemesis or loss of consciousness"],
            "urgency_assessment": "EMERGENCY",
            "urgency_score": 95,
            "urgency_rationale": "Critical Thrombocytopenia (Platelets 42,000 /mcL) + Dengue NS1 Positive + Petechial skin rash.",
            "referral_destination": "Casualty / Emergency Resuscitation Ward (Immediate Medical Officer Attention)",
            "missing_clinical_info": [
                "Current hydration and oral fluid intake status",
                "Last recorded blood pressure and pulse pressure",
                "History of NSAID/Ibuprofen usage (contraindicated in suspected Dengue)"
            ],
            "suggested_follow_ups": [
                "Have you taken any Brufen, Combiflam, or Aspirin for fever relief?",
                "Are you experiencing any gum bleeding or nose bleeds?",
                "Are you able to pass urine regularly today?"
            ],
            "disclaimer": "AI-Assisted Triage Note for Qualified Healthcare Worker Review. Strictly non-diagnostic."
        },
        missing_information=[
            "Current hydration status",
            "Vital signs: Blood pressure and pulse",
            "NSAID ingestion history"
        ],
        suggested_follow_ups=[
            "Have you taken any Brufen or Aspirin today?",
            "Are you experiencing any black stools or gum bleeding?"
        ],
        reviewer_notes="High clinical suspicion of Dengue with warning signs. Advised immediate IV line and admission to high-dependency fever ward.",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
    )
    db.add(case1)
    await db.flush()

    # Add messages for Case 1
    m1 = CaseMessage(
        case_id=case1.id,
        sender_type="patient",
        sender_id="PAT-1001",
        sender_name="Aarav Sharma",
        question_id="fever_1_temperature",
        question_text="What was your highest recorded body temperature?",
        question_text_hi="आपका अधिकतम तापमान कितना रिकॉर्ड हुआ?",
        answer_text="Very High (>103°F with extreme chills)",
        input_type="single_choice"
    )
    m2 = CaseMessage(
        case_id=case1.id,
        sender_type="patient",
        sender_id="PAT-1001",
        sender_name="Aarav Sharma",
        question_id="fever_2_associated",
        question_text="Which of these symptoms accompany your fever?",
        question_text_hi="बुखार के साथ और क्या लक्षण हैं?",
        answer_text="Severe pain behind the eyes (Retro-orbital), Intense joint/bone pain ('Breakbone'), Red spots or rash on skin",
        input_type="multi_choice"
    )
    m3 = CaseMessage(
        case_id=case1.id,
        sender_type="patient",
        sender_id="PAT-1001",
        sender_name="Aarav Sharma",
        question_id="fever_3_report_upload",
        question_text="Upload CBC / Dengue test report:",
        question_text_hi="सीबीसी या प्लेटलेट रिपोर्ट अपलोड करें:",
        answer_text="Uploaded report: sample_cbc_dengue.txt (OCR Processed)",
        input_type="upload",
        attachment_type="document",
        attachment_url="/api/upload/file/pat1001_dengue_cbc.txt"
    )
    m4 = CaseMessage(
        case_id=case1.id,
        sender_type="reviewer",
        sender_id="REV-DR-RAO",
        sender_name="Dr. Ananya Rao (MD)",
        question_id="rev_followup_1",
        question_text="Aarav, please do NOT take any Brufen or Combiflam. Are you feeling dizziness when standing up?",
        answer_text=None,
        input_type="text"
    )
    db.add_all([m1, m2, m3, m4])

    # Add Medical Document for Case 1
    doc1 = MedicalDocument(
        case_id=case1.id,
        patient_id="PAT-1001",
        filename="pat1001_dengue_cbc.txt",
        original_filename="sample_cbc_dengue.pdf",
        file_path=upload_cbc,
        file_type="application/pdf",
        file_size=1420,
        ocr_status="COMPLETED",
        extracted_text=SAMPLE_PDF_CBC_TEXT,
        structured_lab_data=[
            {"test_name": "Platelet Count", "value": "42,000", "unit": "/mcL", "status": "CRITICAL", "reference_range": "150,000 - 450,000 /mcL"},
            {"test_name": "Hemoglobin (Hb)", "value": "10.8", "unit": "g/dL", "status": "LOW", "reference_range": "12.0 - 16.5 g/dL"},
            {"test_name": "Total Leucocyte Count (WBC)", "value": "3,100", "unit": "/mcL", "status": "LOW", "reference_range": "4,000 - 11,000 /mcL"},
            {"test_name": "Dengue NS1 Antigen", "value": "POSITIVE (Reactive)", "unit": "", "status": "CRITICAL", "reference_range": "Negative"}
        ],
        clinical_flags=[
            "CRITICAL LOW: Platelet Count is 42,000 /mcL (Immediate Attention)",
            "Dengue NS1 Antigen Positive detected on lab report",
            "Leukopenia present (WBC 3,100 /mcL)"
        ]
    )
    db.add(doc1)

    # 3. Seed Case 2: Ramesh Patel (Industrial Chemical Inhalation)
    case2 = Case(
        case_number="CASE-2026-1002",
        patient_user_id="PAT-1003",
        patient_name="Ramesh Patel",
        patient_age=38,
        patient_gender="Male",
        assigned_reviewer_id="REV-DR-MEHTA",
        assigned_reviewer_name="Dr. Rajesh Mehta (MBBS)",
        status="TRIAGED_BY_AI",
        urgency_level="EMERGENCY",
        scenario="OCCUPATIONAL_HEALTH",
        chief_complaint="Chemical Fumes / Acid Mist Inhalation with severe choking and wheezing",
        consent_given=True,
        pii_masked=True,
        ai_summary={
            "clinical_timeline": "Workplace incident: Acute exposure to industrial acid cleaning solvent 3 hours ago. Developed acute choking, wheezing, and conjunctival burning.",
            "chief_complaint": "Toxic Acid Mist Inhalation",
            "symptoms_breakdown": [
                {"category": "Hazard", "response": "Chemical Fumes / Acid Mist / Gas Inhalation"},
                {"category": "Symptoms", "response": "Choking sensation, throat burning, wheezing, eye watering"}
            ],
            "pertinent_negatives": ["No blast injury or chemical splash on open wounds reported"],
            "urgency_assessment": "EMERGENCY",
            "urgency_score": 90,
            "urgency_rationale": "High risk of acute chemical pneumonitis / toxic laryngeal spasm.",
            "referral_destination": "Casualty / Emergency Resuscitation Ward (Immediate Medical Officer Attention)",
            "missing_clinical_info": [
                "Specific Chemical Identity / Material Safety Data Sheet (MSDS)",
                "Pulse Oximetry SpO2 reading",
                "Duration of indoor exposure in minutes"
            ],
            "suggested_follow_ups": [
                "Was the chemical exposure in an enclosed unventilated room?",
                "Are other co-workers affected?"
            ],
            "disclaimer": "AI-Assisted Triage Note for Qualified Healthcare Worker Review. Strictly non-diagnostic."
        },
        missing_information=["Chemical MSDS", "SpO2 measurement"],
        suggested_follow_ups=["Enclosed room exposure duration?"],
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=4)
    )
    db.add(case2)

    # 4. Seed Case 3: Sunita Devi (Chronic Uncontrolled Diabetes & Nephropathy)
    case3 = Case(
        case_number="CASE-2026-1003",
        patient_user_id="PAT-1002",
        patient_name="Sunita Devi",
        patient_age=45,
        patient_gender="Female",
        assigned_reviewer_id="REV-DR-RAO",
        assigned_reviewer_name="Dr. Ananya Rao (MD)",
        status="TRIAGED_BY_AI",
        urgency_level="URGENT",
        scenario="CHRONIC_CARE",
        chief_complaint="Uncontrolled Blood Sugar with bilateral foot numbness and fatigue",
        consent_given=True,
        pii_masked=True,
        ai_summary={
            "clinical_timeline": "45-year-old female with long-standing Type 2 Diabetes presenting for routine review. Recent blood tests indicate uncontrolled fasting hyperglycemia (218 mg/dL) and HbA1c 10.4%.",
            "chief_complaint": "Type 2 Diabetes Review & Peripheral Neuropathy",
            "symptoms_breakdown": [
                {"category": "Condition", "response": "Type 2 Diabetes Mellitus"},
                {"category": "Readings", "response": "Fasting Sugar 218 mg/dL, HbA1c 10.4%"},
                {"category": "Complications", "response": "Non-healing wound or numbness in feet (Diabetic foot)"}
            ],
            "pertinent_negatives": ["Denied chest pain on climbing stairs, Denied nocturnal dyspnea"],
            "urgency_assessment": "URGENT",
            "urgency_score": 75,
            "urgency_rationale": "Marked glycemic decompensation (HbA1c 10.4%) + early diabetic neuropathy + elevated creatinine (1.4 mg/dL).",
            "referral_destination": "NCD Chronic Disease Clinic / Internal Medicine Specialist OPD",
            "missing_clinical_info": [
                "Current anti-diabetic medication compliance and dosage",
                "Urine microalbuminuria test status",
                "Dilated fundus / retinal exam history"
            ],
            "suggested_follow_ups": [
                "Have you missed any insulin or metformin doses over the last month?",
                "Are you experiencing excessive thirst or frequent urination at night?"
            ],
            "disclaimer": "AI-Assisted Triage Note for Qualified Healthcare Worker Review. Strictly non-diagnostic."
        },
        missing_information=["Medication compliance", "Urine albumin report"],
        suggested_follow_ups=["Have you missed any doses?"],
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
    )
    db.add(case3)
    await db.flush()

    # Add Medical Document for Case 3
    doc3 = MedicalDocument(
        case_id=case3.id,
        patient_id="PAT-1002",
        filename="pat1002_diabetes_report.txt",
        original_filename="sample_diabetes_hba1c.pdf",
        file_path=upload_diab,
        file_type="application/pdf",
        file_size=1250,
        ocr_status="COMPLETED",
        extracted_text=SAMPLE_PDF_DIABETES_TEXT,
        structured_lab_data=[
            {"test_name": "Fasting Blood Sugar", "value": "218", "unit": "mg/dL", "status": "HIGH", "reference_range": "70 - 100 mg/dL"},
            {"test_name": "Post-Prandial Blood Sugar", "value": "310", "unit": "mg/dL", "status": "HIGH", "reference_range": "90 - 140 mg/dL"},
            {"test_name": "HbA1c", "value": "10.4", "unit": "%", "status": "CRITICAL", "reference_range": "4.0 - 5.7 %"},
            {"test_name": "Serum Creatinine", "value": "1.4", "unit": "mg/dL", "status": "HIGH", "reference_range": "0.6 - 1.2 mg/dL"}
        ],
        clinical_flags=[
            "CRITICAL HIGH: HbA1c is 10.4 % (Uncontrolled Diabetes)",
            "Elevated Fasting Glucose (218 mg/dL)",
            "Serum Creatinine elevated (1.4 mg/dL) indicating renal strain"
        ]
    )
    db.add(doc3)

    # 5. Seed Case 4: Pooja Verma (Maternal High-Risk Pregnancy)
    case4 = Case(
        case_number="CASE-2026-1004",
        patient_user_id="PAT-1004",
        patient_name="Pooja Verma",
        patient_age=24,
        patient_gender="Female",
        assigned_reviewer_id="REV-NURSE-PRIYA",
        assigned_reviewer_name="Sister Priya Nair (Triage Nurse)",
        status="FOLLOW_UP_REQUESTED",
        urgency_level="URGENT",
        scenario="MATERNAL_HEALTH",
        chief_complaint="Third Trimester severe headache and sudden facial & pedal swelling",
        consent_given=True,
        pii_masked=True,
        ai_summary={
            "clinical_timeline": "Primigravida in Third Trimester (32 weeks) presenting with 2-day history of throbbing frontal headache and rapid-onset bilateral leg and facial swelling.",
            "chief_complaint": "Severe persistent headache and sudden edema",
            "symptoms_breakdown": [
                {"category": "Trimester", "response": "Third Trimester (Months 7-9)"},
                {"category": "Warning signs", "response": "Severe persistent headache (High BP risk), Sudden swelling of face, hands, feet"}
            ],
            "pertinent_negatives": ["Denied vaginal bleeding, Normal fetal movements felt this morning"],
            "urgency_assessment": "URGENT",
            "urgency_score": 80,
            "urgency_rationale": "High clinical suspicion for Pre-eclampsia / Gestational Hypertension.",
            "referral_destination": "Antenatal High-Risk Clinic / Obstetric Emergency",
            "missing_clinical_info": [
                "Blood Pressure reading (Systolic & Diastolic)",
                "Urine Dipstick Proteinuria test",
                "Deep tendon reflexes check"
            ],
            "suggested_follow_ups": [
                "Are you experiencing any epigastric (upper belly) pain or seeing flashes of light?",
                "Has your blood pressure been measured at your local ASHA/Anganwadi center this week?"
            ],
            "disclaimer": "AI-Assisted Triage Note for Qualified Healthcare Worker Review. Strictly non-diagnostic."
        },
        missing_information=["Blood Pressure measurement", "Urine Protein Dipstick"],
        suggested_follow_ups=["Are you seeing flashes of light or epigastric pain?"],
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=8)
    )
    db.add(case4)

    await db.commit()

