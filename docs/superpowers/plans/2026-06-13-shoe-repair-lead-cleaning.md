# Shoe Repair Lead Cleaning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local CSV-to-SQLite cleaning pipeline for Google Maps shoe-repair leads, with reviewable CSV exports.

**Architecture:** A small Python standard-library package under `lead_cleaning/` owns normalization, classification, scoring, SQLite persistence, and CSV exports. A command-line script wraps the package so a raw Google Maps extractor CSV can be imported repeatedly into a fresh database. Tests use `unittest` and temporary fixture CSV files.

**Tech Stack:** Python 3, `csv`, `sqlite3`, `urllib.parse`, `unittest`, SQLite.

---

## File Structure

- Create `lead_cleaning/__init__.py`: package marker.
- Create `lead_cleaning/lead_cleaner.py`: pure cleaning functions, import orchestration, SQLite schema, CSV export logic.
- Create `lead_cleaning/clean_google_maps_leads.py`: command-line entry point.
- Create `lead_cleaning/tests/test_lead_cleaner.py`: unit and end-to-end tests.
- Runtime output directories:
  - `lead_cleaning/data/leads.db`
  - `lead_cleaning/exports/*.csv`

## Task 1: Core Normalization Tests

**Files:**
- Create: `lead_cleaning/tests/test_lead_cleaner.py`
- Create: `lead_cleaning/__init__.py`

- [ ] **Step 1: Write failing tests for pure functions**

```python
import unittest

from lead_cleaning.lead_cleaner import (
    classify_target,
    extract_google_place_id,
    lead_score,
    normalize_phone_us,
    normalize_website_domain,
)


class LeadCleanerFunctionTests(unittest.TestCase):
    def test_normalize_phone_us_formats_ten_digit_numbers(self):
        self.assertEqual(normalize_phone_us("(310) 975-9001"), "+13109759001")

    def test_normalize_phone_us_returns_blank_for_missing_phone(self):
        self.assertEqual(normalize_phone_us(""), "")

    def test_extract_google_place_id_from_maps_url(self):
        url = "https://www.google.com/maps/search/?api=1&query=SHOEBER&query_place_id=ChIJabc123"
        self.assertEqual(extract_google_place_id(url), "ChIJabc123")

    def test_normalize_website_domain_removes_scheme_www_and_path(self):
        self.assertEqual(normalize_website_domain("https://www.example.com/contact"), "example.com")

    def test_classify_shoe_repair_from_category(self):
        result = classify_target("Village Cobbler", "Shoe repair shop")
        self.assertEqual(result.target_type, "shoe_repair")
        self.assertTrue(result.is_target_business)

    def test_classify_irrelevant_restaurant(self):
        result = classify_target("Chicken Place", "Chicken restaurant")
        self.assertEqual(result.target_type, "irrelevant")
        self.assertFalse(result.is_target_business)

    def test_lead_score_caps_at_100(self):
        score = lead_score("shoe_repair", "+13109759001", "https://example.com", 4.9, 200)
        self.assertEqual(score, 100)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
python3 -m unittest lead_cleaning.tests.test_lead_cleaner -v
```

Expected: fail because `lead_cleaning.lead_cleaner` does not exist.

- [ ] **Step 3: Create the package marker**

```python
"""Lead cleaning tools for Google Maps business exports."""
```

- [ ] **Step 4: Commit**

```bash
git add lead_cleaning/__init__.py lead_cleaning/tests/test_lead_cleaner.py
git commit -m "test: define lead cleaning normalization behavior"
```

## Task 2: Pure Cleaning Functions

**Files:**
- Create: `lead_cleaning/lead_cleaner.py`
- Test: `lead_cleaning/tests/test_lead_cleaner.py`

- [ ] **Step 1: Implement pure functions**

```python
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse
import re


@dataclass(frozen=True)
class Classification:
    target_type: str
    is_target_business: bool
    exclusion_reason: str


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
```

- [ ] **Step 2: Run the function tests**

Run:

```bash
python3 -m unittest lead_cleaning.tests.test_lead_cleaner -v
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lead_cleaning/lead_cleaner.py lead_cleaning/tests/test_lead_cleaner.py
git commit -m "feat: add lead cleaning normalization rules"
```

## Task 3: End-to-End Import and Export

**Files:**
- Modify: `lead_cleaning/lead_cleaner.py`
- Modify: `lead_cleaning/tests/test_lead_cleaner.py`

- [ ] **Step 1: Add an end-to-end test**

