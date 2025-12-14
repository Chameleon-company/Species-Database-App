import typer
from rich.console import Console
from rich.table import Table

from .services import (
    load_species_df,
    list_species,
    filter_species,
    get_species_by_scientific_name,
)

app = typer.Typer(help="Species Database CLI")
console = Console()


@app.command()
def list_all(limit: int = typer.Option(10, help="Number of species to show (0 = all)")):
    """
    List species from the database.
    """
    df = load_species_df()
    data = list_species(df, limit=None if limit == 0 else limit)

    table = Table(title="Species List")
    table.add_column("Scientific name")
    table.add_column("Common name")
    table.add_column("Habitat")

    for _, row in data.iterrows():
        table.add_row(
            str(row.get("Scientific name", "")),
            str(row.get("Common name", "")),
            str(row.get("Habitat", "")),
        )

    console.print(table)


@app.command()
def search(
    scientific_name: str = typer.Option(None, help="Filter by scientific name (contains)"),
    common_name: str = typer.Option(None, help="Filter by common name (contains)"),
    habitat: str = typer.Option(None, help="Filter by habitat (contains)"),
    leaf_type: str = typer.Option(None, help="Filter by leaf type (contains)"),
    pest: str = typer.Option(None, help="Filter by pest (contains)"),
):
    """
    Search species with multiple filters.
    """
    df = load_species_df()
    result = filter_species(
        df,
        scientific_name=scientific_name,
        common_name=common_name,
        habitat=habitat,
        leaf_type=leaf_type,
        pest=pest,
    )

    if result.empty:
        console.print("No species found with these filters.")
        raise typer.Exit(code=0)

    table = Table(title="Search Results")
    for col in result.columns:
        table.add_column(str(col))

    for _, row in result.iterrows():
        table.add_row(*[str(v) for v in row.values])

    console.print(table)


@app.command()
def show(scientific_name: str = typer.Argument(..., help="Exact scientific name")):
    """
    Show full details for one species by scientific name.
    """
    df = load_species_df()
    species = get_species_by_scientific_name(df, scientific_name)

    if species is None:
        console.print(f"No species found with scientific name: {scientific_name}")
        raise typer.Exit(code=1)

    console.print(f"[bold]Species details for:[/bold] {scientific_name}")
    for col, value in species.items():
        console.print(f"- {col}: {value}")


def main():
    app()


if __name__ == "__main__":
    main()
