import json
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # case_id -> list of active WebSockets
        self.case_connections: Dict[int, List[WebSocket]] = {}
        # general reviewer broadcast connections
        self.reviewer_connections: List[WebSocket] = []

    async def connect_case(self, websocket: WebSocket, case_id: int):
        await websocket.accept()
        if case_id not in self.case_connections:
            self.case_connections[case_id] = []
        self.case_connections[case_id].append(websocket)
        logger.info(f"WebSocket connected to case {case_id}")

    def disconnect_case(self, websocket: WebSocket, case_id: int):
        if case_id in self.case_connections:
            if websocket in self.case_connections[case_id]:
                self.case_connections[case_id].remove(websocket)
            if not self.case_connections[case_id]:
                del self.case_connections[case_id]
        logger.info(f"WebSocket disconnected from case {case_id}")

    async def connect_reviewer(self, websocket: WebSocket):
        await websocket.accept()
        self.reviewer_connections.append(websocket)
        logger.info("Reviewer connected to global notifications WebSocket")

    def disconnect_reviewer(self, websocket: WebSocket):
        if websocket in self.reviewer_connections:
            self.reviewer_connections.remove(websocket)

    async def broadcast_to_case(self, case_id: int, message: dict):
        """Send message to all clients watching this case (patient mobile & reviewer web)."""
        payload = json.dumps(message)
        if case_id in self.case_connections:
            for connection in self.case_connections[case_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.warning(f"Error broadcasting to case {case_id}: {e}")
        # Notify reviewer dashboards without sending clinical content over the
        # global socket. They refresh details through their authenticated API.
        await self.broadcast_to_reviewers({"event": "CASE_UPDATED", "case_id": case_id})

    async def broadcast_to_reviewers(self, message: dict):
        """Send new case alert or urgent status update to all reviewer dashboards."""
        payload = json.dumps(message)
        for connection in self.reviewer_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting to reviewers: {e}")

ws_manager = ConnectionManager()

