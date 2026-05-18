# Security Checklist

## Environment Variables

- Do not commit `.env`, `.env.local`, or any file containing real secrets.
- Only variables prefixed with `NEXT_PUBLIC_` may be read by browser code.
- Keep these variables server-side only:
  - `OPENAI_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `BACKEND_API_URL`
- Use `SUPABASE_SERVICE_ROLE_KEY` only in trusted server code. Never use it in React components, client hooks, or browser bundles.

## Frontend and Vercel API Routes

- The browser calls same-origin Next.js API routes under `/api/...`.
- Next.js API routes read `BACKEND_API_URL` server-side and proxy to FastAPI.
- The proxy validates:
  - `X-User-Id` format and length
  - image content type and max size
  - feedback payload shape
  - allowed route paths
- The proxy includes basic in-memory rate limiting for local and small MVP traffic.
- Production-grade rate limiting should move to Redis, Upstash, Vercel KV, or Supabase-backed counters.

## Backend

- FastAPI CORS origins are read from `CORS_ALLOWED_ORIGINS`.
- FastAPI still performs its own validation for uploaded files, usage limits, and user ownership checks.
- Error details from FastAPI are hidden by the Vercel proxy for unexpected server failures.
- Local SQLite is for MVP development only. Use Supabase/PostgreSQL for production persistence.

## OpenAI

- OpenAI calls must happen server-side only.
- The example route at `frontend/app/api/examples/openai-secure/route.ts` reads `OPENAI_API_KEY` only from server environment variables.
- Never pass the OpenAI API key to frontend code or store it in localStorage.

## Supabase

- Frontend may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Backend-only writes that require elevated privileges must use `SUPABASE_SERVICE_ROLE_KEY`.
- Enable Row Level Security policies before allowing browser-side Supabase writes.

## Before Production

- Rotate any secret that was ever pasted into chat, logs, screenshots, or committed files.
- Confirm `.gitignore` excludes all real env files and local DB files.
- Check Vercel build logs for accidental secret output.
- Review `analysis_logs.result_json` for accidental storage of user-sensitive content.
