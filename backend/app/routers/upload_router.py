import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Case, MedicalDocument, CaseMessage, AuditLog, User
from app.schemas import DocumentResponse
from app.auth import get_current_user
from app.services.ocr_service import process_medical_report
from app.services.triage_service import generate_ai_triage_summary
from app.services.voice_service import transcribe_audio_file
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/upload", tags=["Uploads & Multimodal OCR"])

ALLOWED_DOC_EXTS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_AUDIO_EXTS = {".m4a", ".mp3", ".wav", ".ogg", ".webm"}


@router.post("/report", response_model=DocumentResponse)
async def upload_medical_report(
    case_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a medical report inside the guided chat.
    Runs automated OCR extraction, parses structured lab data,
    re-computes AI triage urgency, and broadcasts to reviewer dashboard.
    """
    stmt = (
        select(Case)
        .options(selectinload(Case.messages), selectinload(Case.documents))
        .where(Case.id == case_id)
    )
    res = await db.execute(stmt)
    case_obj = res.scalars().first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")

    filename = file.filename or "medical-report.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_DOC_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {ext}. Supported types: PDF, PNG, JPG, JPEG."
        )

    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Execute OCR and clinical extraction
    ocr_result = process_medical_report(file_path, file.content_type or "")

    # Store document record in DB
    doc = MedicalDocument(
        case_id=case_id,
        patient_id=case_obj.patient_user_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        ocr_status=ocr_result["ocr_status"],
        extracted_text=ocr_result["extracted_text"],
        structured_lab_data=ocr_result["structured_lab_data"],
        clinical_flags=ocr_result["clinical_flags"]
    )
    db.add(doc)
    await db.flush()

    # Also log an in-chat message that a report was uploaded
    msg = CaseMessage(
        case_id=case_obj.id,
        sender_type="patient",
        sender_id=current_user.user_id,
        sender_name=current_user.full_name,
        question_id="report_upload_attachment",
        question_text="Uploaded Medical Diagnostic Report",
        answer_text=f"Uploaded report: {file.filename} (OCR Processed)",
        input_type="upload",
        attachment_type="document" if ext == ".pdf" else "image",
        attachment_url=f"/api/upload/file/{unique_filename}"
    )
    db.add(msg)

    # Re-evaluate AI triage with new lab data
    all_msgs_res = await db.execute(
        select(CaseMessage).where(CaseMessage.case_id == case_obj.id).order_by(CaseMessage.id)
    )
    all_msgs = all_msgs_res.scalars().all()

    # Refresh documents
    all_docs_res = await db.execute(
        select(MedicalDocument).where(MedicalDocument.case_id == case_obj.id)
    )
    all_docs = all_docs_res.scalars().all()

    answers_dicts = [
        {"question_id": m.question_id, "question_text": m.question_text, "answer_text": m.answer_text}
        for m in all_msgs if m.sender_type == "patient"
    ]
    docs_dicts = [
        {"clinical_flags": d.clinical_flags, "structured_lab_data": d.structured_lab_data}
        for d in all_docs
    ]

    summary = await generate_ai_triage_summary(
        {"age": case_obj.patient_age, "gender": case_obj.patient_gender},
        answers_dicts,
        docs_dicts,
        case_obj.scenario
    )

    case_obj.ai_summary = summary
    case_obj.urgency_level = summary.get("urgency_assessment", case_obj.urgency_level)
    case_obj.missing_information = summary.get("missing_clinical_info", [])
    case_obj.suggested_follow_ups = summary.get("suggested_follow_ups", [])

    # Audit log
    audit = AuditLog(
        case_id=case_id,
        actor_id=current_user.user_id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="REPORT_UPLOADED_AND_OCR_PROCESSED",
        details=f"Uploaded {file.filename}. OCR extracted {len(ocr_result['structured_lab_data'])} parameters. Flags: {len(ocr_result['clinical_flags'])}"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(doc)

    # Broadcast via WebSocket
    await ws_manager.broadcast_to_case(case_obj.id, {
        "event": "REPORT_PROCESSED",
        "case_id": case_obj.id,
        "filename": file.filename,
        "clinical_flags": ocr_result["clinical_flags"],
        "structured_lab_data": ocr_result["structured_lab_data"],
        "urgency_level": case_obj.urgency_level
    })

    return doc


@router.post("/voice")
async def upload_voice_recording(
    case_id: int = Form(...),
    language: str = Form("en"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe a patient's uploaded voice note without retaining the audio file."""
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalars().first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.role == "patient" and case_obj.patient_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You do not have access to this case.")

    filename = file.filename or "voice-note.m4a"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_AUDIO_EXTS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio type. Supported types: M4A, MP3, WAV, OGG, and WEBM.",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    audio_data = await file.read(max_bytes + 1)
    if len(audio_data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Audio must be smaller than {settings.MAX_UPLOAD_SIZE_MB} MB.")
    if not audio_data:
        raise HTTPException(status_code=400, detail="The audio recording is empty.")

    transcription_data = await transcribe_audio_file(
        audio_data,
        filename,
        language if language in {"en", "hi"} else "en",
    )
    return {
        "status": "success",
        **transcription_data
    }


@router.get("/file/{filename}")
async def serve_uploaded_file(filename: str):
    """Secure file access endpoint."""
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        sample_path = os.path.join(settings.SAMPLE_REPORTS_DIR, filename)
        if os.path.exists(sample_path):
            file_path = sample_path
        else:
            raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)


@router.get("/samples")
async def list_sample_reports():
    """List pre-configured synthetic medical reports ready for instant testing."""
    return [
        {
            "id": "sample_dengue_cbc",
            "title": "Complete Blood Count (Severe Dengue Thrombocytopenia)",
            "scenario": "CAMPUS_FEVER",
            "filename": "sample_cbc_dengue.pdf",
            "description": "Platelet Count: 42,000 /mcL (Critical Low), NS1 Positive, Leucopenia."
        },
        {
            "id": "sample_diabetes_panel",
            "title": "Diabetes Glycemic Profile & Renal Function",
            "scenario": "CHRONIC_CARE",
            "filename": "sample_diabetes_hba1c.pdf",
            "description": "Fasting Sugar: 218 mg/dL, HbA1c: 10.4%, Serum Creatinine: 1.4 mg/dL."
        },
        {
            "id": "sample_chest_xray",
            "title": "Chest X-Ray PA Radiology Summary",
            "scenario": "OPD_QUEUE",
            "filename": "sample_chest_xray_report.pdf",
            "description": "Right lower zone consolidation / acute pneumonitis."
        }
    ]

