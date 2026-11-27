
import { render } from "preact";
import { useState } from "preact/hooks";
import {
  classifyImage,
  type InferenceBackend,
  type SpeciesPrediction,
} from "./species-classifier.ts";

const SERVER_BASELINE: Record<
  string,
  {
    expected: string;
    server: string;
    confidence: number;
    uncertain: boolean;
  }
> = {
  "Copy_of_Copy_of_IMG_1351.webp": {
    expected: "Casuarina_equisetifolia",
    server: "Casuarina_equisetifolia",
    confidence: 0.999760,
    uncertain: false,
  },
  "Copy_of_Copy_of_IMG_1352.webp": {
    expected: "Casuarina_equisetifolia",
    server: "Casuarina_equisetifolia",
    confidence: 0.999964,
    uncertain: false,
  },
  "Copy_of_Copy_of_IMG_1985.webp": {
    expected: "Casuarina_equisetifolia",
    server: "Casuarina_equisetifolia",
    confidence: 0.999648,
    uncertain: false,
  },
  "Copy_of_IMG_0565.webp": {
    expected: "Casuarina_equisetifolia",
    server: "Casuarina_equisetifolia",
    confidence: 0.544132,
    uncertain: true,
  },
  "Copy_of_Copy_of_IMG_0680.webp": {
    expected: "Swietenia_Macrophylla",
    server: "Casuarina_equisetifolia",
    confidence: 0.996860,
    uncertain: false,
  },
  "Copy_of_IMG_0755.webp": {
    expected: "Swietenia_Macrophylla",
    server: "Swietenia_Macrophylla",
    confidence: 0.971313,
    uncertain: false,
  },
  "Copy_of_Mahogony_fruit.webp": {
    expected: "Swietenia_Macrophylla",
    server: "Tectona_Grandis",
    confidence: 0.997386,
    uncertain: false,
  },
  "Copy_of_Untitled_3000_x_2000_px_3.webp": {
    expected: "Swietenia_Macrophylla",
    server: "Swietenia_Macrophylla",
    confidence: 0.899986,
    uncertain: true,
  },
  "01.webp": {
    expected: "Tectona_Grandis",
    server: "Swietenia_Macrophylla",
    confidence: 0.946584,
    uncertain: true,
  },
  "02.webp": {
    expected: "Tectona_Grandis",
    server: "Swietenia_Macrophylla",
    confidence: 0.871466,
    uncertain: true,
  },
  "Copy_of_IMG_0156.webp": {
    expected: "Tectona_Grandis",
    server: "Casuarina_equisetifolia",
    confidence: 0.923327,
    uncertain: true,
  },
  "Copy_of_IMG_0160.webp": {
    expected: "Tectona_Grandis",
    server: "Swietenia_Macrophylla",
    confidence: 0.577964,
    uncertain: true,
  },
};

const ANDROID_FILENAME_MAP: Record<string, string> = {
  "34.webp": "Copy_of_IMG_0160.webp",
  "50.webp": "Copy_of_IMG_0160.webp",
  "27.webp": "Copy_of_IMG_0755.webp",
  "33.webp": "Copy_of_IMG_0156.webp",
  "32.webp": "02.webp",
  "47.webp": "01.webp",
  "28.webp": "Copy_of_Mahogony_fruit.webp",
  "45.webp": "Copy_of_Untitled_3000_x_2000_px_3.webp",
  "43.webp": "Copy_of_IMG_0755.webp",
  "26.webp": "Copy_of_Copy_of_IMG_0680.webp",
  "29.webp": "Copy_of_Untitled_3000_x_2000_px_3.webp",
  "38.webp": "Copy_of_Copy_of_IMG_1352.webp",
  "51.webp": "Copy_of_Copy_of_IMG_1351.webp",
  "22.webp": "Copy_of_Copy_of_IMG_1352.webp",
  "39.webp": "Copy_of_Copy_of_IMG_1985.webp",
  "24.webp": "Copy_of_IMG_0565.webp",
  "48.webp": "02.webp",
  "21.webp": "Copy_of_Copy_of_IMG_1351.webp",
  "40.webp": "Copy_of_IMG_0565.webp",
};

function getBaseline(file: File) {
  const originalFilename = ANDROID_FILENAME_MAP[file.name] ?? file.name;
  return SERVER_BASELINE[originalFilename];
}

type BackendResults = Record<
  InferenceBackend,
  Record<string, SpeciesPrediction>
