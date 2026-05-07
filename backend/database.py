"""
Minimal SQLite persistence for predictions and users.
Uses stdlib sqlite3 only — no ORM dependency.
"""

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "agriintel.db"
_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def get_db():
    with _lock:
        conn = _conn()
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()


def init_db() -> None:
    with get_db() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            username  TEXT UNIQUE NOT NULL,
            password  TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS predictions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp      TEXT DEFAULT (datetime('now')),
            model_used     TEXT,
            recommendation TEXT,
            confidence     REAL,
            min_price      REAL,
            max_price      REAL,
            latency_ms     REAL,
            endpoint       TEXT
        );
        """)


# ── Predictions ───────────────────────────────────────────────────────────────
def save_prediction(model_used: str, recommendation: str, confidence: float,
                    min_price: float, max_price: float, latency_ms: float,
                    endpoint: str = "/predict") -> None:
    with get_db() as db:
        db.execute(
            "INSERT INTO predictions (model_used, recommendation, confidence, min_price, max_price, latency_ms, endpoint) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (model_used, recommendation, confidence, min_price, max_price, latency_ms, endpoint),
        )


def get_history(limit: int = 50) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM predictions ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_analytics() -> dict:
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
        sell  = db.execute("SELECT COUNT(*) FROM predictions WHERE recommendation='SELL'").fetchone()[0]
        hold  = db.execute("SELECT COUNT(*) FROM predictions WHERE recommendation='HOLD'").fetchone()[0]
        avg_conf = db.execute("SELECT AVG(confidence) FROM predictions").fetchone()[0] or 0.0
        avg_lat  = db.execute("SELECT AVG(latency_ms) FROM predictions").fetchone()[0] or 0.0
        by_model = db.execute(
            "SELECT model_used, COUNT(*) as cnt FROM predictions GROUP BY model_used"
        ).fetchall()
    return {
        "total": total,
        "sell": sell,
        "hold": hold,
        "avg_confidence": round(avg_conf, 4),
        "avg_latency_ms": round(avg_lat, 2),
        "by_model": {r["model_used"]: r["cnt"] for r in by_model},
    }


# ── Users ─────────────────────────────────────────────────────────────────────
def create_user(username: str, hashed_password: str) -> bool:
    try:
        with get_db() as db:
            db.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_password))
        return True
    except sqlite3.IntegrityError:
        return False


def get_user(username: str) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    return dict(row) if row else None
