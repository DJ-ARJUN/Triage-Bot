import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, field_serializer


class APIModel(BaseModel):
    @field_serializer("*", when_used="json")
    def serialize_datetime_as_utc(self, value):
        if isinstance(value, datetime.datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=datetime.timezone.utc)
            else:
                value = value.astimezone(datetime.timezone.utc)
            return value.isoformat()
        return value

# --- Auth Schemas ---
class PatientLoginRequest(BaseModel):
    patient_id: str = Field(..., example="PAT-1001")
    password: str = Field(..., example="patient123")

class ReviewerLoginRequest(BaseModel):
    reviewer_id: str = Field(..., example="REV-DR-SHARMA")
    password: str = Field(..., example="doctor123")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str
    preferred_language: str = "en"

class UserCreateRequest(BaseModel):
    user_id: str
    role: str  # 'patient' or 'reviewer'
    full_name: str
    password: str
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    preferred_language: Optional[str] = "en"

class UserResponse(APIModel):
    id: int
    user_id: str
    role: str
    full_name: str
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    preferred_language: str
    institute_name: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Question & Guided Chat Schemas ---
class QuestionOption(BaseModel):
    id: str
    label: str
    label_hi: Optional[str] = None
    clinical_weight: Optional[int] = 0
    triggers_urgency: Optional[str] = None  # 'EMERGENCY', 'URGENT'

class QuestionItem(BaseModel):
    id: str
    sequence: int
    category: str
    field_key: str
    text: str
    text_hi: Optional[str] = None
    type: str  # 'single_choice', 'multi_choice', 'text', 'scale', 'upload', 'voice'
    options: Optional[List[QuestionOption]] = []
    placeholder: Optional[str] = None
    placeholder_hi: Optional[str] = None
    required: bool = True
    depends_on: Optional[Dict[str, Any]] = None

class AnswerSubmissionRequest(BaseModel):
    case_id: int
    question_id: str
    question_text: str
    question_text_hi: Optional[str] = None
    answer_text: str
    answer_options_selected: Optional[List[str]] = []
    input_type: str = "text"
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None


# --- Medical Document / OCR Schemas ---
class ExtractedLabItem(BaseModel):
    test_name: str
    value: str
    unit: Optional[str] = ""
    status: str = "NORMAL"  # 'HIGH', 'LOW', 'CRITICAL', 'NORMAL'
    reference_range: Optional[str] = ""

class DocumentResponse(APIModel):
    id: int
    case_id: int
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    ocr_status: str
    extracted_text: Optional[str] = None
    structured_lab_data: Optional[List[Dict[str, Any]]] = []
    clinical_flags: Optional[List[str]] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Case Message Schema ---
class CaseMessageResponse(APIModel):
    id: int
    case_id: int
    sender_type: str
    sender_id: str
    sender_name: str
    question_id: Optional[str] = None
    question_text: Optional[str] = None
    question_text_hi: Optional[str] = None
    answer_text: Optional[str] = None
    answer_options_selected: Optional[List[str]] = []
    input_type: str
    attachment_type: Optional[str] = None
    attachment_url: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Case Schemas ---
class CaseCreateRequest(BaseModel):
    scenario: str = "OPD_QUEUE"  # 'OPD_QUEUE', 'CAMPUS_FEVER', 'OCCUPATIONAL_HEALTH', 'MATERNAL_HEALTH', 'CHRONIC_CARE'
    consent_given: bool = True
    language: str = "en"

class CaseUpdateRequest(BaseModel):
    status: Optional[str] = None
    urgency_level: Optional[str] = None
    assigned_reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    doctor_disposition: Optional[str] = None
    referral_destination: Optional[str] = None

class FollowUpQuestionRequest(BaseModel):
    question_text: str
    question_text_hi: Optional[str] = None
    suggested_options: Optional[List[str]] = []

class AISummarySchema(BaseModel):
    clinical_timeline: str
    chief_complaint: str
    symptoms_breakdown: List[Dict[str, str]]
    pertinent_negatives: List[str]
    urgency_assessment: str
    urgency_rationale: str
    missing_clinical_info: List[str]
    suggested_follow_ups: List[str]
    disclaimer: str = (
        "AI-Assisted Triage Note for Qualified Healthcare Worker Review. "
        "Strictly non-diagnostic. Does not prescribe medications or replace clinical evaluation."
    )

class CaseListResponse(APIModel):
    id: int
    case_number: str
    patient_user_id: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    assigned_reviewer_id: Optional[str] = None
    assigned_reviewer_name: Optional[str] = None
    status: str
    urgency_level: str
    scenario: str
    chief_complaint: Optional[str] = None
    referral_destination: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    documents_count: int = 0
    messages_count: int = 0

    class Config:
        from_attributes = True

class CaseDetailResponse(APIModel):
    id: int
    case_number: str
    patient_user_id: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    assigned_reviewer_id: Optional[str] = None
    assigned_reviewer_name: Optional[str] = None
    status: str
    urgency_level: str
    scenario: str
    chief_complaint: Optional[str] = None
    consent_given: bool
    pii_masked: bool
    ai_summary: Optional[Dict[str, Any]] = None
    missing_information: Optional[List[str]] = []
    suggested_follow_ups: Optional[List[str]] = []
    risk_factors: Optional[List[str]] = []
    reviewer_notes: Optional[str] = None
    doctor_disposition: Optional[str] = None
    referral_destination: Optional[str] = None
    referral_note: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages: List[CaseMessageResponse] = []
    documents: List[DocumentResponse] = []

    class Config:
        from_attributes = True

class AuditLogResponse(APIModel):
    id: int
    case_id: Optional[int] = None
    actor_id: str
    actor_name: str
    actor_role: str
    action: str
    details: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

