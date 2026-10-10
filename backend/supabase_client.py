from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover - defensive fallback for missing dependency
    Client = Any  # type: ignore[misc,assignment]
    create_client = None


logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

_supabase_client: Client | None = None
_supabase_disabled = False


def get_supabase_client() -> Client | None:
    global _supabase_client, _supabase_disabled

    if _supabase_client is not None:
        return _supabase_client

    if _supabase_disabled:
        return None

    if create_client is None:
        logger.warning("supabase package is not installed. Supabase mirroring is disabled.")
        _supabase_disabled = True
        return None

    url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not service_role_key:
        logger.info("Supabase configuration is missing. Supabase mirroring is disabled.")
        _supabase_disabled = True
        return None

    try:
        _supabase_client = create_client(url, service_role_key)
        return _supabase_client
    except Exception as exc:
        logger.warning("Failed to create Supabase client: %s", exc)
        _supabase_disabled = True
        return None


def is_supabase_available() -> bool:
    return get_supabase_client() is not None


def _safe_insert(table_name: str, payload: dict[str, Any]) -> bool:
    client = get_supabase_client()
    if client is None:
        return False

    try:
        client.table(table_name).insert(payload).execute()
        return True
    except Exception as exc:
        logger.warning("Failed to insert %s row: %s", table_name, exc)
        return False


def _safe_select_count(table_name: str, *, column: str, value: str, start_at: str) -> int | None:
    client = get_supabase_client()
    if client is None:
        return None

    try:
        response = (
            client.table(table_name)
            .select("id", count="exact")
            .eq(column, value)
            .gte("created_at", start_at)
            # Legacy rows created before the action column was introduced have
            # NULL action values. Treat them as successful analyses so limits do
            # not reset after schema/code changes.
            .or_("action.eq.analysis_success,action.is.null")
            .execute()
        )
        return int(response.count or 0)
    except Exception as exc:
        logger.warning("Failed to count %s rows: %s", table_name, exc)
        return None


def get_profile_plan(user_id: str) -> str | None:
    client = get_supabase_client()
    if client is None:
        return None

    try:
        response = client.table("profiles").select("plan").eq("id", user_id).limit(1).execute()
        rows = response.data or []
        if not rows:
            return None
        plan = str(rows[0].get("plan") or "").strip().lower()
        return plan or None
    except Exception as exc:
        logger.warning("Failed to read profile plan: %s", exc)
        return None


def get_or_create_profile_plan(user_id: str, email: str | None = None) -> str | None:
    client = get_supabase_client()
    if client is None:
        return None

    try:
        response = client.table("profiles").select("id,email,plan").eq("id", user_id).limit(1).execute()
        rows = response.data or []
        if rows:
            row = rows[0]
            plan = str(row.get("plan") or "free").strip().lower() or "free"
            updates: dict[str, Any] = {}
            if not row.get("plan"):
                updates["plan"] = "free"
            if email and not row.get("email"):
                updates["email"] = email
            if updates:
                client.table("profiles").update(updates).eq("id", user_id).execute()
            return plan

        client.table("profiles").insert(
            {
                "id": user_id,
                "email": email,
                "plan": "free",
            }
        ).execute()
        return "free"
    except Exception as exc:
        logger.warning("Failed to ensure profile plan: %s", exc)
        return None


def get_user_from_access_token(access_token: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if client is not None:
        try:
            response = client.auth.get_user(access_token)
            user = getattr(response, "user", None)
            if user is not None:
                user_id = getattr(user, "id", None)
                if user_id:
                    return {
                        "id": str(user_id),
                        "email": getattr(user, "email", None),
                    }
        except Exception as exc:
            logger.warning("Supabase client token verification failed: %s", exc)

    if not url or not service_role_key:
        return None

    try:
        request = Request(
            f"{url.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {access_token}",
            },
            method="GET",
        )
        with urlopen(request, timeout=10) as response:
            import json

            payload = json.loads(response.read().decode("utf-8"))
        user_id = payload.get("id")
        if not user_id:
            return None
        return {
            "id": str(user_id),
            "email": payload.get("email"),
        }
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        logger.warning("Supabase REST token verification failed: %s", exc)
        return None


def count_success_usage_logs(*, user_id: str | None, guest_id: str | None, start_at: str) -> int | None:
    if user_id:
        return _safe_select_count("usage_logs", column="user_id", value=user_id, start_at=start_at)
    if guest_id:
        return _safe_select_count("usage_logs", column="guest_id", value=guest_id, start_at=start_at)
    return None


def _safe_upsert(table_name: str, payload: dict[str, Any], on_conflict: str) -> None:
    client = get_supabase_client()
    if client is None:
        return

    try:
        client.table(table_name).upsert(payload, on_conflict=on_conflict).execute()
    except Exception as exc:
        logger.warning("Failed to upsert %s row: %s", table_name, exc)


def upsert_user(payload: dict[str, Any]) -> None:
    _safe_upsert("users", payload, on_conflict="id")


def upsert_subscription(payload: dict[str, Any]) -> None:
    _safe_upsert("subscriptions", payload, on_conflict="id")


def insert_usage_log(payload: dict[str, Any]) -> bool:
    return insert_usage_log_checked(payload)


def insert_usage_log_checked(payload: dict[str, Any]) -> bool:
    client = get_supabase_client()
    if client is None:
        return False

    try:
        client.table("usage_logs").insert(payload).execute()
        return True
    except Exception as exc:
        logger.warning("Failed to insert usage_logs row: %s", exc)
        return False


def insert_analysis_log(payload: dict[str, Any]) -> bool:
    return _safe_insert("analysis_logs", payload)


def insert_feedback_log(payload: dict[str, Any]) -> None:
    _safe_insert("feedback_logs", payload)
