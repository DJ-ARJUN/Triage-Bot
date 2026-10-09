import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/case/{case_id}")
async def websocket_case_chat(websocket: WebSocket, case_id: int):
    await ws_manager.connect_case(websocket, case_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming ping or client messages
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_case(websocket, case_id)
    except Exception as e:
        logger.warning(f"WebSocket error on case {case_id}: {e}")
        ws_manager.disconnect_case(websocket, case_id)


@router.websocket("/ws/reviewer/notifications")
async def websocket_reviewer_feed(websocket: WebSocket):
    await ws_manager.connect_reviewer(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_reviewer(websocket)
    except Exception as e:
        logger.warning(f"WebSocket reviewer feed error: {e}")
        ws_manager.disconnect_reviewer(websocket)

