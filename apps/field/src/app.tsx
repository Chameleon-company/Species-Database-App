import { useEffect, useState } from "preact/hooks";
import { type Species, fetchBundle, firstSpecies } from "./bundle.ts";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; species: Species | undefined };

const apiBase = import.meta.env.VITE_API_BASE;

const initialState: State = apiBase
  ? { status: "loading" }
  : { status: "error", message: "VITE_API_BASE is not set." };

export function App() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    if (!apiBase) return;
    const controller = new AbortController();
    fetchBundle(apiBase, { signal: controller.signal })
      .then((bundle) => setState({ status: "ready", species: firstSpecies(bundle) }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      });
    return () => controller.abort();
  }, []);

  if (state.status === "loading") return <p>Loading species…</p>;
  if (state.status === "error") return <p role="alert">Could not load species. {state.message}</p>;
  if (!state.species) return <p>No species found.</p>;
  return (
    <article>
      <h1>{state.species.common_name}</h1>
      <p>
        <i>{state.species.scientific_name}</i>
      </p>
    </article>
  );
}
