# Shoe Repair Lead Cleaning Design

## Goal

Build a small, repeatable data-cleaning pipeline for Google Maps extractor CSV files so scraped repair-shop leads become usable contact records for later AI-assisted email, WhatsApp, and targeted marketing workflows.

## Source Data

The initial source file is `/Users/chiwang/Downloads/dataset_google-maps-extractor_2026-06-13_03-19-44-096.csv`.

It contains 520 rows and these columns:

- `imageUrl`
- `title`
- `totalScore`
- `reviewsCount`
- `street`
- `city`
- `state`
- `countryCode`
- `website`
- `phone`
- `categoryName`
- `url`

The file is a Google Maps scrape for the Los Angeles area. It is not a pure shoe-repair list. It includes shoe repair shops, shoe stores, dry cleaners, restaurants, bicycle shops, hardware stores, and other unrelated businesses.

## First Version Scope

The first version focuses on local, auditable cleaning:

- Read one CSV file from a command-line argument.
- Normalize fields into a SQLite database.
- Classify each row into marketing-relevant buckets.
- Extract Google Place ID from the Maps URL.
- Normalize phone numbers to US E.164 when possible.
- Normalize website domains for duplicate and enrichment checks.
- Assign a simple lead score.
- Export reviewable CSV files for marketing and cleanup.

This version will not send email, send WhatsApp messages, scrape websites for emails, or call paid AI APIs. Those should be added after the contact database is clean.

## Target Classification

Each source row gets:

- `target_type`
- `is_target_business`
- `exclusion_reason`

Classification rules:

- `shoe_repair`: category or title contains `shoe repair`, `cobbler`, or `leather repair`.
- `shoe_related`: title or category contains `shoe`, `sneaker`, `boot`, or `orthopedic shoe`, but does not meet the stricter shoe-repair rule.
- `adjacent_service`: category or title contains `dry cleaner`, `tailor`, `alteration`, `leather`, or `repair service`.
- `irrelevant`: restaurants, markets, bicycle shops, hardware stores, tire shops, and other unrelated categories.

`is_target_business` is true for `shoe_repair`, `shoe_related`, and `adjacent_service`; the marketing priority should start with `shoe_repair`.

## Clean Database Schema

Use SQLite at `lead_cleaning/data/leads.db`.

Table `raw_imports` stores source traceability:

- `id`
- `source_file`
- `source_row_number`
- `raw_json`
- `imported_at`

Table `business_leads` stores normalized leads:

- `id`
- `source_file`
- `source_row_number`
- `business_name`
- `category`
- `target_type`
- `is_target_business`
- `exclusion_reason`
- `street`
- `city`
- `state`
- `country_code`
- `phone_raw`
- `phone_e164`
- `website`
- `website_domain`
- `email`
- `google_maps_url`
- `google_place_id`
- `image_url`
- `rating`
- `reviews_count`
- `lead_score`
- `quality_notes`
- `created_at`

`email` is blank in this version because the source file has no email field.

## Deduplication Policy

Google Place ID is treated as the strongest unique identifier. The initial file has 520 unique Place IDs, so no rows are automatically deleted.

Rows receive `quality_notes` when weaker duplicate signals appear:

- Same normalized phone number used by multiple rows.
- Same normalized website domain used by multiple rows.
- Same normalized business name appears multiple times.

This avoids losing real branches or shared-phone multi-location businesses.

## Lead Scoring

Lead score is a simple 0-100 integer:

- Target type:
  - `shoe_repair`: +45
  - `shoe_related`: +30
  - `adjacent_service`: +15
  - `irrelevant`: +0
- Contactability:
  - Has phone: +20
  - Has website: +15
- Reputation:
  - Rating >= 4.5: +10
  - Rating >= 4.0 and < 4.5: +5
  - Reviews count >= 50: +10
  - Reviews count >= 10 and < 50: +5

Scores are capped at 100.

## Exports

The pipeline writes CSV exports into `lead_cleaning/exports/`:

- `clean_leads.csv`: all normalized rows.
- `marketing_priority.csv`: target businesses sorted by lead score descending.
- `needs_email_enrichment.csv`: target businesses with a website and no email.
- `needs_manual_review.csv`: rows with missing city/state, duplicate signals, unusual categories, or missing phone.
- `excluded_irrelevant.csv`: rows classified as irrelevant.

## Command-Line Interface

Run:

```bash
python3 lead_cleaning/clean_google_maps_leads.py /Users/chiwang/Downloads/dataset_google-maps-extractor_2026-06-13_03-19-44-096.csv
```

The command prints:

- Rows imported.
- Counts by target type.
- Counts by export file.
- Database path.

## Testing

Use Python standard library only so the tool runs without dependency setup.

Tests cover:

- Phone normalization.
- Google Place ID extraction.
- Website domain normalization.
- Target classification.
- Lead scoring.
- End-to-end import on a small fixture CSV.

## Future Extensions

After the clean database is verified, add:

- Website email enrichment.
- Consent and opt-out tracking.
- WhatsApp eligibility checks.
- AI-generated outreach drafts by segment.
- Campaign history and response status.
