from __future__ import annotations

import os
import sys
import tempfile
import types
from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient

import auth
import billing
import database
import feedback_repository
import rate_limit
import supabase_client


@contextmanager
def _setup_test_app():
    os.environ["ADMIN_API_SECRET"] = "test-admin-secret"
    os.environ["GUEST_TOKEN_SECRET"] = "test-guest-secret"
    temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
    database.DB_PATH = Path(temp_dir.name) / "test.db"

    auth.upsert_user = lambda payload: None
    auth.upsert_subscription = lambda payload: None
    billing.get_or_create_profile_plan = lambda user_id, email=None: "free"
    billing.get_profile_plan = lambda user_id: "free"
    billing.count_success_usage_logs = lambda **kwargs: 0
    billing.is_supabase_available = lambda: True
    supabase_client.insert_analysis_log = lambda payload: True
    supabase_client.insert_feedback_log = lambda payload: None
    feedback_repository.insert_feedback_log = lambda payload: None

    def fake_get_user_from_access_token(token: str):
        if token == "valid-user-a":
            return {"id": "user-a", "email": "a@example.com"}
        if token == "valid-user-b":
            return {"id": "user-b", "email": "b@example.com"}
        return None

    auth.get_user_from_access_token = fake_get_user_from_access_token

    market_data_stub = types.ModuleType("market_data")
    market_data_stub.build_yfinance_candidates = lambda **kwargs: []
    market_data_stub.fetch_ohlcv_from_candidates = lambda *args, **kwargs: {"ohlcv": None}
    market_data_stub.map_timeframe_to_yfinance = lambda *args, **kwargs: {"period": "6mo", "interval": "1d"}
    market_data_stub.should_run_market_validation = lambda *args, **kwargs: (False, "disabled")
    market_data_stub.validate_ohlcv_data = lambda *args, **kwargs: {"isEnoughData": False}
    sys.modules["market_data"] = market_data_stub

    import main

    with TestClient(main.app) as client:
        yield client

    temp_dir.cleanup()


def _seed_analysis_log(user_id: str) -> int:
    database.init_db()
    auth.get_or_create_user(user_id)
    with database.get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO analysis_logs (
                user_id, guest_id, analysis_type, input_image_hash, result_json,
                model_name, prompt_version, analysis_mode, cache_key, created_at
            )
            VALUES (?, NULL, 'image_analysis', NULL, '{}', NULL, NULL, NULL, NULL, ?)
            """,
            (user_id, database.now_iso()),
        )
        connection.commit()
        return int(cursor.lastrowid)


def run() -> None:
    with _setup_test_app() as client:

        missing = client.get("/analysis-logs")
        assert missing.status_code == 401, missing.text

        invalid = client.get("/analysis-logs", headers={"Authorization": "Bearer invalid-token"})
        assert invalid.status_code == 401, invalid.text

        user_a_log_id = _seed_analysis_log("user-a")
        user_b_log_id = _seed_analysis_log("user-b")

        spoofed = client.get(
            "/analysis-logs",
            headers={"Authorization": "Bearer valid-user-a", "X-User-Id": "user-b"},
        )
        assert spoofed.status_code == 200, spoofed.text
        assert all(item["userId"] == "user-a" for item in spoofed.json()), spoofed.json()

        own_detail = client.get(f"/analysis-logs/{user_a_log_id}", headers={"Authorization": "Bearer valid-user-a"})
        assert own_detail.status_code == 200, own_detail.text

        other_detail = client.get(f"/analysis-logs/{user_b_log_id}", headers={"Authorization": "Bearer valid-user-a"})
        assert other_detail.status_code == 404, other_detail.text

        feedback = client.post(
            "/feedback",
            headers={"Authorization": "Bearer valid-user-a", "X-User-Id": "user-b"},
            json={"analysisId": user_a_log_id, "rating": 5, "correctSignal": "neutral"},
        )
        assert feedback.status_code == 200, feedback.text
        assert feedback.json()["userId"] == "user-a", feedback.json()

        non_admin = client.post("/admin/set-plan", json={"userId": "user-a", "plan": "pro"})
        assert non_admin.status_code == 403, non_admin.text

        invalid_plan = client.post(
            "/admin/set-plan",
            headers={"X-Admin-Secret": "test-admin-secret"},
            json={"userId": "user-a", "plan": "enterprise"},
        )
        assert invalid_plan.status_code == 400, invalid_plan.text

        guest_one = client.get(
            "/usage-status",
            headers={"X-Guest-Id": "guest-client-a", "User-Agent": "test-agent"},
        )
        assert guest_one.status_code == 200, guest_one.text
        guest_two = client.get(
            "/usage-status",
            headers={"X-Guest-Id": "guest-client-b", "User-Agent": "test-agent"},
        )
        assert guest_two.status_code == 200, guest_two.text
        assert guest_one.json()["guestId"].startswith("guest_"), guest_one.json()
        assert guest_one.json()["guestId"] == guest_two.json()["guestId"], guest_two.json()

        os.environ["RATE_LIMIT_WINDOW_SECONDS"] = "60"
        os.environ["RATE_LIMIT_MAX_REQUESTS"] = "1"
        rate_limit._REQUESTS.clear()
        rate_limit.check_rate_limit("test-rate-key")
        try:
            rate_limit.check_rate_limit("test-rate-key")
        except Exception as exc:
            assert getattr(exc, "status_code", None) == 429, exc
        else:
            raise AssertionError("rate limit did not reject the second request")

        print("auth security checks passed")


if __name__ == "__main__":
    run()
