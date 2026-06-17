from pathlib import Path

from app.config import build_paths


def test_build_paths_uses_environment_override(tmp_path, monkeypatch):
    monkeypatch.setenv("CUSTOMER_SHIPPING_DATA_DIR", str(tmp_path))

    paths = build_paths()

    assert paths.local_data_dir == tmp_path
    assert paths.database_path == tmp_path / "app.db"
    assert paths.backup_dir == tmp_path / "backups"
    assert paths.export_dir == tmp_path / "exports"
    assert paths.log_dir == tmp_path / "logs"


def test_build_paths_uses_localappdata_on_windows(monkeypatch):
    monkeypatch.delenv("CUSTOMER_SHIPPING_DATA_DIR", raising=False)
    monkeypatch.setenv("LOCALAPPDATA", r"C:\Users\demo\AppData\Local")

    paths = build_paths(platform_name="win32")

    assert paths.local_data_dir == Path(r"C:\Users\demo\AppData\Local") / "CustomerShippingSettlement"
    assert paths.database_path == paths.local_data_dir / "app.db"


def test_build_paths_uses_project_data_for_source_mode(monkeypatch):
    monkeypatch.delenv("CUSTOMER_SHIPPING_DATA_DIR", raising=False)

    paths = build_paths(platform_name="darwin", frozen=False)

    assert paths.local_data_dir.name == "data"
    assert paths.database_path.name == "app.db"