```python
import csv
import sqlite3
import tempfile
from pathlib import Path

from lead_cleaning.lead_cleaner import run_pipeline


class LeadCleanerPipelineTests(unittest.TestCase):
    def test_run_pipeline_imports_database_and_exports_csvs(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            source = tmp_path / "sample.csv"
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=[
                    "imageUrl", "title", "totalScore", "reviewsCount", "street", "city",
                    "state", "countryCode", "website", "phone", "categoryName", "url",
                ])
                writer.writeheader()
                writer.writerow({
                    "imageUrl": "https://img.example/1",
                    "title": "Village Cobbler Shoe Repair",
                    "totalScore": "4.8",
                    "reviewsCount": "89",
                    "street": "1 Main St",
                    "city": "Los Angeles",
                    "state": "California",
                    "countryCode": "US",
                    "website": "https://www.cobbler.example/contact",
                    "phone": "(310) 555-1212",
                    "categoryName": "Shoe repair shop",
                    "url": "https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJfixture",
                })
                writer.writerow({
                    "imageUrl": "",
                    "title": "Chicken Place",
                    "totalScore": "4.1",
                    "reviewsCount": "12",
                    "street": "2 Main St",
                    "city": "Los Angeles",
                    "state": "California",
                    "countryCode": "US",
                    "website": "",
                    "phone": "",
                    "categoryName": "Chicken restaurant",
                    "url": "https://www.google.com/maps/search/?api=1&query=y&query_place_id=ChIJignore",
                })

            result = run_pipeline(source, tmp_path / "data" / "leads.db", tmp_path / "exports")

            self.assertEqual(result.rows_imported, 2)
            self.assertEqual(result.target_type_counts["shoe_repair"], 1)
            self.assertEqual(result.target_type_counts["irrelevant"], 1)
            self.assertTrue((tmp_path / "exports" / "marketing_priority.csv").exists())

            connection = sqlite3.connect(tmp_path / "data" / "leads.db")
            row = connection.execute(
                "select business_name, phone_e164, website_domain, google_place_id, lead_score from business_leads where target_type = ?",
                ("shoe_repair",),
            ).fetchone()
            connection.close()
            self.assertEqual(row, ("Village Cobbler Shoe Repair", "+13105551212", "cobbler.example", "ChIJfixture", 100))
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
python3 -m unittest lead_cleaning.tests.test_lead_cleaner -v
```

Expected: fail because `run_pipeline` does not exist.

- [ ] **Step 3: Implement SQLite import and CSV exports**

Add `PipelineResult`, `run_pipeline`, schema creation, row transformation, duplicate note assignment, and export helpers in `lead_cleaning/lead_cleaner.py`.

- [ ] **Step 4: Run the tests**

Run:

```bash
python3 -m unittest lead_cleaning.tests.test_lead_cleaner -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lead_cleaning/lead_cleaner.py lead_cleaning/tests/test_lead_cleaner.py
git commit -m "feat: import cleaned leads into sqlite and exports"
```

## Task 4: Command-Line Runner

**Files:**
- Create: `lead_cleaning/clean_google_maps_leads.py`
- Test manually with the real CSV.

- [ ] **Step 1: Add CLI script**

```python
from pathlib import Path
import argparse

from lead_cleaning.lead_cleaner import run_pipeline


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean Google Maps extractor CSV leads into SQLite and CSV exports.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--db-path", type=Path, default=Path("lead_cleaning/data/leads.db"))
    parser.add_argument("--export-dir", type=Path, default=Path("lead_cleaning/exports"))
    args = parser.parse_args()

    result = run_pipeline(args.csv_path, args.db_path, args.export_dir)
    print(f"Rows imported: {result.rows_imported}")
    print(f"Database: {result.db_path}")
    print("Target types:")
    for key, value in sorted(result.target_type_counts.items()):
        print(f"  {key}: {value}")
    print("Exports:")
    for key, value in sorted(result.export_counts.items()):
        print(f"  {key}: {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run the CLI**

Run:

```bash
python3 lead_cleaning/clean_google_maps_leads.py /Users/chiwang/Downloads/dataset_google-maps-extractor_2026-06-13_03-19-44-096.csv
```

Expected: prints 520 imported rows and creates the database plus five CSV exports.

- [ ] **Step 3: Commit**

```bash
git add lead_cleaning/clean_google_maps_leads.py lead_cleaning/data/.gitkeep lead_cleaning/exports/.gitkeep
git commit -m "feat: add google maps lead cleaning cli"
```

## Task 5: Verification on Real Data

**Files:**
- Runtime outputs: `lead_cleaning/data/leads.db`, `lead_cleaning/exports/*.csv`

- [ ] **Step 1: Run all tests**

Run:

```bash
python3 -m unittest lead_cleaning.tests.test_lead_cleaner -v
```

Expected: all tests pass.

- [ ] **Step 2: Inspect SQLite counts**

Run:

```bash
sqlite3 lead_cleaning/data/leads.db "select target_type, count(*) from business_leads group by target_type order by count(*) desc;"
```

Expected: rows grouped by `shoe_repair`, `shoe_related`, `adjacent_service`, and `irrelevant`.

- [ ] **Step 3: Inspect marketing priority rows**

Run:

```bash
python3 - <<'PY'
import csv
from pathlib import Path
path = Path("lead_cleaning/exports/marketing_priority.csv")
with path.open(encoding="utf-8", newline="") as handle:
    for row in list(csv.DictReader(handle))[:10]:
        print(row["business_name"], row["target_type"], row["lead_score"], row["phone_e164"], row["website_domain"])
PY
```

Expected: top rows are target businesses with high lead scores and usable contact fields.

- [ ] **Step 4: Commit runtime-independent final files**

```bash
git add docs/superpowers/specs/2026-06-13-shoe-repair-lead-cleaning-design.md docs/superpowers/plans/2026-06-13-shoe-repair-lead-cleaning.md lead_cleaning
git commit -m "feat: add shoe repair lead cleaning pipeline"
```

Do not commit generated `lead_cleaning/data/leads.db` unless the user explicitly wants the generated local database tracked in git.
