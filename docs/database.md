# Authentication, database, and deployment

## MongoDB Atlas report storage

The FastAPI backend stores report metadata, extracted measurements, and the
analysis result in the Atlas `reports` collection. Related analysis data is
embedded in its report document because it is loaded and displayed together.
Uploaded PDF bytes are not retained.

Copy `backend/.env.example` to `backend/.env` and configure:

- `MONGODB_URI` — the Atlas connection string. Keep it on the backend only.
- `MONGODB_DATABASE` — database name; defaults to `aquacheck`.
- `SUPABASE_URL` and `SUPABASE_KEY` — the Supabase project URL and public
  anonymous key used by the backend to verify access tokens with Supabase Auth.
- `FRONTEND_ORIGINS` — comma-separated frontend origins allowed by the API.

In Atlas, create a database user with only the privileges the application
needs, and add the deployed backend's outbound IP address to the Atlas network
access list. Do not put the MongoDB connection string in a `NEXT_PUBLIC_`
variable or expose it to browser code. Avoid opening Atlas to all IP addresses
unless you have deliberately evaluated that risk.

The backend creates a compound index on `(user_id, created_at)` for the
history query. Each report document contains:

```text
_id, user_id, filename, content_type, size_bytes, page_count,
extracted_parameters, analysis, created_at
```

The backend verifies the caller's Supabase access token with the Supabase Auth
user endpoint before associating a report with its owner. Both history reads
and report detail lookups filter by that verified user ID. Anonymous users can
still run an analysis, but it is not saved. Never trust a browser-supplied
user ID for report ownership.

## Supabase Auth and frontend configuration

Supabase remains the identity provider; it is not used as the report database.
Copy `frontend/.env.example` to `frontend/.env.local` and set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the
Supabase project. The public anonymous key is intended for browser use; never
put a service-role key in frontend configuration.

Enable email/password authentication in Supabase. Email confirmation settings
control whether a newly registered user must confirm their email before
signing in.

## Global hosting

Atlas provides a globally reachable managed database; it does not host the
website. Deploy the Next.js frontend and FastAPI backend to hosting services
that can run those applications. Configure `NEXT_PUBLIC_API_URL` in the
frontend deployment to the public HTTPS URL of the backend. Set
`FRONTEND_ORIGINS` on the backend to the exact production frontend origin (and
local development origin if needed). Set the Atlas and Supabase credentials
as backend deployment secrets, not as committed files.

The MongoDB client is cached and reused within a running backend process, using
the driver's standard connection-pool defaults. Revisit pool sizing only after
choosing the hosting model and measuring actual concurrent request load.
