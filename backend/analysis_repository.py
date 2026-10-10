from __future__ import annotations

import json
import os

from database import get_connection, now_iso
from supabase_client import insert_analysis_log


def _decode_result(value: str):
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _row_to_analysis_log(row) -> dict:
    result = _decode_result(row["result_json"])
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "guestId": row["guest_id"] if "guest_id" in row.keys() else None,
        "analysisType": row["analysis_type"],
        "inputImageHash": row["input_image_hash"],
        "result": result,
        "modelName": row["model_name"],
        "promptVersion": row["prompt_version"] if "prompt_version" in row.keys() else None,
        "analysisMode": row["analysis_mode"] if "analysis_mode" in row.keys() else None,
        "cacheKey": row["cache_key"] if "cache_key" in row.keys() else None,
        "createdAt": row["created_at"],
    }


def build_cache_key(
    input_image_hash: str,
    model_name: str,
    prompt_version: str,
    analysis_mode: str,
) -> str:
    return f"{input_image_hash}:{model_name}:{prompt_version}:{analysis_mode}"


def find_cached_analysis(
    *,
    user_id: str | None,
    guest_id: str | None,
    input_image_hash: str,
    model_name: str,
    prompt_version: str,
    analysis_mode: str,
) -> dict | None:
    cache_key = build_cache_key(input_image_hash, model_name, prompt_version, analysis_mode)
    global_cache = os.getenv("ENABLE_GLOBAL_IMAGE_CACHE", "false").lower() == "true"

    with get_connection() as connection:
        if global_cache:
            row = connection.execute(
                """
                SELECT * FROM analysis_logs
                WHERE cache_key = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (cache_key,),
            ).fetchone()
        elif user_id:
            row = connection.execute(
                """
                SELECT * FROM analysis_logs
                WHERE cache_key = ? AND user_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (cache_key, user_id),
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT * FROM analysis_logs
                WHERE cache_key = ? AND guest_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (cache_key, guest_id),
            ).fetchone()

    if row is None:
        return None
    return _row_to_analysis_log(row)


def create_analysis_log(
    *,
    user_id: str | None,
    guest_id: str | None,
    analysis_type: str,
    input_image_hash: str | None,
    result: dict,
    model_name: str | None,
    prompt_version: str | None = None,
    analysis_mode: str | None = None,
    cache_key: str | None = None,
) -> dict:
    timestamp = now_iso()
    result_json = json.dumps(result, ensure_ascii=False)

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO analysis_logs (
                user_id,
                guest_id,
                analysis_type,
                input_image_hash,
                result_json,
                model_name,
                prompt_version,
                analysis_mode,
                cache_key,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                guest_id,
                analysis_type,
                input_image_hash,
                result_json,
                model_name,
                prompt_version,
                analysis_mode,
                cache_key,
                timestamp,
            ),
        )
        connection.commit()
        analysis_id = cursor.lastrowid
        row = connection.execute("SELECT * FROM analysis_logs WHERE id = ?", (analysis_id,)).fetchone()

    analysis_log = _row_to_analysis_log(row)
    insert_analysis_log(
        {
            "id": analysis_log["id"],
            "user_id": user_id,
            "guest_id": guest_id,
            "analysis_type": analysis_type,
            "input_image_hash": input_image_hash,
            "result_json": result,
            "model_name": model_name,
            "prompt_version": prompt_version,
            "analysis_mode": analysis_mode,
            "cache_key": cache_key,
            "created_at": timestamp,
        }
    )
    return analysis_log


def get_analysis_log(analysis_id: int, user_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM analysis_logs WHERE id = ? AND user_id = ?",
            (analysis_id, user_id),
        ).fetchone()
    if row is None:
        return None
    return _row_to_analysis_log(row)


def list_analysis_logs(user_id: str, limit: int = 20) -> list[dict]:
    safe_limit = max(1, min(limit, 100))
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM analysis_logs
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, safe_limit),
        ).fetchall()
    return [_row_to_analysis_log(row) for row in rows]
