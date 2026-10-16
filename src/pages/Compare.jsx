import { useEffect, useState } from "react";

function Compare() {
  const [arenaResult, setArenaResult] = useState(null);
  const [modelA, setModelA] = useState("");
  const [modelB, setModelB] = useState("");
  const [error, setError] = useState("");

  // ---------------------------------------------------------
  // Load Model Arena result
  // ---------------------------------------------------------

  useEffect(() => {
    try {
      const storedResult =
        sessionStorage.getItem("mlensArenaResult");

      if (!storedResult) {
        setError(
          "No Model Arena results found. Please run Model Arena first."
        );
        return;
      }

      const parsedResult = JSON.parse(storedResult);

      if (
        !parsedResult ||
        !Array.isArray(parsedResult.models) ||
        parsedResult.models.length < 2
      ) {
        setError(
          "Not enough model results available for comparison."
        );
        return;
      }

      setArenaResult(parsedResult);

      // Default models
      setModelA(parsedResult.models[0].algorithm);
      setModelB(parsedResult.models[1].algorithm);
    } catch (err) {
      setError(
        "Unable to load Model Arena results."
      );
    }
  }, []);

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

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

  const formatPercent = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return Number(value).toFixed(4);
  };

  const formatTime = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return `${Number(value).toFixed(3)} sec`;
  };

  const getModel = (algorithm) => {
    if (!arenaResult?.models) {
      return null;
    }

    return arenaResult.models.find(
      (model) =>
        model.algorithm === algorithm
    );
  };

  const getWinner = (
    valueA,
    valueB,
    lowerIsBetter = false
  ) => {
    if (
      valueA === undefined ||
      valueA === null ||
      valueB === undefined ||
      valueB === null
    ) {
      return "tie";
    }

    if (valueA === valueB) {
      return "tie";
    }

    if (lowerIsBetter) {
      return valueA < valueB ? "A" : "B";
    }

    return valueA > valueB ? "A" : "B";
  };

  // ---------------------------------------------------------
  // Selected models
  // ---------------------------------------------------------

  const selectedA = getModel(modelA);
  const selectedB = getModel(modelB);

  // ---------------------------------------------------------
  // Classification metrics
  // ---------------------------------------------------------

  const classificationMetrics = [
    {
      key: "accuracy",
      label: "Accuracy",
      lowerIsBetter: false,
      formatter: formatPercent,
    },
    {
      key: "f1_score",
      label: "Weighted F1",
      lowerIsBetter: false,
      formatter: formatPercent,
    },
    {
      key: "macro_f1",
      label: "Macro F1",
      lowerIsBetter: false,
      formatter: formatPercent,
    },
    {
      key: "balanced_accuracy",
      label: "Balanced Accuracy",
      lowerIsBetter: false,
      formatter: formatPercent,
    },
    {
      key: "training_time_seconds",
      label: "Training Time",
      lowerIsBetter: true,
      formatter: formatTime,
      source: "root",
    },
  ];

  // ---------------------------------------------------------
  // Regression metrics
  // ---------------------------------------------------------

  const regressionMetrics = [
    {
      key: "mae",
      label: "MAE",
      lowerIsBetter: true,
      formatter: formatNumber,
    },
    {
      key: "mse",
      label: "MSE",
      lowerIsBetter: true,
      formatter: formatNumber,
    },
    {
      key: "rmse",
      label: "RMSE",
      lowerIsBetter: true,
      formatter: formatNumber,
    },
    {
      key: "r2_score",
      label: "R² Score",
      lowerIsBetter: false,
      formatter: formatNumber,
    },
    {
      key: "training_time_seconds",
      label: "Training Time",
      lowerIsBetter: true,
      formatter: formatTime,
      source: "root",
    },
  ];

  const metrics =
    arenaResult?.problem_type === "regression"
      ? regressionMetrics
      : classificationMetrics;

  // ---------------------------------------------------------
  // Metric value helper
  // ---------------------------------------------------------

  const getMetricValue = (model, metric) => {
    if (!model) {
      return null;
    }

    if (metric.source === "root") {
      return model[metric.key];
    }

    return model.metrics?.[metric.key];
  };

  // ---------------------------------------------------------
  // Calculate metric wins
  // ---------------------------------------------------------

  let winsA = 0;
  let winsB = 0;
  let ties = 0;

  if (selectedA && selectedB) {
    metrics.forEach((metric) => {
      const valueA = getMetricValue(
        selectedA,
        metric
      );

      const valueB = getMetricValue(
        selectedB,
        metric
      );

      const winner = getWinner(
        valueA,
        valueB,
        metric.lowerIsBetter
      );

      if (winner === "A") {
        winsA++;
      } else if (winner === "B") {
        winsB++;
      } else {
        ties++;
      }
    });
  }

  // ---------------------------------------------------------
  // Primary metric
  // ---------------------------------------------------------

  const primaryMetric =
    arenaResult?.ranking_metric;

  const primaryMetricConfig =
    metrics.find(
      (metric) =>
        metric.key === primaryMetric
    );

  const primaryValueA =
    primaryMetricConfig && selectedA
      ? getMetricValue(
          selectedA,
          primaryMetricConfig
        )
      : null;

  const primaryValueB =
    primaryMetricConfig && selectedB
      ? getMetricValue(
          selectedB,
          primaryMetricConfig
        )
      : null;

  const primaryWinner =
    primaryMetricConfig
      ? getWinner(
          primaryValueA,
          primaryValueB,
          primaryMetricConfig.lowerIsBetter
        )
      : "tie";

  // ---------------------------------------------------------
  // Render error state
  // ---------------------------------------------------------

  if (error) {
    return (
      <div
        style={{
          padding: "28px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "30px",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: "10px",
            }}
          >
            Compare Models
          </h1>

          <div
            style={{
              padding: "14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "8px",
            }}
          >
            {error}
          </div>

          <p
            style={{
              color: "#64748b",
              marginTop: "18px",
            }}
          >
            Go to Model Arena, upload your dataset,
            and run the models first.
          </p>
        </div>
      </div>
    );
  }

  if (!arenaResult) {
    return (
      <div
        style={{
          padding: "28px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            padding: "30px",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
          }}
        >
          Loading comparison...
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div
      style={{
        padding: "28px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Header */}

      <div
        style={{
          marginBottom: "28px",
        }}
      >
        <h1
          style={{
            fontSize: "30px",
            marginBottom: "8px",
          }}
        >
          Compare Models
        </h1>

        <p
          style={{
            color: "#64748b",
            margin: 0,
          }}
        >
          Compare two trained models using the
          same evaluation metrics.
        </p>
      </div>

      {/* Dataset Summary */}

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
          title="Dataset Rows"
          value={
            arenaResult.dataset?.rows ?? "—"
          }
        />

        <SummaryCard
          title="Features"
          value={
            arenaResult.dataset?.features ?? "—"
          }
        />

        <SummaryCard
          title="Problem Type"
          value={
            arenaResult.problem_type
          }
        />

        <SummaryCard
          title="Ranking Metric"
          value={
            arenaResult.ranking_metric
          }
        />
      </div>

      {/* Model Selection */}

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
            marginBottom: "18px",
          }}
        >
          Select Models
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "20px",
          }}
        >
          {/* Model A */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Model A
            </label>

            <select
              value={modelA}
              onChange={(e) =>
                setModelA(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                fontSize: "14px",
              }}
            >
              {arenaResult.models.map(
                (model) => (
                  <option
                    key={model.algorithm}
                    value={model.algorithm}
                  >
                    {formatAlgorithm(
                      model.algorithm
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Model B */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Model B
            </label>

            <select
              value={modelB}
              onChange={(e) =>
                setModelB(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                fontSize: "14px",
              }}
            >
              {arenaResult.models.map(
                (model) => (
                  <option
                    key={model.algorithm}
                    value={model.algorithm}
                  >
                    {formatAlgorithm(
                      model.algorithm
                    )}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Summary */}

      {selectedA && selectedB && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <SummaryCard
            title={`${formatAlgorithm(
              modelA
            )} Metric Wins`}
            value={winsA}
          />

          <SummaryCard
            title={`${formatAlgorithm(
              modelB
            )} Metric Wins`}
            value={winsB}
          />

          <SummaryCard
            title="Ties"
            value={ties}
          />
        </div>
      )}

      {/* Primary Metric Winner */}

      {selectedA && selectedB && (
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
              fontSize: "13px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748b",
              marginBottom: "8px",
            }}
          >
            Primary Metric Comparison
          </div>

          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "23px",
            }}
          >
            {primaryMetric
              ? formatAlgorithm(primaryMetric)
              : "Primary Metric"}
          </h2>

          {primaryWinner === "A" && (
            <p
              style={{
                margin: 0,
                color: "#166534",
                fontWeight: "600",
              }}
            >
              🏆 {formatAlgorithm(modelA)} performs
              better on the primary ranking metric.
            </p>
          )}

          {primaryWinner === "B" && (
            <p
              style={{
                margin: 0,
                color: "#166534",
                fontWeight: "600",
              }}
            >
              🏆 {formatAlgorithm(modelB)} performs
              better on the primary ranking metric.
            </p>
          )}

          {primaryWinner === "tie" && (
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontWeight: "600",
              }}
            >
              Both models have the same primary
              metric result.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "16px",
              marginTop: "18px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "6px",
                }}
              >
                {formatAlgorithm(modelA)}
              </div>

              <strong
                style={{
                  fontSize: "22px",
                }}
              >
                {primaryMetricConfig
                  ? primaryMetricConfig.formatter(
                      primaryValueA
                    )
                  : "—"}
              </strong>
            </div>

            <div
              style={{
                background: "#ffffff",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "6px",
                }}
              >
                {formatAlgorithm(modelB)}
              </div>

              <strong
                style={{
                  fontSize: "22px",
                }}
              >
                {primaryMetricConfig
                  ? primaryMetricConfig.formatter(
                      primaryValueB
                    )
                  : "—"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Metric Comparison */}

      {selectedA && selectedB && (
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
              Metric Comparison
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
                  <TableHeader>
                    Metric
                  </TableHeader>

                  <TableHeader>
                    {formatAlgorithm(modelA)}
                  </TableHeader>

                  <TableHeader>
                    {formatAlgorithm(modelB)}
                  </TableHeader>

                  <TableHeader>
                    Better Model
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {metrics.map((metric) => {
                  const valueA =
                    getMetricValue(
                      selectedA,
                      metric
                    );

                  const valueB =
                    getMetricValue(
                      selectedB,
                      metric
                    );

                  const winner =
                    getWinner(
                      valueA,
                      valueB,
                      metric.lowerIsBetter
                    );

                  return (
                    <tr key={metric.key}>
                      <TableCell>
                        <strong>
                          {metric.label}
                        </strong>

                        {metric.key ===
                          primaryMetric && (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "10px",
                              padding: "3px 6px",
                              borderRadius:
                                "999px",
                              background:
                                "#e2e8f0",
                            }}
                          >
                            PRIMARY
                          </span>
                        )}
                      </TableCell>

                      <TableCell
                        highlighted={
                          winner === "A"
                        }
                      >
                        {metric.formatter(
                          valueA
                        )}
                      </TableCell>

                      <TableCell
                        highlighted={
                          winner === "B"
                        }
                      >
                        {metric.formatter(
                          valueB
                        )}
                      </TableCell>

                      <TableCell>
                        {winner === "A" &&
                          `🏆 ${formatAlgorithm(
                            modelA
                          )}`}

                        {winner === "B" &&
                          `🏆 ${formatAlgorithm(
                            modelB
                          )}`}

                        {winner === "tie" &&
                          "Tie"}
                      </TableCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interpretation */}

      {selectedA && selectedB && (
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
            MLens Interpretation
          </h2>

          <div
            style={{
              color: "#475569",
              fontSize: "14px",
              lineHeight: "1.7",
            }}
          >
            <p>
              <strong>
                {formatAlgorithm(modelA)}
              </strong>{" "}
              wins {winsA} of the evaluated metrics,
              while{" "}
              <strong>
                {formatAlgorithm(modelB)}
              </strong>{" "}
              wins {winsB}.
            </p>

            {arenaResult.problem_type ===
              "classification" && (
              <>
                <p>
                  Accuracy measures the overall
                  percentage of correct predictions,
                  while Macro F1 gives each class equal
                  importance.
                </p>

                <p>
                  Because this dataset has{" "}
                  <strong>
                    {arenaResult.class_analysis
                      ?.number_of_classes ?? "many"}
                  </strong>{" "}
                  classes and substantial class
                  imbalance, Macro F1 is especially
                  important when comparing models.
                </p>
              </>
            )}

            {arenaResult.problem_type ===
              "regression" && (
              <p>
                For regression, lower MAE, MSE, and
                RMSE are better, while a higher R²
                indicates better explanatory performance.
              </p>
            )}

            <p>
              MLens selected{" "}
              <strong>
                {formatAlgorithm(
                  arenaResult.best_model?.algorithm
                )}
              </strong>{" "}
              as the Arena winner because it achieved
              the strongest result on the primary
              ranking metric:{" "}
              <strong>
                {arenaResult.ranking_metric}
              </strong>
              .
            </p>
          </div>
        </div>
      )}

      {/* Ranking Context */}

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "22px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontSize: "18px",
          }}
        >
          Ranking Context
        </h2>

        <p
          style={{
            margin: 0,
            color: "#475569",
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >
          {arenaResult.ranking_reason}
        </p>
      </div>
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
        padding: "14px 16px",
        textAlign: "left",
        fontSize: "12px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "#64748b",
        borderBottom: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}


function TableCell({
  children,
  highlighted = false,
}) {
  return (
    <td
      style={{
        padding: "15px 16px",
        borderBottom: "1px solid #f1f5f9",
        fontSize: "14px",
        whiteSpace: "nowrap",
        background: highlighted
          ? "#f8fafc"
          : "#ffffff",
      }}
    >
      {children}
    </td>
  );
}


export default Compare;