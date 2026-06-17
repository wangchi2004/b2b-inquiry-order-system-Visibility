from __future__ import annotations

import csv
import json
import re
import sqlite3
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


EXPORT_COLUMNS = [
    "source_file",
    "source_row_number",
    "business_name",
    "category",
    "target_type",
    "is_target_business",
    "exclusion_reason",
    "street",
    "city",
    "state",
    "country_code",
    "phone_raw",
    "phone_e164",
    "website",
    "website_domain",
    "email",
    "google_maps_url",
    "google_place_id",
    "image_url",
    "rating",
    "reviews_count",
    "lead_score",
    "marketing_status",
    "quality_notes",
]


@dataclass(frozen=True)
class Classification:
    target_type: str
    is_target_business: bool
    exclusion_reason: str


@dataclass(frozen=True)
class PipelineResult:
    rows_imported: int
    db_path: Path
    export_dir: Path
    target_type_counts: dict[str, int]
    export_counts: dict[str, int]


def normalize_phone_us(value: str) -> str:
    digits = re.sub(r"\D+", "", value or "")
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return ""


def extract_google_place_id(url: str) -> str:
    query = parse_qs(urlparse(url or "").query)
    return query.get("query_place_id", [""])[0]


def normalize_website_domain(website: str) -> str:
    value = (website or "").strip()
    if not value:
        return ""
    parsed = urlparse(value if "://" in value else f"https://{value}")
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain.rstrip("/")


def classify_target(title: str, category: str) -> Classification:
    text = f"{title or ''} {category or ''}".lower()
    if any(term in text for term in ("shoe repair", "cobbler", "leather repair")):
        return Classification("shoe_repair", True, "")
    if any(term in text for term in ("shoe", "sneaker", "boot", "orthopedic shoe")):
        return Classification("shoe_related", True, "")
    if any(term in text for term in ("dry cleaner", "tailor", "alteration", "leather", "repair service")):
        return Classification("adjacent_service", True, "")
    return Classification("irrelevant", False, "outside_target_industry")


def lead_score(target_type: str, phone_e164: str, website: str, rating: float | None, reviews_count: int | None) -> int:
    score = {"shoe_repair": 45, "shoe_related": 30, "adjacent_service": 15}.get(target_type, 0)
    if phone_e164:
        score += 20
    if website:
        score += 15
    if rating is not None:
        if rating >= 4.5:
            score += 10
        elif rating >= 4.0:
            score += 5
    if reviews_count is not None:
        if reviews_count >= 50:
            score += 10
        elif reviews_count >= 10:
            score += 5
    return min(score, 100)


def run_pipeline(csv_path: Path | str, db_path: Path | str, export_dir: Path | str) -> PipelineResult:
    csv_path = Path(csv_path)
    db_path = Path(db_path)
    export_dir = Path(export_dir)

    rows = _read_source_rows(csv_path)
    cleaned_rows = [_clean_row(csv_path, index, row) for index, row in enumerate(rows, start=2)]
    _add_duplicate_notes(cleaned_rows)

    db_path.parent.mkdir(parents=True, exist_ok=True)
    export_dir.mkdir(parents=True, exist_ok=True)
    _write_database(db_path, rows, cleaned_rows, csv_path)
    export_counts = _write_exports(export_dir, cleaned_rows)

    return PipelineResult(
        rows_imported=len(cleaned_rows),
        db_path=db_path,
        export_dir=export_dir,
        target_type_counts=dict(Counter(row["target_type"] for row in cleaned_rows)),
        export_counts=export_counts,
    )


def _read_source_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _clean_row(csv_path: Path, source_row_number: int, row: dict[str, str]) -> dict[str, Any]:
    business_name = _clean_text(row.get("title"))
    category = _clean_text(row.get("categoryName"))
    classification = classify_target(business_name, category)
    phone_raw = _clean_text(row.get("phone"))
    phone_e164 = normalize_phone_us(phone_raw)
    website = _clean_text(row.get("website"))
    rating = _parse_float(row.get("totalScore"))
    reviews_count = _parse_int(row.get("reviewsCount"))
    score = lead_score(classification.target_type, phone_e164, website, rating, reviews_count)
    city = _clean_text(row.get("city"))
    state = _normalize_state(_clean_text(row.get("state")))

    notes = []
    if phone_raw and not phone_e164:
        notes.append("invalid_phone")
    if not phone_raw:
        notes.append("missing_phone")
    if not city:
        notes.append("missing_city")
    if not state:
        notes.append("missing_state")
    if classification.target_type == "irrelevant":
        notes.append("excluded_industry")

    return {
        "source_file": str(csv_path),
        "source_row_number": source_row_number,
        "business_name": business_name,
        "category": category,
        "target_type": classification.target_type,
        "is_target_business": classification.is_target_business,
        "exclusion_reason": classification.exclusion_reason,
        "street": _clean_text(row.get("street")),
        "city": city,
        "state": state,
        "country_code": _clean_text(row.get("countryCode")),
        "phone_raw": phone_raw,
        "phone_e164": phone_e164,
        "website": website,
        "website_domain": normalize_website_domain(website),
        "email": "",
        "google_maps_url": _clean_text(row.get("url")),
        "google_place_id": extract_google_place_id(row.get("url", "")),
        "image_url": _clean_text(row.get("imageUrl")),
        "rating": rating,
        "reviews_count": reviews_count,
        "lead_score": score,
        "marketing_status": _marketing_status(classification.target_type),
        "quality_notes": ";".join(notes),
    }