>;

function TestApp() {
  const [files, setFiles] = useState<File[]>([]);
  const [backend, setBackend] = useState<InferenceBackend>("wasm");
  const [results, setResults] = useState<BackendResults>({
    wasm: {},
    webgpu: {},
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleClassify() {
    if (files.length !== 12 || loading) return;

    setLoading(true);
    setError(null);
    setProgress("");

    const failures: string[] = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      setProgress(`Classifying ${index + 1} of 12: ${file.name}`);

      try {
        const prediction = await classifyImage(file, backend);

        setResults((previous) => ({
          ...previous,
          [backend]: {
            ...previous[backend],
            [file.name]: prediction,
          },
        }));
      } catch (err) {
        failures.push(
          `${file.name}: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    }

    setProgress("Finished processing selected images.");

    if (failures.length > 0) {
      setError(failures.join("\n"));
    }

    setLoading(false);
  }

  const backendResults = results[backend];
  const completedCount = Object.keys(backendResults).length;

  const serverMatches = files.filter((file) => {
    const prediction = backendResults[file.name];
    const baseline = getBaseline(file);

    return prediction && baseline && prediction.species === baseline.server;
  }).length;

  const rows = files.map((file) => ({
    file,
    baseline: getBaseline(file),
    prediction: backendResults[file.name],
  }));

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>LiteRT Species Classifier</h1>

      <p>
        Compare browser-based WASM and WebGPU predictions against the
        Flask server baseline using 12 production images.
      </p>

      <section style={{ marginTop: "24px" }}>
        <h3>1. Select the 12 production images</h3>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const selected = Array.from(
              event.currentTarget.files ?? [],
            );

            setFiles(selected);
            setResults({ wasm: {}, webgpu: {} });
            setError(null);
            setProgress("");
          }}
        />

        <p>
          Selected: {files.length} / 12 images
        </p>

        {files.length !== 12 && (
          <p style={{ color: "#b45309" }}>
            Please select exactly 12 images.
          </p>
        )}

        {files.length === 12 && (
          <p style={{ color: "green" }}>
            All 12 images selected.
          </p>
        )}
      </section>

      <section style={{ marginTop: "24px" }}>
        <h3>2. Select the inference backend</h3>

        <select
          value={backend}
          disabled={loading}
          onChange={(event) => {
            setBackend(
              event.currentTarget.value as InferenceBackend,
            );
            setError(null);
          }}
        >
          <option value="wasm">WASM</option>
          <option value="webgpu">WebGPU</option>
        </select>

        <br />

        <button
          type="button"
          disabled={files.length !== 12 || loading}
          onClick={handleClassify}
          style={{
            marginTop: "16px",
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          {loading ? "Classifying..." : `Run all 12 using ${backend.toUpperCase()}`}
        </button>
      </section>

      {progress && (
        <p style={{ marginTop: "20px" }}>
          {progress}
        </p>
      )}

      {error && (
        <pre
          role="alert"
          style={{
            color: "red",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </pre>
      )}

      {completedCount > 0 && (
        <section style={{ marginTop: "30px" }}>
          <h2>{backend.toUpperCase()} Results</h2>

          <p>
            Completed: {completedCount} / 12
          </p>

          <p>
            Matches with Flask server: {serverMatches} / {completedCount}
          </p>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Image",
                    "Expected species",
                    "Server prediction",
                    "Browser prediction",
                    "Confidence",
                    "Uncertain",
                    "Time (ms)",
                    "Server match",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "10px",
                        borderBottom: "2px solid #999",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map(({ file, baseline, prediction }) => (
                  <tr key={file.name}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {file.name}
                    </td>

                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {baseline?.expected ?? "Unknown"}
                    </td>

                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {baseline?.server ?? "Unknown"}
                    </td>

                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {prediction?.species ?? "Pending"}
                    </td>

                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {prediction
                        ? `${(prediction.confidence * 100).toFixed(2)}%`
                        : "-"}
                    </td>

                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {prediction
                        ? prediction.uncertain ? "Yes" : "No"
                        : "-"}
                    </td>

                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {prediction
                        ? prediction.inferenceTimeMs.toFixed(2)
                        : "-"}
                    </td>

                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                      {!prediction
                        ? "-"
                        : prediction.species === baseline?.server
                          ? "Yes"
                          : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

render(<TestApp />, document.getElementById("app")!);
