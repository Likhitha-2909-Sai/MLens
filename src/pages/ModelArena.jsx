import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function ModelArena() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Read CSV headers
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setError("");

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const firstLine = text.split(/\r?\n/)[0];

      if (!firstLine) {
        return;
      }

      const detectedColumns = firstLine
        .split(",")
        .map((column) =>
          column.trim().replace(/^"|"$/g, "")
        )
        .filter(Boolean);

      setColumns(detectedColumns);

      if (detectedColumns.length > 0) {
        setTarget(
          detectedColumns[detectedColumns.length - 1]
        );
      }
    };

    reader.readAsText(selectedFile);
  };

  // Train all models
  const runArena = async () => {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    if (!target) {
      setError("Please select a target column.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();

    formData.append("file", file);
    formData.append("target", target);

    try {
      const response = await fetch(
        `${API_URL}/train-all`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Read the response as text first so non-JSON backend errors
      // do not hide the real problem.
      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { error: responseText };
      }

      if (!response.ok) {
        const backendDetail = data?.detail ?? data?.error;
        const detailMessage = Array.isArray(backendDetail)
          ? backendDetail
              .map((item) => item?.msg || JSON.stringify(item))
              .join("; ")
          : typeof backendDetail === "string"
            ? backendDetail
            : backendDetail
              ? JSON.stringify(backendDetail)
              : "";

        throw new Error(
          detailMessage ||
            `Backend request failed (HTTP ${response.status} ${response.statusText}).`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.error ||
            data?.detail ||
            "The backend received the request but model training failed."
        );
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error(
          "The backend returned an unexpected response. Check the /train-all endpoint."
        );
      }

      // Save result for Compare page
      sessionStorage.setItem(
        "mlensArenaResult",
        JSON.stringify(data)
      );

      setResult(data);
    } catch (err) {
      console.error("MLens Model Arena request failed:", err);

      if (
        err instanceof TypeError ||
        /failed to fetch|networkerror|network request failed/i.test(
          err?.message || ""
        )
      ) {
        setError(
          `Cannot reach the MLens backend at ${API_URL}. Make sure FastAPI is running, then open ${API_URL}/docs to test it. If the docs page opens, check the browser console for a CORS error.`
        );
      } else {
        setError(
          err?.message ||
            "An unexpected error occurred while connecting to the MLens backend."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Format percentage
  const formatPercent = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return `${(value * 100).toFixed(2)}%`;
  };

  // Format score
  const formatScore = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return Number(value).toFixed(4);
  };

  // Format algorithm name
  const formatAlgorithm = (algorithm) => {
    if (!algorithm) {
      return "—";
    }

    return algorithm
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <div
      style={{
        padding: "28px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Header */}

      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "30px",
            marginBottom: "8px",
          }}
        >
          Model Arena
        </h1>

        <p
          style={{
            color: "#64748b",
            margin: 0,
          }}
        >
          Train and compare multiple machine learning
          models on the same dataset.
        </p>
      </div>

      {/* Dataset Configuration */}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "22px",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            marginTop: 0,
            marginBottom: "18px",
          }}
        >
          Dataset Configuration
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(250px, 1fr) minmax(250px, 1fr) auto",
            gap: "16px",
            alignItems: "end",
          }}
        >
          {/* Dataset */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Dataset
            </label>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />

            {file && (
              <div
                style={{
                  marginTop: "7px",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                Selected: {file.name}
              </div>
            )}
          </div>

          {/* Target */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Target Column
            </label>

            <select
              value={target}
              onChange={(e) =>
                setTarget(e.target.value)
              }
              disabled={columns.length === 0}
              style={{
                width: "100%",
                padding: "11px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
              }}
            >
              <option value="">
                Select target
              </option>

              {columns.map((column) => (
                <option
                  key={column}
                  value={column}
                >
                  {column}
                </option>
              ))}
            </select>
          </div>

          {/* Run Button */}

          <button
            onClick={runArena}
            disabled={loading}
            style={{
              padding: "12px 22px",
              border: "none",
              borderRadius: "8px",
              background: loading
                ? "#94a3b8"
                : "#2563eb",
              color: "#ffffff",
              fontWeight: "600",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading
              ? "Training..."
              : "Run Model Arena"}
          </button>
        </div>

        {/* Error */}

        {error && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Loading */}

      {loading && (
        <div
          style={{
            padding: "30px",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ marginBottom: "8px" }}>
            Training models...
          </h3>

          <p
            style={{
              color: "#64748b",
              margin: 0,
            }}
          >
            MLens is training and comparing all
            available algorithms.
          </p>
        </div>
      )}

      {/* Results */}

      {result && !loading && (
        <>
          {/* Summary */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <SummaryCard
              title="Problem Type"
              value={result.problem_type}
            />

            <SummaryCard
              title="Rows"
              value={result.dataset?.rows}
            />

            <SummaryCard
              title="Features"
              value={result.dataset?.features}
            />

            <SummaryCard
              title="Best Model"
              value={formatAlgorithm(
                result.best_model?.algorithm
              )}
            />
          </div>

          {/* Arena Winner */}

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              padding: "22px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#64748b",
                    marginBottom: "6px",
                  }}
                >
                  🏆 Arena Winner
                </div>

                <h2
                  style={{
                    margin: "0 0 8px",
                    fontSize: "24px",
                  }}
                >
                  {formatAlgorithm(
                    result.best_model?.algorithm
                  )}
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                  }}
                >
                  Primary metric:{" "}
                  <strong>
                    {result.ranking_metric || "—"}
                  </strong>
                </p>
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  Score
                </div>

                <div
                  style={{
                    fontSize: "30px",
                    fontWeight: "700",
                  }}
                >
                  {formatScore(
                    result.best_model?.score
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "18px",
                padding: "12px 14px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#475569",
              }}
            >
              {result.ranking_reason || "—"}
            </div>

            {/* Compare Button */}

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => navigate("/compare")}
                style={{
                  padding: "12px 22px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition:
                    "background 0.2s ease",
                }}
              >
                Compare Models →
              </button>
            </div>
          </div>

          {/* Model Comparison */}

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              overflow: "hidden",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                }}
              >
                Model Comparison
              </h2>
            </div>

            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f8fafc",
                    }}
                  >
                    <TableHeader>Rank</TableHeader>
                    <TableHeader>Model</TableHeader>
                    <TableHeader>Accuracy</TableHeader>
                    <TableHeader>
                      Weighted F1
                    </TableHeader>
                    <TableHeader>
                      Macro F1
                    </TableHeader>
                    <TableHeader>
                      Balanced Accuracy
                    </TableHeader>
                    <TableHeader>
                      Training Time
                    </TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {(result.models || []).map(
                    (model) => {
                      const isWinner =
                        model.rank === 1;

                      return (
                        <tr
                          key={model.algorithm}
                          style={{
                            background: isWinner
                              ? "#f8fafc"
                              : "#ffffff",
                          }}
                        >
                          <TableCell>
                            <strong>
                              #{model.rank}
                            </strong>
                          </TableCell>

                          <TableCell>
                            <strong>
                              {formatAlgorithm(
                                model.algorithm
                              )}
                            </strong>

                            {isWinner && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  fontSize: "11px",
                                  padding: "3px 7px",
                                  borderRadius:
                                    "999px",
                                  background:
                                    "#e2e8f0",
                                }}
                              >
                                BEST
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {formatPercent(
                              model.metrics
                                ?.accuracy
                            )}
                          </TableCell>

                          <TableCell>
                            {formatPercent(
                              model.metrics
                                ?.f1_score
                            )}
                          </TableCell>

                          <TableCell>
                            <strong>
                              {formatPercent(
                                model.metrics
                                  ?.macro_f1
                              )}
                            </strong>
                          </TableCell>

                          <TableCell>
                            {formatPercent(
                              model.metrics
                                ?.balanced_accuracy
                            )}
                          </TableCell>

                          <TableCell>
                            {model.training_time_seconds ??
                              "—"}{" "}
                            sec
                          </TableCell>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Class Distribution */}

          {result.class_analysis && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "22px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "18px",
                }}
              >
                Class Distribution
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(4, minmax(0, 1fr))",
                  gap: "14px",
                }}
              >
                <MetricCard
                  label="Classes"
                  value={
                    result.class_analysis
                      .number_of_classes
                  }
                />

                <MetricCard
                  label="Minimum Samples"
                  value={
                    result.class_analysis
                      .minimum_samples_per_class
                  }
                />

                <MetricCard
                  label="Maximum Samples"
                  value={
                    result.class_analysis
                      .maximum_samples_per_class
                  }
                />

                <MetricCard
                  label="Imbalance Ratio"
                  value={`${result.class_analysis.imbalance_ratio}×`}
                />

                <MetricCard
                  label="Rare Classes"
                  value={
                    result.class_analysis
                      .rare_classes
                  }
                />

                <MetricCard
                  label="Rare Class %"
                  value={`${result.class_analysis.rare_class_percentage}%`}
                />

                <MetricCard
                  label="Median Samples"
                  value={
                    result.class_analysis
                      .median_samples_per_class
                  }
                />

                <MetricCard
                  label="Cardinality"
                  value={
                    result.class_analysis
                      .cardinality
                  }
                />
              </div>
            </div>
          )}

          {/* MLens Insights */}

          {result.insights &&
            result.insights.length > 0 && (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "22px",
                  marginBottom: "24px",
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    fontSize: "18px",
                  }}
                >
                  MLens Insights
                </h2>

                <div>
                  {result.insights.map(
                    (insight, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "10px 0",
                          borderBottom:
                            index <
                            result.insights.length -
                              1
                              ? "1px solid #f1f5f9"
                              : "none",
                          color: "#475569",
                          fontSize: "14px",
                        }}
                      >
                        <span>💡</span>

                        <span>{insight}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}


// =========================================================
// SMALL COMPONENTS
// =========================================================

function SummaryCard({ title, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#64748b",
          marginBottom: "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "21px",
          fontWeight: "700",
        }}
      >
        {value}
      </div>
    </div>
  );
}


function MetricCard({ label, value }) {
  return (
    <div
      style={{
        padding: "15px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "19px",
          fontWeight: "700",
          textTransform:
            typeof value === "string"
              ? "capitalize"
              : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}


function TableHeader({ children }) {
  return (
    <th
      style={{
        padding: "13px 16px",
        textAlign: "left",
        fontSize: "12px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "#64748b",
        borderBottom:
          "1px solid #e2e8f0",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}


function TableCell({ children }) {
  return (
    <td
      style={{
        padding: "15px 16px",
        borderBottom:
          "1px solid #f1f5f9",
        fontSize: "14px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}


export default ModelArena;