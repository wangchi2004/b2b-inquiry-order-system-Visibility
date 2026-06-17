from pathlib import Path
import argparse
import sys

if __package__ is None or __package__ == "":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lead_cleaning.lead_cleaner import run_pipeline


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean Google Maps extractor CSV leads.")
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
