from concurrent.futures import ThreadPoolExecutor
from collections.abc import Callable
from dataclasses import dataclass
import logging
from threading import BoundedSemaphore, Lock
import time
from typing import Literal
from uuid import uuid4

from app.config.settings import settings
from app.schemas.report import ReportAnalysisResponse


logger = logging.getLogger(__name__)
JobStatus = Literal["queued", "processing", "completed", "failed"]
JOB_RETENTION_SECONDS = 60 * 60
MAX_RETAINED_JOBS = 1000


class AnalysisJobCapacityError(RuntimeError):
	"""Raised when the in-process report worker pool has no available slot."""


class AnalysisJobError(Exception):
	def __init__(self, status_code: int, detail: str) -> None:
		super().__init__(detail)
		self.status_code = status_code
		self.detail = detail


@dataclass
class _AnalysisJob:
	job_id: str
	owner_id: str | None
	status: JobStatus
	result: ReportAnalysisResponse | None = None
	error: str | None = None
	error_code: int | None = None
	finished_at: float | None = None


@dataclass(frozen=True)
class AnalysisJobSnapshot:
	job_id: str
	status: JobStatus
	result: ReportAnalysisResponse | None
	error: str | None
	error_code: int | None


_lock = Lock()
_slots = BoundedSemaphore(settings.max_concurrent_uploads)
_executor = ThreadPoolExecutor(
	max_workers=settings.max_concurrent_uploads,
	thread_name_prefix="report-analysis",
)
_jobs: dict[str, _AnalysisJob] = {}


def _prune_jobs(now: float) -> None:
	finished = sorted(
		(
			job
			for job in _jobs.values()
			if job.finished_at is not None
		),
		key=lambda job: job.finished_at or 0,
	)
	for job in finished:
		if job.finished_at is not None and now - job.finished_at > JOB_RETENTION_SECONDS:
			_jobs.pop(job.job_id, None)

	finished = sorted(
		(
			job
			for job in _jobs.values()
			if job.finished_at is not None
		),
		key=lambda job: job.finished_at or 0,
	)
	while len(_jobs) >= MAX_RETAINED_JOBS and finished:
		oldest = finished.pop(0)
		_jobs.pop(oldest.job_id, None)


def _snapshot(job: _AnalysisJob) -> AnalysisJobSnapshot:
	return AnalysisJobSnapshot(
		job_id=job.job_id,
		status=job.status,
		result=job.result,
		error=job.error,
		error_code=job.error_code,
	)


def _run_job(
	job_id: str,
	worker: Callable[..., ReportAnalysisResponse],
	arguments: tuple[object, ...],
) -> None:
	with _lock:
		job = _jobs.get(job_id)
		if job is None:
			_slots.release()
			return
		job.status = "processing"

	try:
		result = worker(*arguments)
	except AnalysisJobError as error:
		with _lock:
			job.status = "failed"
			job.error = error.detail
			job.error_code = error.status_code
			job.finished_at = time.monotonic()
	except Exception:
		logger.exception("Background report analysis failed (job_id=%s)", job_id)
		with _lock:
			job.status = "failed"
			job.error = "Analysis could not be completed. Please try again."
			job.error_code = 500
			job.finished_at = time.monotonic()
	else:
		with _lock:
			job.status = "completed"
			job.result = result
			job.finished_at = time.monotonic()
	finally:
		_slots.release()


def submit_analysis_job(
	owner_id: str | None,
	worker: Callable[..., ReportAnalysisResponse],
	*arguments: object,
) -> AnalysisJobSnapshot:
	if not _slots.acquire(blocking=False):
		raise AnalysisJobCapacityError("The report analysis worker pool is full.")

	job = _AnalysisJob(
		job_id=str(uuid4()),
		owner_id=owner_id,
		status="queued",
	)
	with _lock:
		_prune_jobs(time.monotonic())
		_jobs[job.job_id] = job

	try:
		_executor.submit(_run_job, job.job_id, worker, arguments)
	except RuntimeError:
		with _lock:
			_jobs.pop(job.job_id, None)
		_slots.release()
		raise

	with _lock:
		return _snapshot(job)


def get_analysis_job(
	job_id: str,
	owner_id: str | None,
) -> AnalysisJobSnapshot | None:
	with _lock:
		_prune_jobs(time.monotonic())
		job = _jobs.get(job_id)
		if job is None or job.owner_id != owner_id:
			return None
		return _snapshot(job)
