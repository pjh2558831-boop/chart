from __future__ import annotations

from fastapi import HTTPException

from analysis_repository import get_analysis_log
from database import get_connection, now_iso
from supabase_client import insert_feedback_log


def _row_to_feedback(row) -> dict:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "analysisId": row["analysis_id"],
        "rating": row["rating"],
        "correctSignal": row["correct_signal"],
        "correctPattern": row["correct_pattern"],
        "comment": row["comment"],
        "createdAt": row["created_at"],
    }


def create_feedback(
    user_id: str,
    analysis_id: int,
    rating: int | None,
    correct_signal: str | None,
    correct_pattern: str | None,
    comment: str | None,
) -> dict:
    if rating is not None and not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="rating은 1~5만 허용됩니다.")

    analysis_log = get_analysis_log(analysis_id, user_id)
    if analysis_log is None:
        raise HTTPException(status_code=404, detail="해당 분석 기록을 찾을 수 없습니다.")

    timestamp = now_iso()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO feedback_logs (
                user_id, analysis_id, rating, correct_signal, correct_pattern, comment, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, analysis_id, rating, correct_signal, correct_pattern, comment, timestamp),
        )
        connection.commit()
        feedback_id = cursor.lastrowid
        row = connection.execute(
            "SELECT * FROM feedback_logs WHERE id = ? AND user_id = ?",
            (feedback_id, user_id),
        ).fetchone()

    feedback = _row_to_feedback(row)
    insert_feedback_log(
        {
            "id": feedback["id"],
            "user_id": user_id,
            "analysis_id": analysis_id,
            "rating": rating,
            "correct_signal": correct_signal,
            "correct_pattern": correct_pattern,
            "comment": comment,
            "created_at": timestamp,
        }
    )
    return feedback


def list_feedback_for_analysis(analysis_id: int, user_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM feedback_logs
            WHERE analysis_id = ? AND user_id = ?
            ORDER BY id DESC
            """,
            (analysis_id, user_id),
        ).fetchall()
    return [_row_to_feedback(row) for row in rows]
