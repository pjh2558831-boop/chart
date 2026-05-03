from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException

from database import get_connection, now_iso
from supabase_client import insert_usage_log


PLAN_LIMITS = {
    "free": {
        "dailyLimit": 3,
        "monthlyLimit": 10,
        "enabledFeatures": ["image_analysis"],
    },
    "basic": {
        "dailyLimit": 10,
        "monthlyLimit": 100,
        "enabledFeatures": ["image_analysis"],
    },
    "pro": {
        "dailyLimit": 30,
        "monthlyLimit": 300,
        "enabledFeatures": ["image_analysis", "visual_trade_signal"],
    },
    "premium": {
        "dailyLimit": 100,
        "monthlyLimit": 1000,
        "enabledFeatures": ["image_analysis", "visual_trade_signal", "news_analysis", "realtime_analysis"],
    },
}


def get_plan_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def _period_start(period: str) -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    if period == "daily":
        return now.replace(hour=0, minute=0, second=0).isoformat()
    if period == "monthly":
        return now.replace(day=1, hour=0, minute=0, second=0).isoformat()
    raise ValueError(f"Unsupported period: {period}")


def count_usage(user_id: str, period: str) -> int:
    start_at = _period_start(period)
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS usage_count
            FROM usage_logs
            WHERE user_id = ? AND created_at >= ?
            """,
            (user_id, start_at),
        ).fetchone()
    return int(row["usage_count"] or 0)


def has_feature(plan: str, feature: str) -> bool:
    return feature in get_plan_limits(plan)["enabledFeatures"]


def get_usage_status(user: dict) -> dict:
    plan = user["plan"]
    limits = get_plan_limits(plan)
    daily_used = count_usage(user["id"], "daily")
    monthly_used = count_usage(user["id"], "monthly")

    daily_remaining = max(limits["dailyLimit"] - daily_used, 0)
    monthly_remaining = max(limits["monthlyLimit"] - monthly_used, 0)

    return {
        "userId": user["id"],
        "plan": plan,
        "dailyLimit": limits["dailyLimit"],
        "monthlyLimit": limits["monthlyLimit"],
        "dailyUsed": daily_used,
        "monthlyUsed": monthly_used,
        "dailyRemaining": daily_remaining,
        "monthlyRemaining": monthly_remaining,
        "enabledFeatures": limits["enabledFeatures"],
    }


def assert_can_analyze(user: dict, analysis_type: str) -> dict:
    if not has_feature(user["plan"], analysis_type):
        raise HTTPException(status_code=403, detail="현재 요금제에서 사용할 수 없는 기능입니다.")

    usage_status = get_usage_status(user)
    if usage_status["dailyRemaining"] <= 0 or usage_status["monthlyRemaining"] <= 0:
        raise HTTPException(status_code=429, detail="사용량 제한 초과")

    return usage_status


def record_usage(user_id: str, analysis_type: str) -> None:
    timestamp = now_iso()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO usage_logs (user_id, analysis_type, created_at)
            VALUES (?, ?, ?)
            """,
            (user_id, analysis_type, timestamp),
        )
        connection.commit()

    insert_usage_log(
        {
            "user_id": user_id,
            "analysis_type": analysis_type,
            "created_at": timestamp,
        }
    )
