from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

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


def _safe_insert(table_name: str, payload: dict[str, Any]) -> None:
    client = get_supabase_client()
    if client is None:
        return

    try:
        client.table(table_name).insert(payload).execute()
    except Exception as exc:
        logger.warning("Failed to insert %s row: %s", table_name, exc)


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


def insert_usage_log(payload: dict[str, Any]) -> None:
    _safe_insert("usage_logs", payload)


def insert_analysis_log(payload: dict[str, Any]) -> None:
    _safe_insert("analysis_logs", payload)


def insert_feedback_log(payload: dict[str, Any]) -> None:
    _safe_insert("feedback_logs", payload)
