import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function Insights() {
  const navigate = useNavigate();
  const [arenaResult, setArenaResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const storedResult = sessionStorage.getItem("mlensArenaResult");

      if (!storedResult) {
        setError(
          "No model results found. Run Model Arena before viewing insights."
        );
        return;
      }

      const parsed = JSON.parse(storedResult);

      if (!parsed || !Array.isArray(parsed.models) || parsed.models.length === 0) {
        setError("The saved results do not contain any evaluated models.");
        return;
      }

      setArenaResult(parsed);
    } catch {
      setError("Unable to read the saved model results. Please run Model Arena again.");
    }
  }, []);

  const formatAlgorithm = (algorithm) => {
    if (!algorithm) return "Not available";

    return String(algorithm)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatMetricName = (metric) => {
    if (!metric) return "Primary metric";

    const labels = {
      accuracy: "Accuracy",
      f1_score: "Weighted F1 Score",
      macro_f1: "Macro F1 Score",
      balanced_accuracy: "Balanced Accuracy",
      precision: "Precision",
      recall: "Recall",
      mae: "Mean Absolute Error (MAE)",
      mse: "Mean Squared Error (MSE)",
      rmse: "Root Mean Squared Error (RMSE)",
      r2_score: "R² Score",
      training_time_seconds: "Training Time",
    };

    return labels[metric] || formatAlgorithm(metric);
  };

  const formatMetricValue = (value, metric) => {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) {
      return "—";
    }

    const number = Number(value);

    if (metric === "training_time_seconds") {
      return `${number.toFixed(3)} sec`;
    }

    if (
      ["accuracy", "f1_score", "macro_f1", "balanced_accuracy", "precision", "recall"].includes(
        metric
      )
    ) {
      return `${(number * 100).toFixed(2)}%`;
    }

    return number.toFixed(4);
  };

  const getMetricValue = (model, metric) => {
    if (!model || !metric) return null;

    if (metric === "training_time_seconds") {
      return model.training_time_seconds ?? model.metrics?.[metric] ?? null;
    }

    return model.metrics?.[metric] ?? model[metric] ?? null;
  };

  const insights = useMemo(() => {
    if (!arenaResult) return null;

    const models = arenaResult.models;
    const problemType = String(arenaResult.problem_type || "").toLowerCase();
    const rankingMetric = arenaResult.ranking_metric;
    const bestModel =
      models.find(
        (model) =>
          model.algorithm === arenaResult.best_model?.algorithm
      ) || models[0];

    const metricHigherIsBetter = (metric) => {
      if (["mae", "mse", "rmse", "training_time_seconds"].includes(metric)) {
        return false;
      }

      return true;
    };

    const validModels = models.filter((model) => {
      const value = getMetricValue(model, rankingMetric);
      return value !== null && Number.isFinite(Number(value));
    });

    const sortedModels = [...validModels].sort((a, b) => {
      const valueA = Number(getMetricValue(a, rankingMetric));
      const valueB = Number(getMetricValue(b, rankingMetric));

      return metricHigherIsBetter(rankingMetric)
        ? valueB - valueA
        : valueA - valueB;
    });

    const bestMetricValue = getMetricValue(bestModel, rankingMetric);
    const sortedBest = sortedModels[0];
    const sortedBestValue = sortedBest
      ? getMetricValue(sortedBest, rankingMetric)
      : null;

    const metricDiff =
      sortedModels.length > 1
        ? Math.abs(
            Number(getMetricValue(sortedModels[0], rankingMetric)) -
              Number(getMetricValue(sortedModels[1], rankingMetric))
          )
        : null;

    const metricDiffText =
      metricDiff === null
        ? "Only one model has a usable value for the ranking metric."
        : ["accuracy", "f1_score", "macro_f1", "balanced_accuracy"].includes(
              rankingMetric
            )
          ? `${(metricDiff * 100).toFixed(2)} percentage points`
          : metricDiff.toFixed(4);

    const classAnalysis = arenaResult.class_analysis;
    const classCounts = Array.isArray(classAnalysis?.class_distribution)
      ? classAnalysis.class_distribution
      : Array.isArray(classAnalysis?.classes)
        ? classAnalysis.classes
        : [];

    const numericCounts = classCounts
      .map((item) => {
        if (typeof item === "number") return item;

        if (typeof item === "object" && item !== null) {
          const count =
            item.count ??
            item.samples ??
            item.frequency ??
            item.value;

          return Number.isFinite(Number(count)) ? Number(count) : null;
        }

        return null;
      })
      .filter((count) => count !== null && count >= 0);

    let imbalanceRatio = null;

    if (numericCounts.length >= 2) {
      const positiveCounts = numericCounts.filter((count) => count > 0);
      if (positiveCounts.length >= 2) {
        imbalanceRatio =
          Math.max(...positiveCounts) / Math.min(...positiveCounts);
      }
    }

    const datasetRows = arenaResult.dataset?.rows;
    const datasetFeatures = arenaResult.dataset?.features;
    const failedModels = Array.isArray(arenaResult.failed_models)
      ? arenaResult.failed_models
      : [];

    const topThree = sortedModels.slice(0, 3);

    const performanceInsight =
      bestMetricValue === null || bestMetricValue === undefined
        ? "The backend did not provide a usable value for the primary ranking metric."
        : `${formatAlgorithm(bestModel.algorithm)} has a recorded ${formatMetricName(
            rankingMetric
          ).toLowerCase()} of ${formatMetricValue(bestMetricValue, rankingMetric)}.`;

    const recommendations = [];

    if (problemType === "classification") {
      recommendations.push(
        "Review the confusion matrix and per-class precision and recall, if available, before selecting a model for deployment."
      );

      if (["accuracy"].includes(rankingMetric)) {
        recommendations.push(
          "Compare Macro F1 and Balanced Accuracy as well as accuracy, especially when different classes have different importance."
        );
      } else {
        recommendations.push(
          "Use the primary ranking metric alongside accuracy and per-class results to check that performance is suitable for your use case."
        );
      }

      if (imbalanceRatio !== null && imbalanceRatio >= 3) {
        recommendations.push(
          "The supplied class counts indicate that the largest class has at least three times as many examples as the smallest non-empty class. Check minority-class recall before choosing a model."
        );
      }
    } else if (problemType === "regression") {
      recommendations.push(
        "Compare MAE and RMSE to understand typical prediction error and whether larger errors are especially costly."
      );

      recommendations.push(
        "Inspect actual-versus-predicted values and residuals before using the model for important decisions."
      );

      if (
        getMetricValue(bestModel, "r2_score") !== null &&
        Number(getMetricValue(bestModel, "r2_score")) < 0
      ) {
        recommendations.push(
          "The selected model has a negative R² score. Review the baseline, target distribution, and data preparation before relying on its predictions."
        );
      }
    } else {
      recommendations.push(
        "For clustering, inspect cluster sizes, separation, and a suitable clustering score before interpreting the groups."
      );
    }

    recommendations.push(
      "Validate the preferred model on data representative of real use. A single train/test evaluation does not guarantee future performance."
    );

    if (failedModels.length > 0) {
      recommendations.push(
        `${failedModels.length} model(s) failed during evaluation. Review the failure details before treating this comparison as complete.`
      );
    }

    return {
      problemType,
      rankingMetric,
      bestModel,
      bestMetricValue,
      sortedModels,
      topThree,
      metricDiffText,
      performanceInsight,
      datasetRows,
      datasetFeatures,
      classAnalysis,
      classCounts,
      imbalanceRatio,
      failedModels,
      recommendations,
      rankingReason: arenaResult.ranking_reason,
      backendInsights: Array.isArray(arenaResult.insights)
        ? arenaResult.insights
        : typeof arenaResult.insights === "string"
          ? [arenaResult.insights]
          : [],
    };
  }, [arenaResult]);

  if (error) {
    return (
      <main style={styles.page}>
        <section style={styles.panel}>
          <h1 style={styles.pageTitle}>Insights</h1>
          <Notice type="error">{error}</Notice>
          <button style={styles.primaryButton} onClick={() => navigate("/model-arena")}>
            Go to Model Arena
          </button>
        </section>
      </main>
    );
  }

  if (!arenaResult || !insights) {
    return (
      <main style={styles.page}>
        <section style={styles.panel}>
          <p style={{ color: "#64748b", margin: 0 }}>Loading model insights...</p>
        </section>
      </main>
    );
  }

  const problemLabel = formatAlgorithm(insights.problemType);
  const bestModelName = formatAlgorithm(insights.bestModel?.algorithm);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>MLENS ANALYTICS</p>
          <h1 style={styles.pageTitle}>Model Insights</h1>
          <p style={styles.subtitle}>
            Understand model performance, identify useful patterns, and decide what to validate next.
          </p>
        </div>

        <button style={styles.secondaryButton} onClick={() => navigate("/model-arena")}>
          Run Model Arena
        </button>
      </header>

      <section style={styles.summaryGrid}>
        <SummaryCard
          label="Recommended Model"
          value={bestModelName}
          detail="Selected by Model Arena"
        />
        <SummaryCard
          label="Problem Type"
          value={problemLabel}
          detail="Detected evaluation task"
        />
        <SummaryCard
          label="Dataset Rows"
          value={insights.datasetRows ?? "—"}
          detail="Rows reported by backend"
        />
        <SummaryCard
          label="Features"
          value={insights.datasetFeatures ?? "—"}
          detail="Features reported by backend"
        />
      </section>

      <section style={styles.panel}>
        <SectionHeading
          title="Executive Summary"
          description="A quick reading of the current evaluation results."
        />

        <div style={styles.recommendationBanner}>
          <div style={styles.bannerIcon}>✓</div>
          <div>
            <h3 style={styles.bannerTitle}>{bestModelName} is the current Arena winner</h3>
            <p style={styles.bannerText}>{insights.performanceInsight}</p>
            {insights.rankingReason && (
              <p style={styles.bannerText}>
                <strong>Ranking rationale:</strong> {insights.rankingReason}
              </p>
            )}
          </div>
        </div>

        <p style={styles.mutedText}>
          This recommendation reflects the saved evaluation results and ranking metric. It is not a guarantee of performance on unseen production data.
        </p>
      </section>

      <section style={styles.panel}>
        <SectionHeading
          title="Model Performance"
          description={`Models ranked by ${formatMetricName(insights.rankingMetric)}. The bars are scaled within this result set for visual comparison.`}
        />

        {insights.sortedModels.length === 0 ? (
          <Notice type="warning">
            No models have a usable value for the primary ranking metric.
          </Notice>
        ) : (
          <div style={styles.performanceList}>
            {insights.sortedModels.map((model, index) => {
              const value = Number(
                getMetricValue(model, insights.rankingMetric)
              );
              const values = insights.sortedModels.map((item) =>
                Number(getMetricValue(item, insights.rankingMetric))
              );
              const min = Math.min(...values);
              const max = Math.max(...values);
              const same = max === min;
              const higherIsBetter = ![
                "mae",
                "mse",
                "rmse",
                "training_time_seconds",
              ].includes(insights.rankingMetric);
              const normalized = same
                ? 100
                : higherIsBetter
                  ? ((value - min) / (max - min)) * 100
                  : ((max - value) / (max - min)) * 100;
              const width = Math.max(4, Math.min(100, normalized));

              return (
                <div key={model.algorithm || index} style={styles.performanceItem}>
                  <div style={styles.performanceTop}>
                    <div style={styles.modelNameLine}>
                      <span style={styles.rankNumber}>{index + 1}</span>
                      <strong>{formatAlgorithm(model.algorithm)}</strong>
                      {model.algorithm === insights.bestModel?.algorithm && (
                        <span style={styles.winnerTag}>ARENA WINNER</span>
                      )}
                    </div>
                    <strong style={styles.metricValue}>
                      {formatMetricValue(value, insights.rankingMetric)}
                    </strong>
                  </div>

                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={styles.chartNote}>
          Relative bars show the ranking order within this run, not a universal quality scale.
        </p>
      </section>

      <section style={styles.panel}>
        <SectionHeading
          title="Key Findings"
          description="Observations based on the model metrics and metadata returned by the backend."
        />

        <div style={styles.findingGrid}>
          <FindingCard
            number="01"
            title="Best-ranked model"
            body={`${bestModelName} is the model selected by Arena. Use ${formatMetricName(
              insights.rankingMetric
            )} as the main criterion, while checking other metrics for trade-offs.`}
          />

          <FindingCard
            number="02"
            title="Separation between models"
            body={
              insights.sortedModels.length > 1
                ? `The top two models differ by ${insights.metricDiffText} on the ranking metric. This difference should be considered alongside evaluation variability and practical requirements.`
                : "There are not enough successfully evaluated models to measure a difference between the top two."
            }
          />

          <FindingCard
            number="03"
            title="Dataset context"
            body={
              insights.datasetRows !== undefined || insights.datasetFeatures !== undefined
                ? `The backend reports ${insights.datasetRows ?? "an unknown number of"} rows and ${insights.datasetFeatures ?? "an unknown number of"} features. These values describe dataset size, not data quality by themselves.`
                : "Dataset size metadata was not included in the saved result."
            }
          />

          <FindingCard
            number="04"
            title="Evaluation completeness"
            body={
              insights.failedModels.length > 0
                ? `${insights.failedModels.length} model(s) failed during evaluation. Interpret the ranking with that limitation in mind.`
                : "No failed models were listed in the saved results. Confirm that the models offered for comparison match your intended use case."
            }
          />
        </div>
      </section>

      {insights.problemType === "classification" && (
        <section style={styles.panel}>
          <SectionHeading
            title="Classification Insights"
            description="Interpret classification metrics in the context of your prediction task."
          />

          <div style={styles.infoGrid}>
            <InfoRow
              label="Accuracy"
              text="The fraction of predictions that are correct. It can be misleading when classes are unevenly represented."
            />
            <InfoRow
              label="Weighted F1"
              text="Combines precision and recall, weighting each class according to its support."
            />
            <InfoRow
              label="Macro F1"
              text="Averages F1 across classes equally, making it useful for checking whether weaker classes are being overlooked."
            />
            <InfoRow
              label="Balanced Accuracy"
              text="Averages recall across classes and can be more informative than accuracy when class sizes differ."
            />
          </div>

          {insights.classAnalysis && (
            <div style={styles.dataNote}>
              <strong>Backend class analysis available.</strong>
              <p style={styles.mutedText}>
                {insights.classAnalysis.number_of_classes !== undefined
                  ? `Number of classes reported: ${insights.classAnalysis.number_of_classes}.`
                  : "The backend returned class-analysis metadata."}
                {insights.imbalanceRatio !== null
                  ? ` The reported class counts have a largest-to-smallest non-empty class ratio of ${insights.imbalanceRatio.toFixed(
                      2
                    )}:1.`
                  : " Class counts were not available in a format that allows a reliable imbalance calculation."}
              </p>
            </div>
          )}
        </section>
      )}

      {insights.problemType === "regression" && (
        <section style={styles.panel}>
          <SectionHeading
            title="Regression Insights"
            description="Understand prediction errors before choosing a regression model."
          />

          <div style={styles.infoGrid}>
            <InfoRow
              label="MAE"
              text="The average absolute prediction error, expressed in the target's units."
            />
            <InfoRow
              label="RMSE"
              text="Penalizes larger errors more strongly than MAE."
            />
            <InfoRow
              label="MSE"
              text="The mean squared error; its squared units can make it less intuitive to interpret directly."
            />
            <InfoRow
              label="R² Score"
              text="Measures performance relative to a mean-target baseline. A negative score can indicate worse performance than that baseline."
            />
          </div>
        </section>
      )}

      {insights.backendInsights.length > 0 && (
        <section style={styles.panel}>
          <SectionHeading
            title="Backend-Generated Insights"
            description="Additional observations returned by the Python ML backend."
          />

          <ul style={styles.insightList}>
            {insights.backendInsights.map((item, index) => (
              <li key={`${index}-${String(item)}`} style={styles.insightListItem}>
                {typeof item === "string"
                  ? item
                  : item?.message || item?.description || JSON.stringify(item)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={styles.panel}>
        <SectionHeading
          title="Recommended Next Steps"
          description="Actions to help validate the model before relying on it."
        />

        <div style={styles.nextSteps}>
          {insights.recommendations.map((recommendation, index) => (
            <div key={index} style={styles.nextStep}>
              <span style={styles.stepNumber}>{index + 1}</span>
              <p style={styles.stepText}>{recommendation}</p>
            </div>
          ))}
        </div>
      </section>

      {insights.failedModels.length > 0 && (
        <section style={styles.panel}>
          <SectionHeading
            title="Models That Failed"
            description="These models were reported as unsuccessful by the backend."
          />

          {insights.failedModels.map((item, index) => {
            const name =
              typeof item === "string"
                ? item
                : item.algorithm || item.model || `Model ${index + 1}`;
            const reason =
              typeof item === "object"
                ? item.error || item.reason || item.message
                : null;

            return (
              <div key={`${name}-${index}`} style={styles.failureItem}>
                <strong>{formatAlgorithm(name)}</strong>
                {reason && <p style={styles.failureText}>{reason}</p>}
              </div>
            );
          })}
        </section>
      )}

      <footer style={styles.footer}>
        <p>
          Insights are generated from the current saved Model Arena response. Run Arena again after changing the dataset or evaluation setup to refresh these findings.
        </p>
        <div style={styles.footerActions}>
          <button style={styles.secondaryButton} onClick={() => navigate("/compare")}>
            Compare Models
          </button>
          <button style={styles.primaryButton} onClick={() => navigate("/model-arena")}>
            Return to Model Arena
          </button>
        </div>
      </footer>
    </main>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <article style={styles.summaryCard}>
      <p style={styles.cardLabel}>{label}</p>
      <h2 style={styles.cardValue}>{value}</h2>
      <p style={styles.cardDetail}>{detail}</p>
    </article>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div style={styles.sectionHeading}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {description && <p style={styles.sectionDescription}>{description}</p>}
    </div>
  );
}

function FindingCard({ number, title, body }) {
  return (
    <article style={styles.findingCard}>
      <span style={styles.findingNumber}>{number}</span>
      <h3 style={styles.findingTitle}>{title}</h3>
      <p style={styles.findingBody}>{body}</p>
    </article>
  );
}

function InfoRow({ label, text }) {
  return (
    <div style={styles.infoRow}>
      <strong>{label}</strong>
      <p>{text}</p>
    </div>
  );
}

function Notice({ type, children }) {
  const isError = type === "error";

  return (
    <div
      role="alert"
      style={{
        ...styles.notice,
        background: isError ? "#fef2f2" : "#fffbeb",
        borderColor: isError ? "#fecaca" : "#fde68a",
        color: isError ? "#b91c1c" : "#92400e",
      }}
    >
      {children}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "28px",
    color: "#0f172a",
    background: "#f8fafc",
    minHeight: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "26px",
  },
  eyebrow: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.12em",
    margin: "0 0 8px",
  },
  pageTitle: {
    fontSize: "30px",
    fontWeight: "750",
    letterSpacing: "-0.03em",
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.65",
    margin: 0,
    maxWidth: "720px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },
  summaryCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    minWidth: 0,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
  },
  cardLabel: {
    fontSize: "12px",
    fontWeight: "650",
    color: "#64748b",
    margin: "0 0 10px",
  },
  cardValue: {
    fontSize: "21px",
    lineHeight: "1.3",
    margin: "0 0 8px",
    overflowWrap: "anywhere",
  },
  cardDetail: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.5",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "22px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.025)",
    minWidth: 0,
  },
  sectionHeading: {
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "19px",
    fontWeight: "750",
    margin: "0 0 6px",
  },
  sectionDescription: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "1.6",
    margin: 0,
  },
  recommendationBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "18px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
  },
  bannerIcon: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#e2e8f0",
    color: "#334155",
    fontWeight: "800",
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: "16px",
    margin: "2px 0 8px",
  },
  bannerText: {
    color: "#475569",
    fontSize: "13px",
    lineHeight: "1.65",
    margin: "0 0 8px",
  },
  mutedText: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "1.7",
    margin: "14px 0 0",
  },
  performanceList: {
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },
  performanceItem: {
    minWidth: 0,
  },
  performanceTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  modelNameLine: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    fontSize: "14px",
  },
  rankNumber: {
    width: "24px",
    height: "24px",
    borderRadius: "7px",
    background: "#f1f5f9",
    color: "#475569",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "750",
  },
  winnerTag: {
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "0.06em",
    color: "#334155",
    background: "#e2e8f0",
    borderRadius: "5px",
    padding: "4px 6px",
  },
  metricValue: {
    fontSize: "14px",
    fontVariantNumeric: "tabular-nums",
  },
  barTrack: {
    height: "9px",
    background: "#f1f5f9",
    borderRadius: "99px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "#64748b",
    borderRadius: "99px",
    transition: "width 180ms ease",
  },
  chartNote: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: "18px 0 0",
    lineHeight: "1.5",
  },
  findingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  findingCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px",
    minWidth: 0,
  },
  findingNumber: {
    display: "inline-block",
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.08em",
    marginBottom: "12px",
  },
  findingTitle: {
    fontSize: "15px",
    margin: "0 0 8px",
  },
  findingBody: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.7",
    margin: 0,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  infoRow: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "16px",
  },
  infoRowStrong: {
    fontSize: "13px",
  },
  dataNote: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
    marginTop: "16px",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  insightList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#475569",
    fontSize: "13px",
    lineHeight: "1.8",
  },
  insightListItem: {
    paddingLeft: "4px",
    marginBottom: "8px",
  },
  nextSteps: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  nextStep: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
  },
  stepNumber: {
    width: "26px",
    height: "26px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "750",
    flexShrink: 0,
  },
  stepText: {
    color: "#475569",
    fontSize: "13px",
    lineHeight: "1.65",
    margin: "3px 0 0",
  },
  failureItem: {
    padding: "14px",
    border: "1px solid #fecaca",
    background: "#fffafa",
    borderRadius: "10px",
    marginBottom: "10px",
    fontSize: "13px",
  },
  failureText: {
    color: "#b91c1c",
    margin: "8px 0 0",
    lineHeight: "1.6",
  },
  notice: {
    padding: "14px",
    border: "1px solid",
    borderRadius: "9px",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "18px",
  },
  primaryButton: {
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#ffffff",
    borderRadius: "9px",
    padding: "11px 16px",
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: "9px",
    padding: "11px 16px",
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer",
  },
  footer: {
    padding: "8px 0 20px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.7",
  },
  footerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "14px",
  },
};

export default Insights;
