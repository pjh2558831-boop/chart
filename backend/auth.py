from __future__ import annotations

import hmac
import os

from fastapi import HTTPException, Request

from database import get_connection, now_iso
from supabase_client import get_user_from_access_token, upsert_subscription, upsert_user


VALID_PLANS = {"free", "plus", "pro"}


def _row_to_user(row) -> dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "plan": row["plan"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _mirror_user(user: dict) -> None:
    upsert_user(
        {
            "id": user["id"],
            "email": user["email"],
            "plan": user["plan"],
            "created_at": user["createdAt"],
            "updated_at": user["updatedAt"],
        }
    )


def _extract_bearer_token(request: Request) -> str:
    authorization = (request.headers.get("Authorization") or "").strip()
    if not authorization:
        raise HTTPException(status_code=401, detail="로그인이 필요한 기능입니다.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="인증 토큰 형식이 올바르지 않습니다.")
    return token.strip()


def get_authenticated_user(request: Request) -> dict:
    token = _extract_bearer_token(request)
    auth_user = get_user_from_access_token(token)
    if auth_user is None or not auth_user.get("id"):
        raise HTTPException(status_code=401, detail="로그인 세션을 확인할 수 없습니다.")
    return {
        "id": str(auth_user["id"]),
        "email": auth_user.get("email"),
    }


def get_authenticated_user_id(request: Request) -> str:
    return str(get_authenticated_user(request)["id"])


def get_user_id_from_header(request: Request) -> str:
    return get_authenticated_user_id(request)


def require_admin_request(request: Request) -> None:
    expected_secret = (os.getenv("ADMIN_API_SECRET") or "").strip()
    if not expected_secret:
        raise HTTPException(status_code=403, detail="관리자 기능이 비활성화되어 있습니다.")

    provided_secret = (request.headers.get("X-Admin-Secret") or "").strip()
    if not provided_secret or not hmac.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")


def get_or_create_user(user_id: str) -> dict:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is not None:
            user = _row_to_user(row)
            _mirror_user(user)
            return user

        timestamp = now_iso()
        connection.execute(
            """
            INSERT INTO users (id, email, plan, created_at, updated_at)
            VALUES (?, NULL, 'free', ?, ?)
            """,
            (user_id, timestamp, timestamp),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user = _row_to_user(row)
        _mirror_user(user)
        return user


def update_user_plan(user_id: str, plan: str) -> dict:
    normalized_plan = plan.strip().lower()
    if normalized_plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail="지원하지 않는 요금제입니다.")

    timestamp = now_iso()
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            connection.execute(
                """
                INSERT INTO users (id, email, plan, created_at, updated_at)
                VALUES (?, NULL, ?, ?, ?)
                """,
                (user_id, normalized_plan, timestamp, timestamp),
            )
        else:
            connection.execute(
                "UPDATE users SET plan = ?, updated_at = ? WHERE id = ?",
                (normalized_plan, timestamp, user_id),
            )

        existing_subscription = connection.execute(
            "SELECT id, created_at FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()

        status = "inactive" if normalized_plan == "free" else "active"
        subscription_created_at = timestamp
        if existing_subscription is None:
            cursor = connection.execute(
                """
                INSERT INTO subscriptions (
                    user_id, plan, status, current_period_start, current_period_end, created_at, updated_at
                )
                VALUES (?, ?, ?, NULL, NULL, ?, ?)
                """,
                (user_id, normalized_plan, status, timestamp, timestamp),
            )
            subscription_id = cursor.lastrowid
        else:
            subscription_id = existing_subscription["id"]
            subscription_created_at = existing_subscription["created_at"]
            connection.execute(
                """
                UPDATE subscriptions
                SET plan = ?, status = ?, updated_at = ?
                WHERE id = ?
                """,
                (normalized_plan, status, timestamp, subscription_id),
            )

        connection.commit()
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user = _row_to_user(row)

    _mirror_user(user)
    upsert_subscription(
        {
            "id": subscription_id,
            "user_id": user_id,
            "plan": normalized_plan,
            "status": status,
            "current_period_start": None,
            "current_period_end": None,
            "created_at": subscription_created_at,
            "updated_at": timestamp,
        }
    )
    return user
