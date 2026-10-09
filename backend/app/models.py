import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, nullable=False)  # PAT-1001, REV-DR-SHARMA
    role = Column(String(20), nullable=False)  # 'patient', 'reviewer', 'admin'
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    preferred_language = Column(String(10), default="en")  # 'en', 'hi', etc.
    institute_name = Column(String(100), default="National Institute Health Center")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    cases = relationship("Case", back_populates="patient", foreign_keys="Case.patient_user_id")
    reviewed_cases = relationship("Case", back_populates="reviewer", foreign_keys="Case.assigned_reviewer_id")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)  # CASE-2026-0012
    
    patient_user_id = Column(String(50), ForeignKey("users.user_id"), nullable=False, index=True)
    patient_name = Column(String(100), nullable=False)
    patient_age = Column(Integer, nullable=True)
    patient_gender = Column(String(20), nullable=True)
    
    assigned_reviewer_id = Column(String(50), ForeignKey("users.user_id"), nullable=True, index=True)
    assigned_reviewer_name = Column(String(100), nullable=True)
    
    status = Column(String(30), default="TRIAGED_BY_AI", index=True)
    # Statuses: 'NEW', 'TRIAGED_BY_AI', 'UNDER_REVIEW', 'FOLLOW_UP_REQUESTED', 'ESCALATED', 'RESOLVED', 'REFERRED'
    
    urgency_level = Column(String(20), default="ROUTINE", index=True)
    # Urgencies: 'EMERGENCY', 'URGENT', 'SEMI_URGENT', 'ROUTINE'
    
    scenario = Column(String(50), default="OPD_QUEUE")
    # 'OPD_QUEUE', 'CAMPUS_FEVER', 'OCCUPATIONAL_HEALTH', 'MATERNAL_HEALTH', 'CHRONIC_CARE'
    
    chief_complaint = Column(Text, nullable=True)
    consent_given = Column(Boolean, default=True)
    pii_masked = Column(Boolean, default=True)
    
    # AI Summarization outputs (strictly non-diagnostic)
    ai_summary = Column(JSON, nullable=True)
    missing_information = Column(JSON, default=list)
    suggested_follow_ups = Column(JSON, default=list)
    risk_factors = Column(JSON, default=list)
    
    # Reviewer human-in-the-loop actions
    reviewer_notes = Column(Text, nullable=True)
    doctor_disposition = Column(String(100), nullable=True)  # 'Admit to ER', 'OPD Routine', 'Specialist Referral'
    referral_destination = Column(String(150), nullable=True)
    referral_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_user_id], back_populates="cases")
    reviewer = relationship("User", foreign_keys=[assigned_reviewer_id], back_populates="reviewed_cases")
    messages = relationship("CaseMessage", back_populates="case", cascade="all, delete-orphan", order_by="CaseMessage.id")
    documents = relationship("MedicalDocument", back_populates="case", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")


class CaseMessage(Base):
    __tablename__ = "case_messages"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    
    sender_type = Column(String(20), nullable=False)  # 'system', 'patient', 'reviewer', 'ai'
    sender_id = Column(String(50), nullable=False)
    sender_name = Column(String(100), nullable=False)
    
    question_id = Column(String(50), nullable=True)  # Key from dataset or 'rev_followup'
    question_text = Column(Text, nullable=True)
    question_text_hi = Column(Text, nullable=True)
    
    answer_text = Column(Text, nullable=True)
    answer_options_selected = Column(JSON, nullable=True)  # List of selected options
    input_type = Column(String(30), default="text")  # 'single_choice', 'multi_choice', 'text', 'scale', 'upload'
    
    attachment_type = Column(String(20), nullable=True)  # 'image', 'document', 'audio'
    attachment_url = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    case = relationship("Case", back_populates="messages")


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    patient_id = Column(String(50), nullable=False)
    
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, default=0)
    
    ocr_status = Column(String(20), default="COMPLETED")  # 'PENDING', 'COMPLETED', 'FAILED'
    extracted_text = Column(Text, nullable=True)
    structured_lab_data = Column(JSON, default=list)  # [{"test": "Platelet", "value": 45000, ...}]
    clinical_flags = Column(JSON, default=list)  # ["Severe Thrombocytopenia"]
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    case = relationship("Case", back_populates="documents")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True, index=True)
    actor_id = Column(String(50), nullable=False)
    actor_name = Column(String(100), default="System")
    actor_role = Column(String(20), default="system")
    action = Column(String(50), nullable=False)  # 'CONSENT_RECORDED', 'CASE_CREATED', 'REPORT_UPLOADED', etc.
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    case = relationship("Case", back_populates="audit_logs")

