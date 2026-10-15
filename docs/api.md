# API

The FastAPI service runs locally at `http://localhost:8000`; interactive API
documentation is available at `/docs`.

## Analyze a PDF or image

`POST /api/reports/analyze`

Send a multipart form request with one `file` field containing a PDF, JPG,
JPEG, or PNG image. The API extracts embedded PDF text where available, applies
Tesseract OCR to scanned PDF pages and uploaded images, parses supported
labeled measurements, validates them, and returns the analysis:

```json
{
  "report_id": "generated-id",
  "filename": "water-report.pdf",
  "content_type": "application/pdf",
  "size_bytes": 1234,
  "page_count": 1,
  "extracted_parameters": [
    {"parameter": "pH", "value": 7.0, "unit": ""}
  ],
  "analysis": {
    "parameters": [],
    "overall_score": null,
    "score_method": "...",
    "recommendations": []
  }
}
```

The response's `analysis.parameters` contains each extracted measurement and
its classification. The score is unavailable unless at least three values can
be scored. Supported parameter names include pH, TDS, turbidity, total
hardness, chloride, fluoride, nitrate, and iron.

The endpoint extracts embedded text and uses Tesseract OCR for PDF pages without
embedded text and for uploaded images. Install the Tesseract executable on the
backend host in addition to installing `backend/requirements.txt`. Tesseract
must be on `PATH`, or set `OCR_TESSERACT_CMD` in the backend environment to its
executable path. The optional `OCR_LANGUAGE` setting defaults to `eng` and
requires the corresponding Tesseract language data to be installed; `OCR_DPI`
controls scanned-page rendering and defaults to `200`. If the OCR executable
or language data is unavailable, analysis returns `503 Service Unavailable`.
Unreadable files or reports without supported labeled measurements return
`422 Unprocessable Entity` instead of an empty successful analysis.

When the frontend user is signed in, it sends the Supabase access token in an
`Authorization: Bearer <token>` header. The backend verifies the token with
Supabase Auth, then saves report metadata, extracted measurements, and the
analysis result in MongoDB Atlas under the verified user ID. The uploaded report file
itself is not retained. Anonymous requests still return an analysis but do not
persist it. A saved response has `saved_to_history: true`.

## Other endpoints

- `GET /` and `GET /api/health` — service health checks.
- `POST /api/reports/upload` — validates and accepts a supported PDF or image
  upload and returns temporary upload metadata; it does not persist the file.
- `POST /api/analysis/analyze` — analyzes a JSON body containing validated
  parameters.
- `POST /api/ai/explain` — formats a supplied analysis into a deterministic,
  plain-language explanation using its reported values, statuses, and ranges.
- `GET /api/reports?limit=50` — lists saved reports for the authenticated user.
  `limit` must be between 1 and 100.
- `GET /api/reports/{report_id}` — returns one saved report belonging to the
  authenticated user. Reports owned by another user are returned as not found.

The two report-read endpoints require a valid Supabase bearer access token.
The backend requires `SUPABASE_URL` and `SUPABASE_KEY` to validate it, and
`MONGODB_URI` to access Atlas. Database credentials stay on the backend.

Explanations use local rule-based formatting; they do not require Ollama, a
model download, or a hosted AI service. The explanation describes only the
values and classifications included in the supplied analysis and is not a
determination that water is safe to drink.