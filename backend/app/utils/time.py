"""
Shared UTC timestamp handling.

Root cause this exists to fix: SQLAlchemy columns previously defaulted to
`datetime.utcnow()`, which returns a *naive* datetime (no tzinfo) whose
VALUE is UTC. Pydantic v2 serializes a naive datetime with no 'Z' or
offset suffix (e.g. "2026-09-10T12:52:51"). JavaScript's `new Date(...)`
treats an ISO string with no timezone designator as LOCAL time, not UTC --
so the browser silently reinterpreted a true UTC instant as if it were
already local time, displaying it ~5:30 behind for IST users (and by the
wrong, timezone-specific amount for anyone else).

The fix keeps the database layer unchanged (still naive UTC values --
no migration needed, SQLite doesn't reliably round-trip tzinfo anyway)
and instead fixes the boundary where a datetime becomes JSON: every
schema uses `UTCDateTime` below, which explicitly labels the value as UTC
before serializing it, so the frontend's `new Date(...)` parses it
correctly regardless of the browser's own timezone.
"""
from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def utc_now() -> datetime:
    """Naive datetime whose value is UTC -- used as the single source of
    truth for every `created_at`/`updated_at` default in the ORM models.

    Deliberately built as datetime.now(timezone.utc) with tzinfo stripped
    afterward, rather than the deprecated datetime.utcnow() (removed in
    future Python versions, and already emitting DeprecationWarning on
    3.12+). The stripped-tzinfo result is byte-for-byte equivalent to
    what datetime.utcnow() used to return -- same naive-UTC-value
    contract the database layer and serialize_utc() below already
    depend on -- so this is a pure implementation-detail fix, not a
    behavior change: no migration, no change to what gets stored or how
    it gets serialized."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def serialize_utc(dt: datetime) -> str:
    """Renders a datetime as an unambiguous UTC ISO-8601 string
    (e.g. '2026-09-10T12:52:51.123456Z'). A naive value (as produced by
    utc_now()) is assumed to already be UTC and is simply labeled as
    such; an aware value is converted to UTC first, in case one ever
    shows up. Either way, the output always carries an explicit UTC
    marker so `new Date(...)` on the frontend can never misread it as
    local time."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


# Drop-in replacement for a plain `datetime` type on any Pydantic schema
# field that should serialize as an unambiguous UTC timestamp.
UTCDateTime = Annotated[datetime, PlainSerializer(serialize_utc, return_type=str)]
