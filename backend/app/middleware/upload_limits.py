from threading import BoundedSemaphore

from fastapi import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config.settings import settings


MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024
UPLOAD_PATHS = {"/api/reports/upload", "/api/reports/analyze"}
upload_slots = BoundedSemaphore(settings.max_concurrent_uploads)


class UploadLimitMiddleware:
	def __init__(self, app: ASGIApp) -> None:
		self.app = app

	async def __call__(
		self,
		scope: Scope,
		receive: Receive,
		send: Send,
	) -> None:
		if (
			scope["type"] != "http"
			or scope["method"] != "POST"
			or scope["path"] not in UPLOAD_PATHS
		):
			await self.app(scope, receive, send)
			return

		max_request_bytes = (
			settings.max_upload_size_bytes + MAX_MULTIPART_OVERHEAD_BYTES
		)
		headers = dict(scope.get("headers", []))
		content_length = headers.get(b"content-length")
		if content_length is not None:
			try:
				request_size = int(content_length)
			except ValueError:
				response = JSONResponse(
					status_code=400,
					content={"detail": "Invalid Content-Length header."},
				)
				await response(scope, receive, send)
				return
			if request_size > max_request_bytes:
				response = JSONResponse(
					status_code=413,
					content={"detail": "Uploaded request exceeds the configured size limit."},
				)
				await response(scope, receive, send)
				return

		if not upload_slots.acquire(blocking=False):
			response = JSONResponse(
				status_code=429,
				content={"detail": "Too many uploads are being processed. Try again shortly."},
				headers={"Retry-After": "1"},
			)
			await response(scope, receive, send)
			return

		request_size = 0

		async def limited_receive() -> Message:
			nonlocal request_size
			message = await receive()
			if message["type"] == "http.request":
				request_size += len(message.get("body", b""))
				if request_size > max_request_bytes:
					raise HTTPException(
						status_code=413,
						detail="Uploaded request exceeds the configured size limit.",
					)
			return message

		try:
			await self.app(scope, limited_receive, send)
		finally:
			upload_slots.release()
