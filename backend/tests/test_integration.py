import asyncio
import httpx
from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.seed_data import seed_database

async def test_full_triage_flow():
    await init_db()
    async with AsyncSessionLocal() as s:
        await seed_database(s)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        h = await client.get("/health")
        assert h.status_code == 200
        assert h.json()["status"] == "healthy"

        # 2. Patient Login (Aarav Sharma)
        pl = await client.post("/api/auth/patient-login", json={"patient_id": "PAT-1001", "password": "patient123"})
        assert pl.status_code == 200
        pat_token = pl.json()["access_token"]
        assert pl.json()["user_id"] == "PAT-1001"

        # 3. Reviewer Login (Dr. Rao)
        rl = await client.post("/api/auth/reviewer-login", json={"reviewer_id": "REV-DR-RAO", "password": "doctor123"})
        assert rl.status_code == 200
        rev_token = rl.json()["access_token"]
        assert rl.json()["user_id"] == "REV-DR-RAO"

        # 4. List cases as Reviewer
        cases_res = await client.get("/api/cases", headers={"Authorization": f"Bearer {rev_token}"})
        assert cases_res.status_code == 200
        cases = cases_res.json()
        assert len(cases) >= 4
        print(f"Loaded {len(cases)} cases. Urgency: {cases[0]['urgency_level']}")

        # 5. Check Next Question for Case belonging to PAT-1001
        case_aarav = [c for c in cases if c["patient_user_id"] == "PAT-1001"][0]
        case_id = case_aarav["id"]
        q_res = await client.get(f"/api/questions/next-question?case_id={case_id}")
        assert q_res.status_code == 200

        # 6. Patient Submits Answer
        ans_res = await client.post("/api/cases/answer", headers={"Authorization": f"Bearer {pat_token}"}, json={
            "case_id": case_id,
            "question_id": "fever_followup_hydr",
            "question_text": "Are you drinking fluids?",
            "answer_text": "I am drinking ORS and coconut water, but feeling very weak.",
            "input_type": "text"
        })
        assert ans_res.status_code == 200
        assert ans_res.json()["status"] in ["TRIAGED_BY_AI", "UNDER_REVIEW"]

        # 7. Reviewer Follow-up Question
        fu_res = await client.post(f"/api/cases/{case_id}/follow-up", headers={"Authorization": f"Bearer {rev_token}"}, json={
            "question_text": "Dr. Rao: Are you able to walk to the nearest clinic or do you need an emergency transport?"
        })
        assert fu_res.status_code == 200
        assert fu_res.json()["status"] == "FOLLOW_UP_REQUESTED"

        # 8. Reviewer Action: Set Urgency and Generate Referral Slip
        act_res = await client.patch(f"/api/cases/{case_id}/review", headers={"Authorization": f"Bearer {rev_token}"}, json={
            "urgency_level": "EMERGENCY",
            "reviewer_notes": "Clinical review confirms severe dengue warning signs. Admitted to acute fever stabilization.",
            "referral_destination": "Civil Hospital Emergency Ward"
        })
        assert act_res.status_code == 200
        assert act_res.json()["status"] == "REFERRED"
        assert "REFERRAL HANDOFF SLIP" in act_res.json()["referral_note"]
        print("Integration test passed!")

if __name__ == "__main__":
    asyncio.run(test_full_triage_flow())
