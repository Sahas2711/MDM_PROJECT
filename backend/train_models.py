from __future__ import annotations

import json
from pathlib import Path

from ml_pipeline import run_training_pipeline


ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "dataset" / "crop_prices.csv"
ARTIFACTS_DIR = ROOT / "backend" / "models"


def main() -> None:
    result = run_training_pipeline(
        dataset_path=DATASET_PATH,
        artifacts_dir=ARTIFACTS_DIR,
    )
    print(json.dumps(result["metadata"]["model_comparison_table"], indent=2))
    print(f"artifact_manifest.json -> {ARTIFACTS_DIR / 'artifact_manifest.json'}")


if __name__ == "__main__":
    main()
