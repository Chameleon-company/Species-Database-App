from pathlib import Path
import pandas as pd

# Default path: project_root/data/species.xlsx
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "species.xlsx"


def load_species_df(path: str | Path | None = None) -> pd.DataFrame:
    """
    Load the species Excel file into a pandas DataFrame.
    """
    excel_path = Path(path) if path else DATA_PATH

    if not excel_path.exists():
        raise FileNotFoundError(f"Species file not found at: {excel_path}")

    df = pd.read_excel(excel_path)

    # Normalise column names: strip spaces
    df.columns = [c.strip() for c in df.columns]

    return df


def list_species(df: pd.DataFrame, limit: int | None = None) -> pd.DataFrame:
    """
    Return a subset of species, optionally limited to N rows.
    """
    if limit is None:
        return df
    return df.head(limit)


def filter_species(
    df: pd.DataFrame,
    scientific_name: str | None = None,
    common_name: str | None = None,
    habitat: str | None = None,
    leaf_type: str | None = None,
    pest: str | None = None,
) -> pd.DataFrame:
    """
    Filter species based on optional criteria (contains search).
    """
    filtered = df.copy()

    if scientific_name:
        filtered = filtered[
            filtered["Scientific name"].str.contains(scientific_name, case=False, na=False)
        ]

    if common_name:
        filtered = filtered[
            filtered["Common name"].str.contains(common_name, case=False, na=False)
        ]

    if habitat:
        filtered = filtered[
            filtered["Habitat"].str.contains(habitat, case=False, na=False)
        ]

    if leaf_type:
        filtered = filtered[
            filtered["Leaf type"].str.contains(leaf_type, case=False, na=False)
        ]

    if pest:
        filtered = filtered[
            filtered["Pest"].str.contains(pest, case=False, na=False)
        ]

    return filtered


def get_species_by_scientific_name(df: pd.DataFrame, scientific_name: str):
    """
    Get a single species by exact scientific name.
    """
    mask = df["Scientific name"].str.lower() == scientific_name.lower()
    match = df[mask]
    if match.empty:
        return None
    return match.iloc[0]
