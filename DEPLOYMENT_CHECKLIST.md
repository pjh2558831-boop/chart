# Deployment Checklist

## Architecture

The Vercel deployment uses the Next.js app as the public entrypoint:

1. Browser calls `/api/...` on the Vercel app.
2. Vercel API route validates the request and rate limits it.
3. Vercel API route proxies to the FastAPI backend through `BACKEND_API_URL`.
4. FastAPI performs image processing, OpenAI analysis, Supabase/SQLite persistence, and usage checks.

This keeps OpenAI and Supabase service-role secrets out of the browser bundle.

## Vercel Project Variables

Set these in Vercel Project Settings > Environment Variables:

### Public

- `NEXT_PUBLIC_API_URL`
  - Leave empty for same-origin Vercel API routes, or set to your frontend origin if you intentionally host API routes elsewhere.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Server-only

- `BACKEND_API_URL`
  - Example: `https://your-fastapi-backend.example.com`
- `ALLOWED_ORIGINS`
  - Example: `https://your-vercel-domain.vercel.app`
- `OPENAI_API_KEY`
  - Only needed by the example OpenAI route, or if you later move OpenAI calls into Vercel routes.
- `OPENAI_MODEL`

## FastAPI Backend Variables

Set these in the backend hosting provider:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ALLOWED_ORIGINS`
  - Example: `https://your-vercel-domain.vercel.app`

## Local Development

1. Copy `frontend/.env.local.example` to `frontend/.env.local`.
2. Set `BACKEND_API_URL=http://localhost:8001` or your local FastAPI port.
3. Copy `backend/.env.example` to `backend/.env`.
4. Fill backend secrets locally.
5. Run FastAPI and Next.js separately.

## Build Verification

Run before deploying:

```powershell
cd frontend
npm.cmd run build
```

For backend syntax checks:

```powershell
cd ..
python -m py_compile backend\main.py backend\billing.py backend\supabase_client.py
```

## Production Notes

- Vercel cannot run the current FastAPI/Pillow/yfinance backend as-is without a separate Python hosting target.
- Keep FastAPI on a backend host such as Render, Railway, Fly.io, a VM, or a container platform.
- The current Vercel API routes are a secure proxy layer and can later be expanded into full serverless analysis routes if the Python image-processing stack is replaced or moved.
- Replace in-memory rate limiting with a shared production store before real public traffic.
