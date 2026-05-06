from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, Request

from auth import get_or_create_user
from database import get_connection, now_iso
from supabase_client import insert_usage_log


PLAN_LIMITS = {
    "guest": {
        "dailyLimit": 1,
        "monthlyLimit": 3,
        "price": 0,
        "analysisMode": "fast",
        "enabledFeatures": ["image_analysis"],
    },
    "free": {
        "dailyLimit": 2,
        "monthlyLimit": 10,
        "price": 0,
        "analysisMode": "fast",
        "enabledFeatures": ["image_analysis", "analysis_history", "feedback"],
    },
    "plus": {
        "dailyLimit": 20,
        "monthlyLimit": 100,
        "price": 5900,
        "analysisMode": "standard",
        "enabledFeatures": ["image_analysis", "advanced_patterns", "analysis_history", "feedback", "ad_free"],
    },
    "pro": {
        "dailyLimit": 50,
        "monthlyLimit": 300,
        "price": 12900,
        "analysisMode": "precision",
        "enabledFeatures": [
            "image_analysis",
            "advanced_patterns",
            "analysis_history",
            "feedback",
            "ad_free",
            "history_compare",
            "news_research_coming_soon",
            "realtime_research_coming_soon",
        ],
    },
}

PLAN_LABELS = {
    "guest": "비로그인 무료 체험",
    "free": "Free",
    "plus": "Plus",
    "pro": "Pro",
}

ANALYSIS_MODE_ORDER = {"fast": 0, "standard": 1, "precision": 2}
PLAN_ALLOWED_MODES = {
    "guest": ["fast"],
    "free": ["fast"],
    "plus": ["fast", "standard"],
    "pro": ["fast", "standard", "precision"],
}
IDENTITY_RE = re.compile(r"^[a-zA-Z0-9._:@-]{8,128}$")
SEOUL_TZ = ZoneInfo("Asia/Seoul")


def get_plan_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def _period_start(period: str) -> str:
    # usage_logs.created_at is stored as UTC ISO strings. Limits are counted
    # by Asia/Seoul calendar day/month and converted back to UTC for queries.
    now = datetime.now(SEOUL_TZ).replace(microsecond=0)
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0)
    elif period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0)
    else:
        raise ValueError(f"Unsupported period: {period}")
    return start.astimezone(timezone.utc).isoformat()


def _sanitize_identity(value: str | None) -> str | None:
    candidate = (value or "").strip()
    if not candidate or not IDENTITY_RE.match(candidate):
        return None
    return candidate


def resolve_request_identity(request: Request) -> dict[str, Any]:
    # MVP note: Authorization is forwarded for future Supabase JWT validation.
    # For now, server-side plan lookup uses X-User-Id after frontend Supabase Auth.
    user_id = _sanitize_identity(request.headers.get("X-User-Id"))
    if user_id:
        user = get_or_create_user(user_id)
        plan = str(user.get("plan") or "free").lower()
        if plan not in {"free", "plus", "pro"}:
            plan = "free"
        return {"type": "user", "id": user["id"], "plan": plan, "user": {**user, "plan": plan}}

    guest_id = _sanitize_identity(request.headers.get("X-Guest-Id"))
    if guest_id:
        return {"type": "guest", "id": guest_id, "plan": "guest", "user": None}

    raise HTTPException(status_code=400, detail="로그인 정보 또는 게스트 식별자가 필요합니다.")


def count_usage(identity: dict[str, Any], period: str) -> int:
    start_at = _period_start(period)
    column = "guest_id" if identity["type"] == "guest" else "user_id"
    with get_connection() as connection:
        row = connection.execute(
            f"""
            SELECT COUNT(*) AS usage_count
            FROM usage_logs
            WHERE {column} = ? AND created_at >= ?
            """,
            (identity["id"], start_at),
        ).fetchone()
    return int(row["usage_count"] or 0)


def has_feature(plan: str, feature: str) -> bool:
    return feature in get_plan_limits(plan)["enabledFeatures"]


def get_allowed_analysis_mode(plan: str) -> str:
    return str(get_plan_limits(plan)["analysisMode"])


def coerce_analysis_mode_for_plan(plan: str, requested_mode: str | None) -> str:
    allowed_modes = PLAN_ALLOWED_MODES.get(plan, PLAN_ALLOWED_MODES["free"])
    default_mode = get_allowed_analysis_mode(plan)
    requested = requested_mode if requested_mode in ANALYSIS_MODE_ORDER else default_mode
    if requested in allowed_modes:
        return requested
    return max(allowed_modes, key=lambda mode: ANALYSIS_MODE_ORDER[mode])


def get_usage_status(identity: dict[str, Any]) -> dict:
    plan = identity["plan"]
    limits = get_plan_limits(plan)
    daily_used = count_usage(identity, "daily")
    monthly_used = count_usage(identity, "monthly")
    daily_remaining = max(int(limits["dailyLimit"]) - daily_used, 0)
    monthly_remaining = max(int(limits["monthlyLimit"]) - monthly_used, 0)

    return {
        "identityType": identity["type"],
        "id": identity["id"],
        "userId": identity["id"] if identity["type"] == "user" else None,
        "guestId": identity["id"] if identity["type"] == "guest" else None,
        "plan": plan,
        "planLabel": PLAN_LABELS.get(plan, "Free"),
        "price": limits["price"],
        "dailyLimit": limits["dailyLimit"],
        "monthlyLimit": limits["monthlyLimit"],
        "dailyUsed": daily_used,
        "monthlyUsed": monthly_used,
        "dailyRemaining": daily_remaining,
        "monthlyRemaining": monthly_remaining,
        "analysisMode": limits["analysisMode"],
        "enabledFeatures": limits["enabledFeatures"],
        "isLoggedIn": identity["type"] == "user",
        "isPaidPlan": plan in {"plus", "pro"},
    }


def _limit_error(status_code: int, code: str, message: str, usage_status: dict) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, "usageStatus": usage_status},
    )


def assert_can_analyze(identity: dict[str, Any], analysis_type: str) -> dict:
    usage_status = get_usage_status(identity)

    if not has_feature(identity["plan"], analysis_type):
        raise _limit_error(403, "feature_not_allowed", "현재 요금제에서 사용할 수 없는 기능입니다.", usage_status)
    if usage_status["dailyRemaining"] <= 0:
        raise _limit_error(429, "daily_limit_exceeded", "daily_limit_exceeded", usage_status)
    if usage_status["monthlyRemaining"] <= 0:
        raise _limit_error(429, "monthly_limit_exceeded", "monthly_limit_exceeded", usage_status)

    return usage_status


def record_usage(identity: dict[str, Any], analysis_type: str) -> None:
    timestamp = now_iso()
    user_id = identity["id"] if identity["type"] == "user" else None
    guest_id = identity["id"] if identity["type"] == "guest" else None
    plan_snapshot = identity["plan"]

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO usage_logs (user_id, guest_id, analysis_type, plan_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, guest_id, analysis_type, plan_snapshot, timestamp),
        )
        connection.commit()

    insert_usage_log(
        {
            "user_id": user_id,
            "guest_id": guest_id,
            "analysis_type": analysis_type,
            "plan_snapshot": plan_snapshot,
            "created_at": timestamp,
        }
    )
