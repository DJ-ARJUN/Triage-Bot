from typing import List, Dict, Any, Optional

# Structured Question Datasets tailored for India-wide Healthcare Scenarios
# (OPD Queue, Campus Fever, Occupational Health, Maternal Health, Chronic Disease)

PROTOCOLS: Dict[str, Dict[str, Any]] = {
    "OPD_QUEUE": {
        "title": "General Outpatient (OPD) Triage Protocol",
        "title_hi": "सामान्य ओपीडी जांच प्रोटोकॉल",
        "description": "Standard screening for primary health centers and civil hospital outpatient queues",
        "questions": [
            {
                "id": "opd_1_complaint",
                "sequence": 1,
                "category": "Chief Complaint",
                "field_key": "chief_complaint",
                "text": "What is the primary reason for your visit today?",
                "text_hi": "आज अस्पताल आने का मुख्य कारण क्या है?",
                "type": "single_choice",
                "options": [
                    {"id": "opt_fever", "label": "High Fever & Chills", "label_hi": "तेज बुखार और कंपकंपी", "clinical_weight": 2, "triggers_urgency": "URGENT"},
                    {"id": "opt_cough_breath", "label": "Severe Cough & Breathing Trouble", "label_hi": "गंभीर खांसी और सांस लेने में कठिनाई", "clinical_weight": 3, "triggers_urgency": "EMERGENCY"},
                    {"id": "opt_chest_pain", "label": "Chest Heaviness or Palpitations", "label_hi": "छाती में भारीपन या दर्द", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "opt_stomach", "label": "Abdominal Pain, Vomiting, or Diarrhea", "label_hi": "पेट दर्द, उल्टी या दस्त", "clinical_weight": 2, "triggers_urgency": "URGENT"},
                    {"id": "opt_joint_body", "label": "Joint Pain, Weakness, or Body Ache", "label_hi": "जोड़ों में दर्द, कमजोरी या बदन दर्द", "clinical_weight": 1, "triggers_urgency": "ROUTINE"},
                    {"id": "opt_skin_wound", "label": "Skin Rash, Boil, or Minor Cut", "label_hi": "त्वचा पर चकत्ते या चोट", "clinical_weight": 1, "triggers_urgency": "ROUTINE"},
                    {"id": "opt_chronic_followup", "label": "Routine Follow-up (BP / Sugar / Thyroid)", "label_hi": "नियमित जांच (बीपी / शुगर)", "clinical_weight": 1, "triggers_urgency": "ROUTINE"},
                    {"id": "opt_other", "label": "Other health issue (I will describe)", "label_hi": "अन्य समस्या (विवरण लिखूंगा)", "clinical_weight": 1, "triggers_urgency": "ROUTINE"}
                ],
                "required": True
            },
            {
                "id": "opd_2_duration",
                "sequence": 2,
                "category": "Timeline",
                "field_key": "symptom_duration",
                "text": "How many days or hours have you been experiencing this symptom?",
                "text_hi": "यह लक्षण कितने दिनों या घंटों से महसूस हो रहा है?",
                "type": "single_choice",
                "options": [
                    {"id": "dur_sudden", "label": "Started suddenly in the last 2-6 hours", "label_hi": "अचानक पिछले 2-6 घंटों में", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "dur_1_3_days", "label": "1 to 3 days", "label_hi": "1 से 3 दिन", "clinical_weight": 2, "triggers_urgency": "URGENT"},
                    {"id": "dur_4_7_days", "label": "4 to 7 days", "label_hi": "4 से 7 दिन", "clinical_weight": 1, "triggers_urgency": "ROUTINE"},
                    {"id": "dur_more_than_week", "label": "More than 1-2 weeks (Chronic/Persistent)", "label_hi": "1-2 सप्ताह से अधिक (लगातार)", "clinical_weight": 1, "triggers_urgency": "ROUTINE"}
                ],
                "required": True
            },
            {
                "id": "opd_3_severity",
                "sequence": 3,
                "category": "Pain / Severity Scale",
                "field_key": "pain_severity",
                "text": "On a scale of 1 to 10, how severe is your current pain or discomfort?",
                "text_hi": "1 से 10 के पैमाने पर, आपकी वर्तमान तकलीफ या दर्द कितना गंभीर है?",
                "type": "scale",
                "options": [
                    {"id": "sev_mild", "label": "Mild (1 - 3): Noticeable but manageable", "label_hi": "हल्का (1-3)", "clinical_weight": 1, "triggers_urgency": "ROUTINE"},
                    {"id": "sev_moderate", "label": "Moderate (4 - 6): Interferes with daily work", "label_hi": "मध्यम (4-6)", "clinical_weight": 2, "triggers_urgency": "URGENT"},
                    {"id": "sev_severe", "label": "Severe (7 - 8): Hard to walk or speak easily", "label_hi": "गंभीर (7-8)", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "sev_unbearable", "label": "Unbearable (9 - 10): Critical distress", "label_hi": "असहनीय (9-10)", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"}
                ],
                "required": True
            },
            {
                "id": "opd_4_red_flags",
                "sequence": 4,
                "category": "Emergency Red Flags",
                "field_key": "red_flags",
                "text": "Are you experiencing any of these urgent danger signs? (Select all that apply)",
                "text_hi": "क्या आपको इनमें से कोई भी गंभीर चेतावनी संकेत महसूस हो रहे हैं?",
                "type": "multi_choice",
                "options": [
                    {"id": "rf_breathlessness", "label": "Struggling to breathe or bluish lips", "label_hi": "सांस फूलना या होंठ नीले पड़ना", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "rf_fainting", "label": "Fainting, dizziness, or loss of balance", "label_hi": "बेहोशी, चक्कर आना", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "rf_bleeding", "label": "Active bleeding or blood in vomit/cough/stool", "label_hi": "खून की उल्टी, खांसी या मल में रक्त", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "rf_high_fever_seizure", "label": "Fever over 103°F or shivering convulsion", "label_hi": "103°F से अधिक बुखार या झटके", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "rf_none", "label": "None of the above danger signs", "label_hi": "उपरोक्त में से कोई नहीं", "clinical_weight": 0, "triggers_urgency": "ROUTINE"}
                ],
                "required": True
            },
            {
                "id": "opd_5_details",
                "sequence": 5,
                "category": "Symptom Details",
                "field_key": "symptom_notes",
                "text": "Please describe your symptoms in your own words (or use voice input). Mention when it feels worse or better:",
                "text_hi": "कृपया अपने लक्षणों का अपने शब्दों में वर्णन करें (या बोलकर बताएं):",
                "type": "text",
                "placeholder": "e.g., Fever started yesterday with body chills, no appetite...",
                "placeholder_hi": "उदाहरण: कल रात से तेज बुखार और कंपकंपी है...",
                "required": False
            },
            {
                "id": "opd_6_medical_history",
                "sequence": 6,
                "category": "Pre-existing Conditions",
                "field_key": "chronic_conditions",
                "text": "Do you have any known existing medical conditions?",
                "text_hi": "क्या आपको पहले से कोई ज्ञात पुरानी बीमारी है?",
                "type": "multi_choice",
                "options": [
                    {"id": "cond_diabetes", "label": "Diabetes (मधुमेह)", "label_hi": "शुगर / मधुमेह", "clinical_weight": 1},
                    {"id": "cond_hypertension", "label": "High Blood Pressure (उच्च रक्तचाप)", "label_hi": "हाई बीपी", "clinical_weight": 1},
                    {"id": "cond_asthma", "label": "Asthma / Respiratory illness", "label_hi": "दमा / सांस की बीमारी", "clinical_weight": 2},
                    {"id": "cond_heart", "label": "Heart Disease / Stent / Prior attack", "label_hi": "हृदय रोग", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "cond_pregnant", "label": "Currently Pregnant", "label_hi": "गर्भावस्था", "clinical_weight": 2},
                    {"id": "cond_none", "label": "None / No known medical history", "label_hi": "कोई नहीं", "clinical_weight": 0}
                ],
                "required": True
            },
            {
                "id": "opd_7_report_upload",
                "sequence": 7,
                "category": "Diagnostic Reports",
                "field_key": "lab_reports",
                "text": "Do you have any recent lab tests, prescription slips, or scan reports (PDF or Photo)? Upload them here for automated OCR extraction:",
                "text_hi": "क्या आपके पास हालिया रक्त जांच, पर्ची या एक्स-रे रिपोर्ट है? यहां अपलोड करें:",
                "type": "upload",
                "required": False
            }
        ]
    },
    "CAMPUS_FEVER": {
        "title": "Campus / Hostel Infectious Fever Screening",
        "title_hi": "कैंपस / हॉस्टल संक्रामक बुखार जांच",
        "description": "Fever, Dengue, Malaria, and acute viral surveillance for university campus health centers",
        "questions": [
            {
                "id": "fever_1_temperature",
                "sequence": 1,
                "category": "Vital Signs",
                "field_key": "temperature_reading",
                "text": "What was your highest recorded body temperature?",
                "text_hi": "आपका अधिकतम तापमान कितना रिकॉर्ड हुआ?",
                "type": "single_choice",
                "options": [
                    {"id": "temp_mild", "label": "Mild (99°F - 100.4°F)", "label_hi": "हल्का (99°F - 100.4°F)", "clinical_weight": 1, "triggers_urgency": "ROUTINE"},
                    {"id": "temp_high", "label": "High (101°F - 102.5°F)", "label_hi": "तेज (101°F - 102.5°F)", "clinical_weight": 2, "triggers_urgency": "URGENT"},
                    {"id": "temp_extreme", "label": "Very High (>103°F with extreme chills)", "label_hi": "अत्यधिक तेज (>103°F)", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"}
                ],
                "required": True
            },
            {
                "id": "fever_2_associated",
                "sequence": 2,
                "category": "Associated Symptoms",
                "field_key": "fever_associated",
                "text": "Which of these symptoms accompany your fever?",
                "text_hi": "बुखार के साथ और क्या लक्षण हैं?",
                "type": "multi_choice",
                "options": [
                    {"id": "sym_retro_orbital", "label": "Severe pain behind the eyes (Retro-orbital)", "label_hi": "आंखों के पीछे तेज दर्द", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "sym_joint_breakbone", "label": "Intense joint/bone pain ('Breakbone')", "label_hi": "हड्डियों व जोड़ों में भीषण दर्द", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "sym_rash_petechiae", "label": "Red spots or rash on skin", "label_hi": "त्वचा पर लाल चकत्ते", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "sym_persistent_vomit", "label": "Persistent vomiting / Inability to drink liquids", "label_hi": "लगातार उल्टी / पानी न पच पाना", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "sym_throat_cold", "label": "Runny nose & sore throat only", "label_hi": "सामान्य जुकाम व गले में खराश", "clinical_weight": 1, "triggers_urgency": "ROUTINE"}
                ],
                "required": True
            },
            {
                "id": "fever_3_report_upload",
                "sequence": 3,
                "category": "Lab Report",
                "field_key": "fever_cbc_report",
                "text": "If you have a Complete Blood Count (CBC) or Dengue NS1 / Platelet test report, please upload it:",
                "text_hi": "यदि आपके पास सीबीसी (CBC) या प्लेटलेट रिपोर्ट है तो अपलोड करें:",
                "type": "upload",
                "required": False
            }
        ]
    },
    "OCCUPATIONAL_HEALTH": {
        "title": "Industrial Estate & Worker Occupational Health Screening",
        "title_hi": "औद्योगिक इकाई व श्रमिक स्वास्थ्य जांच",
        "description": "Screening for factory workers, dust/chemical inhalation, heat strain, and workplace injuries",
        "questions": [
            {
                "id": "occ_1_hazard_type",
                "sequence": 1,
                "category": "Workplace Hazard",
                "field_key": "workplace_hazard",
                "text": "What type of workplace hazard were you exposed to?",
                "text_hi": "आप किस प्रकार के कार्यस्थल जोखिम के संपर्क में आए?",
                "type": "single_choice",
                "options": [
                    {"id": "haz_chemical_fumes", "label": "Chemical Fumes / Acid Mist / Gas Inhalation", "label_hi": "रासायनिक धुआं / गैस", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "haz_dust_silica", "label": "Heavy Industrial Dust / Silica / Asbestos", "label_hi": "औद्योगिक धूल / सिलिका", "clinical_weight": 2, "triggers_urgency": "URGENT"},
                    {"id": "haz_heat_strain", "label": "High Heat Furnace / Severe Dehydration / Cramps", "label_hi": "अत्यधिक गर्मी / भट्टी", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "haz_machine_injury", "label": "Crush Injury / Machinery Laceration / Burn", "label_hi": "मशीन की चोट / जलना", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "haz_skin_contact", "label": "Direct Solvent or Chemical Skin Contact / Irritation", "label_hi": "त्वचा पर रसायन गिरना", "clinical_weight": 2, "triggers_urgency": "URGENT"}
                ],
                "required": True
            },
            {
                "id": "occ_2_symptoms",
                "sequence": 2,
                "category": "Worker Symptoms",
                "field_key": "occ_symptoms",
                "text": "What are your current symptoms following the exposure?",
                "text_hi": "जोखिम के संपर्क के बाद अब क्या लक्षण हैं?",
                "type": "multi_choice",
                "options": [
                    {"id": "sym_throat_choking", "label": "Choking sensation, throat burning, or wheezing", "label_hi": "दम घुटना या गले में जलन", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "sym_eye_burn", "label": "Eye irritation, watering, or vision blurriness", "label_hi": "आंखों में जलन या धुंधलापन", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "sym_dizziness", "label": "Dizziness, nausea, or headache", "label_hi": "सिर घूमना या चक्कर", "clinical_weight": 2, "triggers_urgency": "URGENT"},
                    {"id": "sym_skin_blister", "label": "Skin redness, peeling, or blisters", "label_hi": "त्वचा लाल होना या छाले", "clinical_weight": 3, "triggers_urgency": "URGENT"}
                ],
                "required": True
            },
            {
                "id": "occ_3_report_upload",
                "sequence": 3,
                "category": "Incident Report / Medical Record",
                "field_key": "incident_file",
                "text": "Upload chemical Safety Data Sheet (SDS), clinic slip, or photo of affected area:",
                "text_hi": "संबंधित पर्ची या प्रभावित क्षेत्र का फोटो अपलोड करें:",
                "type": "upload",
                "required": False
            }
        ]
    },
    "MATERNAL_HEALTH": {
        "title": "Maternal & Antenatal Health Follow-up",
        "title_hi": "मातृ एवं प्रसवपूर्व स्वास्थ्य फॉलो-अप",
        "description": "High-risk pregnancy surveillance, hypertension, and danger signs for primary clinics",
        "questions": [
            {
                "id": "mat_1_gestation",
                "sequence": 1,
                "category": "Gestational Stage",
                "field_key": "gestational_age",
                "text": "What month or trimester of pregnancy are you currently in?",
                "text_hi": "गर्भावस्था का कौन सा महीना या तिमाही चल रहा है?",
                "type": "single_choice",
                "options": [
                    {"id": "trim_1", "label": "First Trimester (Months 1-3)", "label_hi": "पहली तिमाही (महीने 1-3)", "clinical_weight": 1},
                    {"id": "trim_2", "label": "Second Trimester (Months 4-6)", "label_hi": "दूसरी तिमाही (महीने 4-6)", "clinical_weight": 1},
                    {"id": "trim_3", "label": "Third Trimester (Months 7-9)", "label_hi": "तीसरी तिमाही (महीने 7-9)", "clinical_weight": 2, "triggers_urgency": "URGENT"}
                ],
                "required": True
            },
            {
                "id": "mat_2_danger_signs",
                "sequence": 2,
                "category": "Obstetric Danger Signs",
                "field_key": "obstetric_danger_signs",
                "text": "Are you experiencing any of these high-priority warning signs?",
                "text_hi": "क्या आपको इनमें से कोई चेतावनी संकेत दिखाई दे रहे हैं?",
                "type": "multi_choice",
                "options": [
                    {"id": "mat_bleeding", "label": "Vaginal bleeding or fluid leakage", "label_hi": "रक्तस्राव या पानी गिरना", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "mat_headache_bp", "label": "Severe persistent headache or vision disturbance (High BP risk)", "label_hi": "तेज सिरदर्द या धुंधला दिखाई देना (हाई बीपी संकेत)", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "mat_fetal_movement", "label": "Decreased or absent baby movements", "label_hi": "शिशु की हलचल कम होना या रुकना", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "mat_edema", "label": "Sudden swelling of face, hands, and feet", "label_hi": "चेहरे व पैरों में अचानक सूजन", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "mat_none", "label": "None - Routine check-up only", "label_hi": "कोई नहीं - नियमित जांच", "clinical_weight": 0, "triggers_urgency": "ROUTINE"}
                ],
                "required": True
            },
            {
                "id": "mat_3_report_upload",
                "sequence": 3,
                "category": "Antenatal Card / Ultrasound",
                "field_key": "maternal_records",
                "text": "Upload your MCP (Mother & Child Protection) card, Blood Pressure log, or Ultrasound report:",
                "text_hi": "एमसीपी कार्ड (MCP Card), बीपी रिकॉर्ड या अल्ट्रासाउंड रिपोर्ट अपलोड करें:",
                "type": "upload",
                "required": False
            }
        ]
    },
    "CHRONIC_CARE": {
        "title": "Chronic Disease & Geriatric Check-in",
        "title_hi": "पुरानी बीमारी व वृद्धजन नियमित फॉलो-अप",
        "description": "Hypertension, Type-2 Diabetes, COPD, and cardiovascular risk tracking",
        "questions": [
            {
                "id": "chr_1_condition",
                "sequence": 1,
                "category": "Chronic Disease Type",
                "field_key": "chronic_primary",
                "text": "Which condition are you checking in for?",
                "text_hi": "आप किस बीमारी की समीक्षा के लिए आए हैं?",
                "type": "multi_choice",
                "options": [
                    {"id": "chr_diabetes", "label": "Type 2 Diabetes Mellitus", "label_hi": "डायबिटीज (शुगर)", "clinical_weight": 1},
                    {"id": "chr_htn", "label": "Hypertension (High Blood Pressure)", "label_hi": "हाई ब्लड प्रेशर", "clinical_weight": 1},
                    {"id": "chr_copd", "label": "COPD / Chronic Bronchitis", "label_hi": "सीओपीडी / फेफड़ों की समस्या", "clinical_weight": 2},
                    {"id": "chr_ckd", "label": "Kidney Disease", "label_hi": "गुर्दे (किडनी) की बीमारी", "clinical_weight": 2}
                ],
                "required": True
            },
            {
                "id": "chr_2_vitals",
                "sequence": 2,
                "category": "Recent Self-Monitored Values",
                "field_key": "chronic_readings",
                "text": "Do you know your recent blood sugar (Fasting/PP) or Blood Pressure reading?",
                "text_hi": "क्या आपको अपनी हालिया शुगर या बीपी की रीडिंग याद है?",
                "type": "text",
                "placeholder": "e.g., Fasting Sugar 210 mg/dL, BP 155/95 mmHg...",
                "placeholder_hi": "जैसे: खाली पेट शुगर 210 mg/dL, बीपी 155/95...",
                "required": False
            },
            {
                "id": "chr_3_complications",
                "sequence": 3,
                "category": "Complication Warning Flags",
                "field_key": "chronic_complications",
                "text": "Have you noticed any of the following new warning symptoms?",
                "text_hi": "क्या आपने इनमें से कोई नई परेशानी महसूस की है?",
                "type": "multi_choice",
                "options": [
                    {"id": "chr_foot_ulcer", "label": "Non-healing wound or numbness in feet (Diabetic foot)", "label_hi": "पैरों में सुन्नपन या न भरने वाला घाव", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "chr_sob_lying", "label": "Breathlessness when lying flat at night", "label_hi": "रात में लेटने पर सांस फूलना", "clinical_weight": 4, "triggers_urgency": "EMERGENCY"},
                    {"id": "chr_chest_tight", "label": "Chest tightness on climbing stairs", "label_hi": "सीढ़ियां चढ़ने पर छाती में जकड़न", "clinical_weight": 3, "triggers_urgency": "URGENT"},
                    {"id": "chr_none", "label": "Stable - No acute complications", "label_hi": "स्थिति स्थिर है - कोई नई परेशानी नहीं", "clinical_weight": 0, "triggers_urgency": "ROUTINE"}
                ],
                "required": True
            },
            {
                "id": "chr_4_report_upload",
                "sequence": 4,
                "category": "HbA1c / Lipid / Kidney Lab Report",
                "field_key": "chronic_lab_report",
                "text": "Upload your recent HbA1c, Serum Creatinine, or prescription slip for OCR verification:",
                "text_hi": "हालिया एचबीए1सी (HbA1c), किडनी या लिपिड रिपोर्ट अपलोड करें:",
                "type": "upload",
                "required": False
            }
        ]
    }
}

def get_protocol(scenario: str) -> Dict[str, Any]:
    return PROTOCOLS.get(scenario, PROTOCOLS["OPD_QUEUE"])

def get_question_by_id(scenario: str, question_id: str) -> Optional[Dict[str, Any]]:
    proto = get_protocol(scenario)
    for q in proto["questions"]:
        if q["id"] == question_id:
            return q
    return None

def get_next_question(scenario: str, answered_question_ids: List[str]) -> Optional[Dict[str, Any]]:
    proto = get_protocol(scenario)
    for q in proto["questions"]:
        if q["id"] not in answered_question_ids:
            return q
    return None

def list_all_scenarios() -> List[Dict[str, str]]:
    return [
        {"id": key, "title": val["title"], "title_hi": val["title_hi"], "description": val["description"]}
        for key, val in PROTOCOLS.items()
    ]

