import datetime
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Case, CaseMessage, MedicalDocument, AuditLog, User
from app.schemas import (
    CaseCreateRequest, CaseUpdateRequest, FollowUpQuestionRequest,
    AnswerSubmissionRequest, CaseListResponse, CaseDetailResponse,
    CaseMessageResponse, AuditLogResponse
)
from app.auth import get_current_user, require_reviewer, require_patient
from app.services.triage_service import generate_ai_triage_summary
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/cases", tags=["Cases & Triage Management"])

def generate_case_number() -> str:
    year = datetime.datetime.utcnow().year
    rand = random.randint(1000, 9999)
    return f"CASE-{year}-{rand}"


@router.post("", response_model=CaseDetailResponse)
async def create_new_case(
    req: CaseCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    """Start a new triage case for the authenticated patient."""
    case_num = generate_case_number()
    
    new_case = Case(
        case_number=case_num,
        patient_user_id=current_user.user_id,
        patient_name=current_user.full_name,
        patient_age=current_user.age,
        patient_gender=current_user.gender,
        scenario=req.scenario,
        consent_given=req.consent_given,
        pii_masked=True,
        status="NEW",
        urgency_level="ROUTINE"
    )
    db.add(new_case)
    await db.flush()

    # Log audit event
    audit = AuditLog(
        case_id=new_case.id,
        actor_id=current_user.user_id,
        actor_name=current_user.full_name,
        actor_role="patient",
        action="CASE_CREATED",
        details=f"Created case {case_num} under scenario {req.scenario}. Consent recorded: {req.consent_given}"
    )
    db.add(audit)
    await db.commit()

    # Reload with relationships
    stmt = (
        select(Case)
        .options(selectinload(Case.messages), selectinload(Case.documents))
        .where(Case.id == new_case.id)
    )
    res = await db.execute(stmt)
    full_case = res.scalars().first()

    # Broadcast to reviewers
    await ws_manager.broadcast_to_reviewers({
        "event": "NEW_CASE_CREATED",
        "case_id": full_case.id,
        "case_number": full_case.case_number,
        "scenario": full_case.scenario,
        "patient_name": full_case.patient_name
    })

    return full_case


@router.get("", response_model=List[CaseListResponse])
async def list_cases(
    status_filter: Optional[str] = None,
    urgency_filter: Optional[str] = None,
    scenario_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List cases:
    - If Patient: only their own cases.
    - If Reviewer: all institute triage cases prioritized by urgency.
    """
    stmt = select(Case).options(selectinload(Case.messages), selectinload(Case.documents))
    
    if current_user.role == "patient":
        stmt = stmt.where(Case.patient_user_id == current_user.user_id)
    else:
        # Reviewer filters
        if status_filter:
            stmt = stmt.where(Case.status == status_filter)
        if urgency_filter:
            stmt = stmt.where(Case.urgency_level == urgency_filter)
        if scenario_filter:
            stmt = stmt.where(Case.scenario == scenario_filter)

    # Sort: Reviewers see high urgency first, then most recent
    stmt = stmt.order_by(desc(Case.updated_at))
    res = await db.execute(stmt)
    cases = res.scalars().all()

    response_list = []
    for c in cases:
        response_list.append(CaseListResponse(
            id=c.id,
            case_number=c.case_number,
            patient_user_id=c.patient_user_id,
            patient_name=c.patient_name,
            patient_age=c.patient_age,
            patient_gender=c.patient_gender,
            assigned_reviewer_id=c.assigned_reviewer_id,
            assigned_reviewer_name=c.assigned_reviewer_name,
            status=c.status,
            urgency_level=c.urgency_level,
            scenario=c.scenario,
            chief_complaint=c.chief_complaint,
            referral_destination=c.referral_destination,
            created_at=c.created_at,
            updated_at=c.updated_at,
            documents_count=len(c.documents),
            messages_count=len(c.messages)
        ))
    return response_list


@router.get("/{case_id}", response_model=CaseDetailResponse)
async def get_case_detail(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Case)
        .options(selectinload(Case.messages), selectinload(Case.documents))
        .where(Case.id == case_id)
    )
    res = await db.execute(stmt)
    case_obj = res.scalars().first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")

    # Authorization check
    if current_user.role == "patient" and case_obj.patient_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this case")

    # Audit log access by reviewer
    if current_user.role in ["reviewer", "admin"]:
        audit = AuditLog(
            case_id=case_id,
            actor_id=current_user.user_id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            action="REVIEWER_VIEWED_CASE",
            details=f"Reviewer accessed case records for {case_obj.case_number}"
        )
        db.add(audit)
        await db.commit()

    return case_obj


@router.post("/answer", response_model=CaseDetailResponse)
async def submit_patient_answer(
    req: AnswerSubmissionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    """
    Patient submits an answer or selects predefined option.
    Stored permanently in DB and updates active case triage.
    """
    stmt = (
        select(Case)
        .options(selectinload(Case.messages), selectinload(Case.documents))
        .where(Case.id == req.case_id)
    )
    res = await db.execute(stmt)
    case_obj = res.scalars().first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")

    if case_obj.patient_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Save the question & answer message
    msg = CaseMessage(
        case_id=case_obj.id,
        sender_type="patient",
        sender_id=current_user.user_id,
        sender_name=current_user.full_name,
        question_id=req.question_id,
        question_text=req.question_text,
        question_text_hi=req.question_text_hi,
        answer_text=req.answer_text,
        answer_options_selected=req.answer_options_selected,
        input_type=req.input_type,
        attachment_url=req.attachment_url,
        attachment_type=req.attachment_type
    )
    db.add(msg)
    await db.flush()

    # Update chief complaint if this was the chief complaint question
    if "complaint" in req.question_id or "hazard" in req.question_id:
        case_obj.chief_complaint = req.answer_text

    # Reload all messages for AI summary recalculation
    all_msgs_res = await db.execute(
        select(CaseMessage).where(CaseMessage.case_id == case_obj.id).order_by(CaseMessage.id)
    )
    all_msgs = all_msgs_res.scalars().all()

    # Re-run AI triage summarization
    answers_dicts = [
        {
            "question_id": m.question_id,
            "question_text": m.question_text,
            "answer_text": m.answer_text,
            "answer_options_selected": m.answer_options_selected
        }
        for m in all_msgs if m.sender_type == "patient"
    ]
    docs_dicts = [
        {
            "clinical_flags": d.clinical_flags,
            "structured_lab_data": d.structured_lab_data
        }
        for d in case_obj.documents
    ]

    patient_meta = {"age": case_obj.patient_age, "gender": case_obj.patient_gender}
    summary = await generate_ai_triage_summary(patient_meta, answers_dicts, docs_dicts, case_obj.scenario)

    case_obj.ai_summary = summary
    case_obj.urgency_level = summary.get("urgency_assessment", case_obj.urgency_level)
    case_obj.missing_information = summary.get("missing_clinical_info", [])
    case_obj.suggested_follow_ups = summary.get("suggested_follow_ups", [])
    case_obj.status = "TRIAGED_BY_AI"
    case_obj.updated_at = datetime.datetime.utcnow()

    await db.commit()

    # Broadcast update via WebSocket to mobile patient and reviewer web
    await ws_manager.broadcast_to_case(case_obj.id, {
        "event": "PATIENT_ANSWERED",
        "case_id": case_obj.id,
        "question_id": req.question_id,
        "answer_text": req.answer_text,
        "urgency_level": case_obj.urgency_level,
        "ai_summary": summary
    })

    # Return refreshed case
    res_updated = await db.execute(stmt)
    return res_updated.scalars().first()


@router.post("/{case_id}/follow-up", response_model=CaseDetailResponse)
async def ask_follow_up_question(
    case_id: int,
    req: FollowUpQuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """
    Reviewer sends a targeted follow-up question to the patient.
    Appears directly in patient's mobile app chat!
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

    # Create message from Reviewer
    msg = CaseMessage(
        case_id=case_obj.id,
        sender_type="reviewer",
        sender_id=current_user.user_id,
        sender_name=current_user.full_name,
        question_id=f"rev_followup_{int(datetime.datetime.utcnow().timestamp())}",
        question_text=req.question_text,
        question_text_hi=req.question_text_hi,
        answer_text=None,
        input_type="text"
    )
    db.add(msg)

    # Set status to FOLLOW_UP_REQUESTED
    case_obj.status = "FOLLOW_UP_REQUESTED"
    if not case_obj.assigned_reviewer_id:
        case_obj.assigned_reviewer_id = current_user.user_id
        case_obj.assigned_reviewer_name = current_user.full_name

    # Audit log
    audit = AuditLog(
        case_id=case_id,
        actor_id=current_user.user_id,
        actor_name=current_user.full_name,
        actor_role="reviewer",
        action="FOLLOW_UP_QUESTION_SENT",
        details=f"Reviewer sent follow-up question: '{req.question_text}'"
    )
    db.add(audit)
    await db.commit()

    # Broadcast via WebSocket to patient's device
    await ws_manager.broadcast_to_case(case_obj.id, {
        "event": "REVIEWER_FOLLOW_UP",
        "case_id": case_obj.id,
        "reviewer_name": current_user.full_name,
        "question_text": req.question_text,
        "question_text_hi": req.question_text_hi
    })

    res_refreshed = await db.execute(stmt)
    return res_refreshed.scalars().first()


@router.patch("/{case_id}/review", response_model=CaseDetailResponse)
async def update_reviewer_action(
    case_id: int,
    req: CaseUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """
    Reviewer updates urgency, assigns doctor, adds clinical notes, or refers patient.
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

    actions_taken = []
    if req.urgency_level:
        case_obj.urgency_level = req.urgency_level
        actions_taken.append(f"Urgency set to {req.urgency_level}")
    if req.status:
        case_obj.status = req.status
        actions_taken.append(f"Status changed to {req.status}")
    if req.assigned_reviewer_id:
        rev_res = await db.execute(select(User).where(User.user_id == req.assigned_reviewer_id))
        rev = rev_res.scalars().first()
        case_obj.assigned_reviewer_id = req.assigned_reviewer_id
        case_obj.assigned_reviewer_name = rev.full_name if rev else req.assigned_reviewer_id
        actions_taken.append(f"Assigned to {case_obj.assigned_reviewer_name}")
    elif not case_obj.assigned_reviewer_id:
        case_obj.assigned_reviewer_id = current_user.user_id
        case_obj.assigned_reviewer_name = current_user.full_name

    if req.reviewer_notes:
        case_obj.reviewer_notes = req.reviewer_notes
        actions_taken.append("Added clinical reviewer notes")
    if req.doctor_disposition:
        case_obj.doctor_disposition = req.doctor_disposition
        actions_taken.append(f"Disposition: {req.doctor_disposition}")
    if req.referral_destination:
        case_obj.referral_destination = req.referral_destination
        case_obj.referral_note = (
            f"REFERRAL HANDOFF SLIP\n"
            f"Date: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')}\n"
            f"Patient ID: {case_obj.patient_user_id} ({case_obj.patient_name}, {case_obj.patient_age or 'N/A'}y/{case_obj.patient_gender or 'N/A'})\n"
            f"Triage Level: {case_obj.urgency_level}\n"
            f"Chief Complaint: {case_obj.chief_complaint}\n"
            f"Reviewer: {current_user.full_name} ({current_user.user_id})\n"
            f"Destination: {req.referral_destination}\n"
            f"Clinical Notes: {case_obj.reviewer_notes or 'Referral for comprehensive medical evaluation'}\n"
            f"Non-diagnostic triage document."
        )
        case_obj.status = "REFERRED"
        actions_taken.append(f"Generated referral note to {req.referral_destination}")

    case_obj.updated_at = datetime.datetime.utcnow()

    audit = AuditLog(
        case_id=case_id,
        actor_id=current_user.user_id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="REVIEWER_ACTION_TAKEN",
        details="; ".join(actions_taken)
    )
    db.add(audit)
    await db.commit()

    # Broadcast update
    await ws_manager.broadcast_to_case(case_obj.id, {
        "event": "CASE_STATUS_UPDATED",
        "case_id": case_obj.id,
        "status": case_obj.status,
        "urgency_level": case_obj.urgency_level,
        "assigned_reviewer_id": case_obj.assigned_reviewer_id,
        "assigned_reviewer_name": case_obj.assigned_reviewer_name,
        "reviewer_notes": case_obj.reviewer_notes
    })

    res_refreshed = await db.execute(stmt)
    return res_refreshed.scalars().first()


@router.get("/{case_id}/audit-logs", response_model=List[AuditLogResponse])
async def get_case_audit_logs(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Inspect privacy, access events, and clinical audit trail."""
    stmt = select(AuditLog).where(AuditLog.case_id == case_id).order_by(desc(AuditLog.timestamp))
    res = await db.execute(stmt)
    return res.scalars().all()

