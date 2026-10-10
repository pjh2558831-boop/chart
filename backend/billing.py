from __future__ import annotations

import os
import re
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, Request

from auth import get_or_create_user
from database import get_connection, now_iso
from supabase_client import (
    count_success_usage_logs,
    get_or_create_profile_plan,
    get_profile_plan,
    get_user_from_access_token,
    insert_usage_log,
    is_supabase_available,
)


PLAN_LIMITS = {
    "guest": {
        "dailyLimit": 1,
        "monthlyLimit": 3,
        "price": 0,
        "analysisMode": "fast",
        "enabledFeatures": ["image_analysis"],
    },
    "free": {
        "dailyLimit": 3,
        "monthlyLimit": 10,
        "price": 0,
        "analysisMode": "fast",
        "enabledFeatures": ["image_analysis", "analysis_history", "feedback"],
    },
    "plus": {
        "dailyLimit": 20,
        "monthlyLimit": 100,
        "price": 4900,
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
            "deep_research_coming_soon",
        ],
    },
}

PLAN_LABELS = {
    "guest": "GUEST",
    "free": "FREE",
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
SUCCESS_ACTION = "analysis_success"
ERROR_ACTION = "analysis_error"
LIMIT_ACTION = "limit_reached"


def get_plan_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def _period_start(period: str) -> str:
    # Limits are counted by the Asia/Seoul calendar day/month, then converted
    # to UTC ISO for Supabase timestamptz comparisons.
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


def _client_address(request: Request) -> str:
    forwarded_for = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    direct_host = request.client.host if request.client else ""
    return forwarded_for or direct_host or "unknown"


def _guest_fingerprint(request: Request) -> str:
    secret = (os.getenv("GUEST_TOKEN_SECRET") or "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="게스트 사용 설정이 필요합니다.")

    user_agent = (request.headers.get("user-agent") or "unknown")[:200]
    client_address = _client_address(request)
    raw = f"{client_address}|{user_agent}"
    digest = hmac.new(secret.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"guest_{digest[:48]}"


def _normalize_user_plan(plan: str | None) -> str:
    normalized = str(plan or "free").strip().lower()
    return normalized if normalized in {"free", "plus", "pro"} else "free"


def _allow_sqlite_usage_fallback() -> bool:
    return os.getenv("ALLOW_SQLITE_USAGE_FALLBACK", "false").lower() == "true"


def _extract_bearer_token(request: Request) -> str | None:
    authorization = (request.headers.get("Authorization") or "").strip()
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="인증 토큰 형식이 올바르지 않습니다.")
    return token.strip()


def _identity_from_user_id(user_id: str, email: str | None = None) -> dict[str, Any]:
    user = get_or_create_user(user_id)
    profile_plan = get_or_create_profile_plan(user["id"], email=email) or get_profile_plan(user["id"])
    plan = _normalize_user_plan(profile_plan or user.get("plan"))
    return {"type": "user", "id": user["id"], "plan": plan, "user": {**user, "plan": plan}}


def resolve_request_identity(request: Request) -> dict[str, Any]:
    access_token = _extract_bearer_token(request)
    guest_id = _sanitize_identity(request.headers.get("X-Guest-Id") or getattr(request.state, "guest_id", None))

    if access_token:
        auth_user = get_user_from_access_token(access_token)
        if auth_user is not None:
            identity = _identity_from_user_id(str(auth_user["id"]), email=auth_user.get("email"))
            identity["guestId"] = guest_id
            return identity
        raise HTTPException(status_code=401, detail="로그인 세션을 확인할 수 없습니다.")

    if guest_id:
        return {
            "type": "guest",
            "id": _guest_fingerprint(request),
            "clientGuestId": guest_id,
            "plan": "guest",
            "user": None,
            "allowClientUsageFallback": False,
        }

    raise HTTPException(status_code=400, detail="로그인 정보 또는 게스트 식별자가 필요합니다.")


def _count_usage_sqlite(identity: dict[str, Any], period: str) -> int:
    start_at = _period_start(period)
    column = "guest_id" if identity["type"] == "guest" else "user_id"
    with get_connection() as connection:
        row = connection.execute(
            f"""
            SELECT COUNT(*) AS usage_count
            FROM usage_logs
            WHERE {column} = ?
              AND created_at >= ?
              AND action = ?
            """,
            (identity["id"], start_at, SUCCESS_ACTION),
        ).fetchone()
    return int(row["usage_count"] or 0)


def count_usage(identity: dict[str, Any], period: str) -> int:
    start_at = _period_start(period)
    supabase_count = count_success_usage_logs(
        user_id=identity["id"] if identity["type"] == "user" else None,
        guest_id=identity["id"] if identity["type"] == "guest" else None,
        start_at=start_at,
    )
    if supabase_count is not None:
        return supabase_count
    if identity["type"] == "guest" and identity.get("allowClientUsageFallback"):
        return _count_usage_sqlite(identity, period)
    if _allow_sqlite_usage_fallback():
        return _count_usage_sqlite(identity, period)
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="사용량 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.")
    raise HTTPException(status_code=503, detail="사용량 정보를 확인할 수 없어 분석을 시작할 수 없습니다.")


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
        "planLabel": PLAN_LABELS.get(plan, "free"),
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
    offer_type = "login" if usage_status["plan"] == "guest" else "upgrade"
    return HTTPException(
        status_code=status_code,
        detail={
            "ok": False,
            "code": code,
            "message": message,
            "currentPlan": usage_status["plan"],
            "dailyUsed": usage_status["dailyUsed"],
            "dailyLimit": usage_status["dailyLimit"],
            "monthlyUsed": usage_status["monthlyUsed"],
            "monthlyLimit": usage_status["monthlyLimit"],
            "offerType": offer_type,
            "usageStatus": usage_status,
        },
    )


def assert_can_analyze(identity: dict[str, Any], analysis_type: str) -> dict:
    usage_status = get_usage_status(identity)

    if not has_feature(identity["plan"], analysis_type):
        raise _limit_error(403, "feature_not_allowed", "현재 플랜에서 사용할 수 없는 기능입니다.", usage_status)
    if usage_status["dailyRemaining"] <= 0:
        record_usage(identity, analysis_type, action=LIMIT_ACTION)
        raise _limit_error(429, "LIMIT_REACHED", "오늘 무료 분석 횟수를 모두 사용했습니다.", usage_status)
    if usage_status["monthlyRemaining"] <= 0:
        record_usage(identity, analysis_type, action=LIMIT_ACTION)
        raise _limit_error(429, "LIMIT_REACHED", "이번 달 무료 분석 횟수를 모두 사용했습니다.", usage_status)

    return usage_status


def record_usage(identity: dict[str, Any], analysis_type: str, action: str = SUCCESS_ACTION) -> None:
    timestamp = now_iso()
    user_id = identity["id"] if identity["type"] == "user" else None
    guest_id = identity["id"] if identity["type"] == "guest" else None
    plan_snapshot = identity["plan"]

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO usage_logs (user_id, guest_id, analysis_type, action, plan_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, guest_id, analysis_type, action, plan_snapshot, timestamp),
        )
        connection.commit()

    supabase_saved = insert_usage_log(
        {
            "user_id": user_id,
            "guest_id": guest_id,
            "analysis_type": analysis_type,
            "action": action,
            "plan_snapshot": plan_snapshot,
            "created_at": timestamp,
        }
    )
    allow_guest_fallback = identity["type"] == "guest" and identity.get("allowClientUsageFallback")
    if action == SUCCESS_ACTION and not supabase_saved and not _allow_sqlite_usage_fallback() and not allow_guest_fallback:
        raise HTTPException(status_code=503, detail="사용량 기록을 Supabase에 저장하지 못했습니다.")