def _add_duplicate_notes(rows: list[dict[str, Any]]) -> None:
    duplicate_fields = {
        "duplicate_name": "business_name",
        "duplicate_phone": "phone_e164",
        "duplicate_website": "website_domain",
    }
    for note, field in duplicate_fields.items():
        counts = Counter(str(row[field]).lower() for row in rows if row.get(field))
        duplicates = {value for value, count in counts.items() if count > 1}
        for row in rows:
            value = str(row[field]).lower() if row.get(field) else ""
            if value in duplicates:
                _append_note(row, note)


def _write_database(db_path: Path, raw_rows: list[dict[str, str]], cleaned_rows: list[dict[str, Any]], csv_path: Path) -> None:
    if db_path.exists():
        db_path.unlink()
    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            """
            create table raw_imports (
              id integer primary key autoincrement,
              source_file text not null,
              source_row_number integer not null,
              raw_json text not null,
              imported_at text not null
            )
            """
        )
        connection.execute(
            """
            create table business_leads (
              id integer primary key autoincrement,
              source_file text not null,
              source_row_number integer not null,
              business_name text not null,
              category text,
              target_type text not null,
              is_target_business integer not null,
              exclusion_reason text,
              street text,
              city text,
              state text,
              country_code text,
              phone_raw text,
              phone_e164 text,
              website text,
              website_domain text,
              email text,
              google_maps_url text,
              google_place_id text,
              image_url text,
              rating real,
              reviews_count integer,
              lead_score integer not null,
              marketing_status text not null,
              quality_notes text,
              created_at text not null
            )
            """
        )
        now = _utc_now()
        connection.executemany(
            "insert into raw_imports (source_file, source_row_number, raw_json, imported_at) values (?, ?, ?, ?)",
            [
                (str(csv_path), index, json.dumps(row, ensure_ascii=False), now)
                for index, row in enumerate(raw_rows, start=2)
            ],
        )
        columns = EXPORT_COLUMNS + ["created_at"]
        placeholders = ",".join("?" for _ in columns)
        connection.executemany(
            f"insert into business_leads ({','.join(columns)}) values ({placeholders})",
            [[_db_value(row.get(column)) for column in EXPORT_COLUMNS] + [now] for row in cleaned_rows],
        )
        connection.execute("create index idx_business_leads_place_id on business_leads(google_place_id)")
        connection.execute("create index idx_business_leads_target_score on business_leads(target_type, lead_score)")
        connection.commit()
    finally:
        connection.close()


def _write_exports(export_dir: Path, rows: list[dict[str, Any]]) -> dict[str, int]:
    exports = {
        "clean_leads.csv": rows,
        "marketing_priority.csv": sorted(
            [row for row in rows if row["is_target_business"]],
            key=lambda row: (row["lead_score"], row["reviews_count"] or 0),
            reverse=True,
        ),
        "needs_email_enrichment.csv": [
            row for row in rows if row["is_target_business"] and row["website"] and not row["email"]
        ],
        "needs_manual_review.csv": [
            row
            for row in rows
            if row["quality_notes"]
            or not row["google_place_id"]
            or row["target_type"] == "adjacent_service"
        ],
        "excluded_irrelevant.csv": [row for row in rows if row["target_type"] == "irrelevant"],
        "supabase_business_leads.csv": rows,
    }
    counts = {}
    for filename, export_rows in exports.items():
        _write_csv(export_dir / filename, export_rows)
        counts[filename] = len(export_rows)
    return counts


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=EXPORT_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow({column: _csv_value(row.get(column)) for column in EXPORT_COLUMNS})


def _clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _normalize_state(value: str) -> str:
    return {"CA": "California"}.get(value, value)


def _parse_float(value: Any) -> float | None:
    try:
        text = _clean_text(value)
        return float(text) if text else None
    except ValueError:
        return None


def _parse_int(value: Any) -> int | None:
    try:
        text = _clean_text(value).replace(",", "")
        return int(text) if text else None
    except ValueError:
        return None


def _marketing_status(target_type: str) -> str:
    return "not_target" if target_type == "irrelevant" else "new"


def _append_note(row: dict[str, Any], note: str) -> None:
    notes = [item for item in str(row.get("quality_notes") or "").split(";") if item]
    if note not in notes:
        notes.append(note)
    row["quality_notes"] = ";".join(notes)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _csv_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return value


def _db_value(value: Any) -> Any:
    if isinstance(value, bool):
        return 1 if value else 0
    return value
