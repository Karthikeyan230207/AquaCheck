# API

The FastAPI service runs locally at `http://localhost:8000`; interactive API
documentation is available at `/docs`.

## Analyze a PDF or image

`POST /api/reports/analyze`

Send a multipart form request with one `file` field containing a PDF, JPG,
JPEG, or PNG image. The API returns `202 Accepted` and a job identifier; poll
`GET /api/reports/jobs/{job_id}` for its status:

```json
{
  "job_id": "generated-job-id",
  "status": "queued",
  "result": null,
  "error": null,
  "error_code": null
}
```

Job status is `queued`, `processing`, `completed`, or `failed`. A completed
job includes the original analysis response in `result`; a failed job includes
a user-facing `error` and its HTTP-style status in `error_code`. The in-process
job manager accepts at most three active jobs, and job state is held in memory:
a backend restart discards all jobs, and job records expire after one hour.
PDF extraction and OCR run in spawned worker processes managed by each API
process. Each API process has an independent job store, so run one API process
or use sticky routing for both submission and polling. Signed-in jobs can only
be polled by their owner.

The completed `result.analysis.parameters` contains each extracted measurement
and its classification. The score is unavailable unless at least three values
can be scored. Supported parameter names include pH, TDS, turbidity, total
hardness, chloride, fluoride, nitrate, and iron.

The endpoint extracts embedded text and uses Tesseract OCR for PDF pages without
embedded text and for uploaded images. Install the Tesseract executable on the
backend host in addition to installing `backend/requirements.txt`. Tesseract
must be on `PATH`, or set `OCR_TESSERACT_CMD` in the backend environment to its
executable path. The optional `OCR_LANGUAGE` setting defaults to `eng` and
requires the corresponding Tesseract language data to be installed; `OCR_DPI`
controls scanned-page rendering and defaults to `200`. If the OCR executable
or language data is unavailable, the job fails with an OCR error.
Uploads are limited to 20 MiB, 20 PDF pages, and images up to 8,000 pixels on
either side and 25 megapixels total. OCR subprocesses are limited to 20 seconds
per recognition call, and at most three analysis jobs run concurrently.
These limits can be adjusted with `MAX_UPLOAD_SIZE_BYTES`, `MAX_PDF_PAGES`,
`MAX_IMAGE_DIMENSION_PX`, `MAX_IMAGE_PIXELS`, `OCR_TIMEOUT_SECONDS`, and
`MAX_CONCURRENT_UPLOADS`. Requests exceeding upload size or page/image limits
return `413 Payload Too Large`; OCR timeouts have job `error_code` 504 and
worker saturation returns `429 Too Many Requests` (per backend process).
Unreadable files are rejected, and reports without supported labeled
measurements fail with job `error_code` 422 instead of returning an empty
analysis.

When the frontend user is signed in, it sends the Supabase access token in an
`Authorization: Bearer <token>` header. The backend verifies the token with
Supabase Auth, then saves report metadata, extracted measurements, and the
analysis result in MongoDB Atlas under the verified user ID. The uploaded report file
itself is not retained. Anonymous jobs return an analysis but do not persist
it. A saved job result has `saved_to_history: true`.

## Other endpoints

- `GET /` and `GET /api/health` — service health checks.
- `POST /api/reports/upload` — validates and accepts a supported PDF or image
  upload and returns temporary upload metadata; it does not persist the file.
- `GET /api/reports/jobs/{job_id}` — returns the state and, when complete, the
  result of an analysis job.
- `POST /api/analysis/analyze` — analyzes a JSON body containing validated
  parameters.
- `POST /api/ai/explain` — formats a supplied analysis into a deterministic,
  plain-language explanation using its reported values, statuses, and ranges.
- `GET /api/reports?page=1&page_size=20` — returns one page of saved reports
  for the authenticated user, including `total`, `total_pages`, `has_next`, and
  `has_previous`. `page_size` must be between 1 and 100. The legacy `limit`
  query parameter remains supported.
- `GET /api/reports/{report_id}` — returns one saved report belonging to the
  authenticated user. Reports owned by another user are returned as not found.

The two report-read endpoints require a valid Supabase bearer access token.
The backend requires `SUPABASE_URL` and `SUPABASE_KEY` to validate it, and
`MONGODB_URI` to access Atlas. Database credentials stay on the backend.
MongoDB operations use bounded timeouts: `MONGODB_TIMEOUT_MS` (10,000 ms),
`MONGODB_SERVER_SELECTION_TIMEOUT_MS` (5,000 ms),
`MONGODB_CONNECT_TIMEOUT_MS` (5,000 ms), and
`MONGODB_SOCKET_TIMEOUT_MS` (10,000 ms). Database timeouts are surfaced as
`503 Service Unavailable` errors or failed-job `error_code` 503.

Explanations use local rule-based formatting; they do not require Ollama, a
model download, or a hosted AI service. The explanation describes only the
values and classifications included in the supplied analysis and is not a
determination that water is safe to drink.