from __future__ import annotations

import json

from database import get_connection, now_iso
from supabase_client import insert_analysis_log


def _row_to_analysis_log(row) -> dict:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "analysisType": row["analysis_type"],
        "inputImageHash": row["input_image_hash"],
        "result": json.loads(row["result_json"]),
        "modelName": row["model_name"],
        "createdAt": row["created_at"],
    }


def create_analysis_log(
    user_id: str,
    analysis_type: str,
    input_image_hash: str | None,
    result: dict,
    model_name: str | None,
) -> dict:
    timestamp = now_iso()
    result_json = json.dumps(result, ensure_ascii=False)

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO analysis_logs (
                user_id, analysis_type, input_image_hash, result_json, model_name, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, analysis_type, input_image_hash, result_json, model_name, timestamp),
        )
        connection.commit()
        analysis_id = cursor.lastrowid
        row = connection.execute(
            "SELECT * FROM analysis_logs WHERE id = ? AND user_id = ?",
            (analysis_id, user_id),
        ).fetchone()

    analysis_log = _row_to_analysis_log(row)
    insert_analysis_log(
        {
            "id": analysis_log["id"],
            "user_id": user_id,
            "analysis_type": analysis_type,
            "input_image_hash": input_image_hash,
            "result_json": result_json,
            "model_name": model_name,
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
