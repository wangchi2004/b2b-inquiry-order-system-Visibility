import csv
import subprocess
import sys
import sqlite3
import tempfile
import unittest
from pathlib import Path

from lead_cleaning.lead_cleaner import (
    classify_target,
    extract_google_place_id,
    lead_score,
    normalize_phone_us,
    normalize_website_domain,
    run_pipeline,
)


class LeadCleanerFunctionTests(unittest.TestCase):
    def test_normalize_phone_us_formats_ten_digit_numbers(self):
        self.assertEqual(normalize_phone_us("(310) 975-9001"), "+13109759001")

    def test_normalize_phone_us_accepts_existing_country_code(self):
        self.assertEqual(normalize_phone_us("+1 323 939 5622"), "+13239395622")

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

    def test_classify_shoe_related_from_title(self):
        result = classify_target("Downtown Sneaker Care", "Shoe store")
        self.assertEqual(result.target_type, "shoe_related")
        self.assertTrue(result.is_target_business)

    def test_classify_adjacent_service_from_category(self):
        result = classify_target("Careful Cleaners", "Dry cleaner")
        self.assertEqual(result.target_type, "adjacent_service")
        self.assertTrue(result.is_target_business)

    def test_classify_irrelevant_restaurant(self):
        result = classify_target("Chicken Place", "Chicken restaurant")
        self.assertEqual(result.target_type, "irrelevant")
        self.assertFalse(result.is_target_business)

    def test_lead_score_caps_at_100(self):
        score = lead_score("shoe_repair", "+13109759001", "https://example.com", 4.9, 200)
        self.assertEqual(score, 100)


class LeadCleanerPipelineTests(unittest.TestCase):
    def test_run_pipeline_imports_database_and_exports_csvs(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            source = tmp_path / "sample.csv"
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(
                    handle,
                    fieldnames=[
                        "imageUrl",
                        "title",
                        "totalScore",
                        "reviewsCount",
                        "street",
                        "city",
                        "state",
                        "countryCode",
                        "website",
                        "phone",
                        "categoryName",
                        "url",
                    ],
                )
                writer.writeheader()
                writer.writerow(
                    {
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
                    }
                )
                writer.writerow(
                    {
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
                    }
                )

            result = run_pipeline(source, tmp_path / "data" / "leads.db", tmp_path / "exports")

            self.assertEqual(result.rows_imported, 2)
            self.assertEqual(result.target_type_counts["shoe_repair"], 1)
            self.assertEqual(result.target_type_counts["irrelevant"], 1)
            self.assertTrue((tmp_path / "exports" / "marketing_priority.csv").exists())
            self.assertTrue((tmp_path / "exports" / "supabase_business_leads.csv").exists())

            connection = sqlite3.connect(tmp_path / "data" / "leads.db")
            row = connection.execute(
                "select business_name, phone_e164, website_domain, google_place_id, lead_score "
                "from business_leads where target_type = ?",
                ("shoe_repair",),
            ).fetchone()
            connection.close()
            self.assertEqual(row, ("Village Cobbler Shoe Repair", "+13105551212", "cobbler.example", "ChIJfixture", 100))

    def test_cli_file_execution_imports_package_from_project_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            source = tmp_path / "sample.csv"
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(
                    handle,
                    fieldnames=[
                        "imageUrl",
                        "title",
                        "totalScore",
                        "reviewsCount",
                        "street",
                        "city",
                        "state",
                        "countryCode",
                        "website",
                        "phone",
                        "categoryName",
                        "url",
                    ],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "imageUrl": "",
                        "title": "Village Cobbler Shoe Repair",
                        "totalScore": "4.8",
                        "reviewsCount": "89",
                        "street": "1 Main St",
                        "city": "Los Angeles",
                        "state": "California",
                        "countryCode": "US",
                        "website": "https://cobbler.example",
                        "phone": "(310) 555-1212",
                        "categoryName": "Shoe repair shop",
                        "url": "https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJfixture",
                    }
                )

            result = subprocess.run(
                [
                    sys.executable,
                    "lead_cleaning/clean_google_maps_leads.py",
                    str(source),
                    "--db-path",
                    str(tmp_path / "data" / "leads.db"),
                    "--export-dir",
                    str(tmp_path / "exports"),
                ],
                cwd=Path(__file__).resolve().parents[2],
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Rows imported: 1", result.stdout)


if __name__ == "__main__":
    unittest.main()
