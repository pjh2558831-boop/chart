from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NULL,
                plan TEXT NOT NULL DEFAULT 'free',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NULL,
                guest_id TEXT NULL,
                analysis_type TEXT NOT NULL,
                action TEXT NOT NULL DEFAULT 'analysis_success',
                plan_snapshot TEXT NOT NULL DEFAULT 'free',
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                plan TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'inactive',
                current_period_start TEXT NULL,
                current_period_end TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS analysis_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NULL,
                guest_id TEXT NULL,
                analysis_type TEXT NOT NULL,
                input_image_hash TEXT NULL,
                result_json TEXT NOT NULL,
                model_name TEXT NULL,
                prompt_version TEXT NULL,
                analysis_mode TEXT NULL,
                cache_key TEXT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS feedback_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                analysis_id INTEGER NOT NULL,
                rating INTEGER NULL,
                correct_signal TEXT NULL,
                correct_pattern TEXT NULL,
                comment TEXT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(analysis_id) REFERENCES analysis_logs(id)
            );
            """
        )
        _migrate_usage_logs(connection)
        _migrate_analysis_logs(connection)
        _ensure_indexes(connection)


def _column_map(connection: sqlite3.Connection, table_name: str) -> dict[str, sqlite3.Row]:
    return {
        row["name"]: row
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }


def _ensure_column(connection: sqlite3.Connection, table_name: str, column_name: str, column_type: str) -> None:
    if column_name not in _column_map(connection, table_name):
        connection.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


def _migrate_usage_logs(connection: sqlite3.Connection) -> None:
    columns = _column_map(connection, "usage_logs")
    user_id_not_null = bool(columns.get("user_id") and columns["user_id"]["notnull"])
    missing_columns = {"guest_id", "plan_snapshot", "action"} - set(columns)

    if not user_id_not_null and not missing_columns:
        return

    connection.commit()
    connection.execute("PRAGMA foreign_keys = OFF")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS usage_logs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NULL,
            guest_id TEXT NULL,
            analysis_type TEXT NOT NULL,
            action TEXT NOT NULL DEFAULT 'analysis_success',
            plan_snapshot TEXT NOT NULL DEFAULT 'free',
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    select_plan = "plan_snapshot" if "plan_snapshot" in columns else "'free'"
    select_guest = "guest_id" if "guest_id" in columns else "NULL"
    select_action = "action" if "action" in columns else "'analysis_success'"
    connection.execute(
        f"""
        INSERT INTO usage_logs_new (id, user_id, guest_id, analysis_type, action, plan_snapshot, created_at)
        SELECT
            id,
            user_id,
            {select_guest},
            analysis_type,
            COALESCE({select_action}, 'analysis_success'),
            COALESCE({select_plan}, 'free'),
            created_at
        FROM usage_logs
        """
    )
    connection.execute("DROP TABLE usage_logs")
    connection.execute("ALTER TABLE usage_logs_new RENAME TO usage_logs")
    connection.commit()
    connection.execute("PRAGMA foreign_keys = ON")


def _migrate_analysis_logs(connection: sqlite3.Connection) -> None:
    columns = _column_map(connection, "analysis_logs")
    user_id_not_null = bool(columns.get("user_id") and columns["user_id"]["notnull"])
    required_columns = {"guest_id", "prompt_version", "analysis_mode", "cache_key"}
    missing_columns = required_columns - set(columns)

    if not user_id_not_null and not missing_columns:
        return

    connection.commit()
    connection.execute("PRAGMA foreign_keys = OFF")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS analysis_logs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NULL,
            guest_id TEXT NULL,
            analysis_type TEXT NOT NULL,
            input_image_hash TEXT NULL,
            result_json TEXT NOT NULL,
            model_name TEXT NULL,
            prompt_version TEXT NULL,
            analysis_mode TEXT NULL,
            cache_key TEXT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    select_guest = "guest_id" if "guest_id" in columns else "NULL"
    select_prompt = "prompt_version" if "prompt_version" in columns else "NULL"
    select_mode = "analysis_mode" if "analysis_mode" in columns else "NULL"
    select_cache = "cache_key" if "cache_key" in columns else "NULL"
    connection.execute(
        f"""
        INSERT INTO analysis_logs_new (
            id, user_id, guest_id, analysis_type, input_image_hash, result_json,
            model_name, prompt_version, analysis_mode, cache_key, created_at
        )
        SELECT
            id, user_id, {select_guest}, analysis_type, input_image_hash, result_json,
            model_name, {select_prompt}, {select_mode}, {select_cache}, created_at
        FROM analysis_logs
        """
    )
    connection.execute("DROP TABLE analysis_logs")
    connection.execute("ALTER TABLE analysis_logs_new RENAME TO analysis_logs")
    connection.commit()
    connection.execute("PRAGMA foreign_keys = ON")


def _ensure_indexes(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id_created_at
        ON usage_logs(user_id, created_at)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_usage_logs_guest_id_created_at
        ON usage_logs(guest_id, created_at)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_usage_logs_user_action_created_at
        ON usage_logs(user_id, action, created_at)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_usage_logs_guest_action_created_at
        ON usage_logs(guest_id, action, created_at)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_id_created_at
        ON analysis_logs(user_id, created_at)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_analysis_logs_guest_id_created_at
        ON analysis_logs(guest_id, created_at)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_analysis_logs_cache_key
        ON analysis_logs(cache_key)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_cache_key
        ON analysis_logs(user_id, cache_key)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_analysis_logs_guest_cache_key
        ON analysis_logs(guest_id, cache_key)
        """
    )
