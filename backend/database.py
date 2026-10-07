"""MariaDB connection helpers for the Genomic Portal backend."""

import os
import re
from pathlib import Path

import pymysql

from dotenv import load_dotenv

load_dotenv()


def _load_local_env():
    """Load backend/.env for local development without replacing real env vars."""
    env_file = Path(__file__).with_name(".env")
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_local_env()


def _setting(name, default=None):
    return os.getenv(name, default)


def _to_mariadb_placeholders(sql):
    """Keep existing endpoint SQL readable while using PyMySQL parameters."""
    return re.sub(r"\?", "%s", sql)


class Cursor:
    def __init__(self, cursor):
        self._cursor = cursor

    def execute(self, sql, params=None):
        self._cursor.execute(_to_mariadb_placeholders(sql), params)
        return self

    def executemany(self, sql, params):
        return self._cursor.executemany(_to_mariadb_placeholders(sql), params)

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class Connection:
    def __init__(self, connection):
        self._connection = connection

    def cursor(self):
        return Cursor(self._connection.cursor())

    def execute(self, sql, params=None):
        cursor = self.cursor()
        cursor.execute(sql, params)
        return cursor

    def commit(self):
        self._connection.commit()

    def rollback(self):
        self._connection.rollback()

    def close(self):
        self._connection.close()


def get_connection():
    """Create a dictionary-row MariaDB connection from environment settings."""
    return Connection(pymysql.connect(
        host=_setting("MARIADB_HOST", "127.0.0.1"),
        port=int(_setting("MARIADB_PORT", "3306")),
        user=_setting("MARIADB_USER", "genomic_app"),
        password=_setting("MARIADB_PASSWORD"),
        database=_setting("MARIADB_DATABASE", "genomic_dashboard"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    ))
