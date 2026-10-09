from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Case, CaseMessage
from app.services.question_service import (
    list_all_scenarios, get_protocol, get_next_question, get_question_by_id
)

router = APIRouter(prefix="/api/questions", tags=["Questions & Protocols"])

@router.get("/scenarios")
async def get_scenarios():
    return list_all_scenarios()

@router.get("/protocol/{scenario}")
async def get_scenario_protocol(scenario: str):
    proto = get_protocol(scenario.upper())
    return proto

@router.get("/next-question")
async def get_next_case_question(
    case_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    case_res = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_res.scalars().first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")

    # Fetch all answered question IDs for this case
    msgs_res = await db.execute(
        select(CaseMessage.question_id).where(
            CaseMessage.case_id == case_id,
            CaseMessage.sender_type == "patient"
        )
    )
    answered_ids = [row[0] for row in msgs_res.all() if row[0]]

    next_q = get_next_question(case_obj.scenario, answered_ids)
    if not next_q:
        return {"completed": True, "message": "All protocol questions have been answered. Triage summary generated."}

    return {"completed": False, "question": next_q}

