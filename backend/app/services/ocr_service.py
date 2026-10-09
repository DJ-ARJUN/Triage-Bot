import os
import re
import logging
import shutil
from io import BytesIO
from typing import Dict, Any, List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Standard Indian Clinical Laboratory Reference Ranges
REFERENCE_RANGES = {
    "platelets": {"name": "Platelet Count", "unit": "/mcL", "min": 150000, "max": 450000, "critical_low": 50000},
    "hemoglobin": {"name": "Hemoglobin (Hb)", "unit": "g/dL", "min": 12.0, "max": 16.5, "critical_low": 7.0, "critical_high": 19.0},
    "wbc": {"name": "Total Leucocyte Count (WBC)", "unit": "/mcL", "min": 4000, "max": 11000, "critical_high": 18000, "critical_low": 2500},
    "glucose_fasting": {"name": "Blood Glucose (Fasting)", "unit": "mg/dL", "min": 70, "max": 100, "critical_high": 250, "critical_low": 54},
    "glucose_pp": {"name": "Blood Glucose (Post-Prandial)", "unit": "mg/dL", "min": 90, "max": 140, "critical_high": 300},
    "hba1c": {"name": "Glycated Hemoglobin (HbA1c)", "unit": "%", "min": 4.0, "max": 5.7, "critical_high": 10.0},
    "creatinine": {"name": "Serum Creatinine", "unit": "mg/dL", "min": 0.6, "max": 1.2, "critical_high": 2.5},
    "urea": {"name": "Blood Urea", "unit": "mg/dL", "min": 15, "max": 40, "critical_high": 90},
    "spo2": {"name": "Oxygen Saturation (SpO2)", "unit": "%", "min": 95, "max": 100, "critical_low": 90},
    "dengue_ns1": {"name": "Dengue NS1 Antigen", "unit": "qualitative"},
    "dengue_igm": {"name": "Dengue IgM Antibodies", "unit": "qualitative"}
}


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract digital PDF text and OCR pages that contain only scanned images."""
    text_content = []
    try:
        from pypdf import PdfReader

        try:
            import fitz
        except ImportError:
            fitz = None

        reader = PdfReader(pdf_path)
        pdf_document = fitz.open(pdf_path) if fitz else None
        try:
            for page_idx, page in enumerate(reader.pages):
                page_text = (page.extract_text() or "").strip()
                if len(page_text) < 20 and pdf_document:
                    page_text = _ocr_image_bytes(
                        pdf_document[page_idx].get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png")
                    ) or page_text
                if page_text:
                    text_content.append(page_text)
        finally:
            if pdf_document:
                pdf_document.close()
    except Exception as e:
        logger.error(f"PDF extraction error for {pdf_path}: {e}")
    return "\n".join(text_content)


def _configure_tesseract():
    """Find the Tesseract executable, including its common Windows install path."""
    import pytesseract

    executable = os.environ.get("TESSERACT_CMD") or shutil.which("tesseract")
    if not executable and os.name == "nt":
        windows_install = Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Tesseract-OCR" / "tesseract.exe"
        if windows_install.is_file():
            executable = str(windows_install)
    if executable:
        pytesseract.pytesseract.tesseract_cmd = executable
    return pytesseract


def _ocr_image_bytes(image_bytes: bytes) -> str:
    """OCR image bytes after orientation correction and basic contrast cleanup."""
    try:
        from PIL import Image, ImageOps

        pytesseract = _configure_tesseract()
        with Image.open(BytesIO(image_bytes)) as source:
            image = ImageOps.exif_transpose(source).convert("L")
            image = ImageOps.autocontrast(image)
            if image.width < 1600:
                scale = 1600 / image.width
                image = image.resize((1600, int(image.height * scale)))
            return pytesseract.image_to_string(image, lang="eng", config="--psm 6").strip()
    except Exception as e:
        logger.warning(f"Image OCR unavailable or failed: {e}")
        return ""


def extract_text_from_image(image_path: str) -> str:
    """Extract text from a report photo with Tesseract OCR."""
    try:
        with open(image_path, "rb") as image_file:
            return _ocr_image_bytes(image_file.read())
    except Exception as e:
        logger.error(f"Image OCR error for {image_path}: {e}")
        return ""


def parse_structured_lab_data(raw_text: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse raw clinical text into structured lab records and clinical urgency alerts.
    """
    structured_labs = []
    clinical_flags = []

    # Regex patterns for common tests
    patterns = [
        (
            r"platelet[s]?\s*(?:count)?[:\s\-=]*([\d,]+)",
            "platelets",
            "Platelet Count",
            "/mcL"
        ),
        (
            r"(?:hemoglobin|hb)\b[:\s\-=]*([\d\.]+)",
            "hemoglobin",
            "Hemoglobin (Hb)",
            "g/dL"
        ),
        (
            r"(?:tlc|total\s+leucocyte\s+count|wbc)\b[:\s\-=]*([\d,]+)",
            "wbc",
            "Total Leucocyte Count (WBC)",
            "/mcL"
        ),
        (
            r"(?:fasting\s+(?:blood\s+)?(?:sugar|glucose)|fbs)\b[:\s\-=]*([\d\.]+)",
            "glucose_fasting",
            "Fasting Blood Sugar",
            "mg/dL"
        ),
        (
            r"(?:pp\s+(?:blood\s+)?(?:sugar|glucose)|post-prandial\s+glucose)\b[:\s\-=]*([\d\.]+)",
            "glucose_pp",
            "Post-Prandial Blood Sugar",
            "mg/dL"
        ),
        (
            r"hba1c\b[:\s\-=]*([\d\.]+)",
            "hba1c",
            "HbA1c",
            "%"
        ),
        (
            r"(?:serum\s+)?creatinine\b[:\s\-=]*([\d\.]+)",
            "creatinine",
            "Serum Creatinine",
            "mg/dL"
        ),
        (
            r"(?:spo2|oxygen\s+saturation)\b[:\s\-=]*([\d\.]+)",
            "spo2",
            "Oxygen Saturation (SpO2)",
            "%"
        )
    ]

    text_lower = raw_text.lower()

    for regex_pat, key, test_title, unit in patterns:
        match = re.search(regex_pat, text_lower)
        if match:
            raw_val_str = match.group(1).replace(",", "").strip()
            try:
                val = float(raw_val_str)
                ref = REFERENCE_RANGES.get(key, {})
                status = "NORMAL"

                if "critical_low" in ref and val <= ref["critical_low"]:
                    status = "CRITICAL"
                    clinical_flags.append(f"CRITICAL LOW: {test_title} is {val:,.0f if val > 100 else val} {unit} (Immediate Attention)")
                elif "critical_high" in ref and val >= ref["critical_high"]:
                    status = "CRITICAL"
                    clinical_flags.append(f"CRITICAL HIGH: {test_title} is {val:,.0f if val > 100 else val} {unit} (Immediate Attention)")
                elif "min" in ref and val < ref["min"]:
                    status = "LOW"
                elif "max" in ref and val > ref["max"]:
                    status = "HIGH"

                ref_range_str = f"{ref.get('min', '')} - {ref.get('max', '')} {unit}".strip()

                structured_labs.append({
                    "test_name": test_title,
                    "value": f"{val:,.0f}" if val > 100 else f"{val}",
                    "unit": unit,
                    "status": status,
                    "reference_range": ref_range_str
                })
            except ValueError:
                pass

    # Check qualitative dengue tests
    if "dengue ns1" in text_lower:
        if "positive" in text_lower or "reactive" in text_lower:
            structured_labs.append({
                "test_name": "Dengue NS1 Antigen",
                "value": "POSITIVE (Reactive)",
                "unit": "",
                "status": "CRITICAL",
                "reference_range": "Negative"
            })
            clinical_flags.append("Dengue NS1 Antigen Positive detected on lab report")

    if "dengue igm" in text_lower:
        if "positive" in text_lower or "reactive" in text_lower:
            structured_labs.append({
                "test_name": "Dengue IgM Antibody",
                "value": "POSITIVE (Reactive)",
                "unit": "",
                "status": "HIGH",
                "reference_range": "Negative"
            })
            clinical_flags.append("Dengue IgM Antibodies Positive")

    # Check chest X-ray findings
    if "infiltrates" in text_lower or "consolidation" in text_lower or "pneumonitis" in text_lower:
        clinical_flags.append("Radiology Flag: Pulmonary infiltrates / consolidation detected on chest report")

    return structured_labs, clinical_flags


def process_medical_report(file_path: str, mime_type: str) -> Dict[str, Any]:
    """
    Full pipeline to extract text, parse clinical values, and generate alerts.
    """
    raw_text = ""
    if "pdf" in mime_type.lower() or file_path.lower().endswith(".pdf"):
        raw_text = extract_text_from_pdf(file_path)
    else:
        raw_text = extract_text_from_image(file_path)

    extracted = bool(raw_text.strip())
    if not extracted:
        raw_text = "No readable text was extracted. Upload a sharper, well-lit image or a text-based PDF."

    structured_data, flags = parse_structured_lab_data(raw_text)

    return {
        "extracted_text": raw_text,
        "structured_lab_data": structured_data,
        "clinical_flags": flags,
        "ocr_status": "COMPLETED" if extracted else "FAILED"
    }

