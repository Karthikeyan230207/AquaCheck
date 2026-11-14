from concurrent.futures import ProcessPoolExecutor
from multiprocessing import get_context
from typing import Any

from app.config.settings import settings
from app.extraction.ocr_engine import extract_text_from_image, tesseract_ocr
from app.extraction.pdf_extractor import extract_pdf_text


_executor = ProcessPoolExecutor(
	max_workers=settings.max_concurrent_uploads,
	mp_context=get_context("spawn"),
)


def extract_pdf_in_process(pdf_data: bytes) -> dict[str, Any]:
	return _executor.submit(extract_pdf_text, pdf_data).result()


def extract_image_in_process(image_data: bytes) -> str:
	return _executor.submit(
		extract_text_from_image,
		image_data,
		tesseract_ocr,
	).result()
