import argparse
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from src.pipeline import run_query

def main():
    parser = argparse.ArgumentParser(description="Query the Dietary Guidance RAG ChatBot offline.")
    parser.add_argument("--query", type=str, required=True, help="The question to ask.")
    parser.add_argument("--filter-doc", type=str, default=None, help="Optional document name to filter by.")
    
    args = parser.parse_args()
    
    console = Console()
    console.print(f"[bold blue]Querying:[/bold blue] {args.query}")
    if args.filter_doc:
        console.print(f"[bold cyan]Filter:[/bold cyan] {args.filter_doc}")
        
    console.print("[dim]Running pipeline...[/dim]\n")
    
    response = run_query(args.query, args.filter_doc)
    
    if response.refusal_mode == "OOS":
        console.print(Panel(response.answer, title="[bold red]Out of Scope[/bold red]", border_style="red"))
    elif response.refusal_mode == "NIC":
        console.print(Panel(response.answer, title="[bold yellow]Not In Corpus[/bold yellow]", border_style="yellow"))
    else:
        title_suffix = " [dim](Cross-Document)[/dim]" if response.is_cross_document else ""
        console.print(Panel(Markdown(response.answer), title=f"[bold green]Answer[/bold green]{title_suffix}", border_style="green"))
        
        if response.documents_used:
            console.print("\n[bold]Documents Used:[/bold]")
            for doc in response.documents_used:
                console.print(f"  - {doc}")

if __name__ == "__main__":
    main()
