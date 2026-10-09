import asyncio
import logging
import os
import tempfile
import threading
from typing import Any, Dict

from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

_model = None
_model_lock = threading.Lock()
_model_state = "not_started"


def _get_model():
    """Load the multilingual Whisper model once, on the backend computer."""
    global _model
    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model
        try:
            from faster_whisper import WhisperModel
        except ImportError as error:
            raise RuntimeError(
                "Install backend requirements to enable local voice transcription."
            ) from error

        model_size = settings.WHISPER_MODEL_SIZE
        logger.info("Loading local Whisper %s model (first run downloads it)", model_size)
        _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        logger.info("Local Whisper model is ready")
        return _model


def load_local_model():
    """Load Whisper in the background while the API remains available."""
    global _model_state
    _model_state = "loading"
    try:
        model = _get_model()
    except Exception:
        _model_state = "failed"
        raise
    _model_state = "ready"
    return model


def get_voice_model_status() -> str:
    return _model_state


def _transcribe(audio_data: bytes, filename: str, language: str) -> Dict[str, Any]:
    try:
        model = _get_model()
    except Exception as error:
        logger.exception("Could not load local voice transcription model")
        raise HTTPException(
            status_code=503,
            detail=(
                "Local voice transcription could not start. Install faster-whisper "
                "and allow the model to download on the first run."
            ),
        ) from error

    suffix = os.path.splitext(filename)[1].lower() or ".m4a"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="triage_voice_", suffix=suffix, delete=False) as audio_file:
            audio_file.write(audio_data)
            temp_path = audio_file.name

        segments, info = model.transcribe(
            temp_path,
            language=language if language in {"en", "hi"} else None,
            beam_size=3,
            vad_filter=True,
        )
        transcription = " ".join(segment.text.strip() for segment in segments).strip()
    except Exception as error:
        logger.exception("Could not transcribe uploaded voice recording")
        raise HTTPException(
            status_code=422,
            detail="Could not read this recording. Try recording again in a quiet place.",
        ) from error
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    if not transcription:
        raise HTTPException(status_code=422, detail="No speech was recognized in the recording.")

    return {
        "transcription": transcription,
        "detected_language": info.language,
    }


async def transcribe_audio_file(
    audio_data: bytes,
    filename: str,
    language: str = "en",
) -> Dict[str, Any]:
    """Transcribe locally; recordings are not sent to an external speech API."""
    if not audio_data:
        raise HTTPException(status_code=400, detail="The audio recording is empty.")
    if _model_state != "ready":
        if _model_state == "failed":
            detail = "The local voice model failed to load. Check the backend terminal and restart the backend."
        else:
            detail = "The local voice model is still loading. Try voice transcription again when the backend says it is ready."
        raise HTTPException(status_code=503, detail=detail)
    return await asyncio.to_thread(_transcribe, audio_data, filename, language)
