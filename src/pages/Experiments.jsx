import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDataset } from "../context/DatasetContext";

import {
  Database,
  Target,
  Brain,
  Settings2,
  Play,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  LoaderCircle,
  Trophy,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";
const MODEL_ARENA_PATH = "/model-arena";

const classificationAlgorithms = [
  {
    id: "knn",
    name: "K-Nearest Neighbors",
    description: "Classifies samples based on nearby observations.",
  },
  {
    id: "decision-tree",
    name: "Decision Tree",
    description: "Learns decision rules by splitting the data.",
  },
  {
    id: "naive-bayes",
    name: "Naive Bayes",
    description: "Probabilistic classifier based on feature independence.",
  },
  {
    id: "svm",
    name: "Support Vector Machine",
    description: "Finds a separating boundary with maximum margin.",
  },
  {
    id: "logistic-regression",
    name: "Logistic Regression",
    description: "Predicts class probabilities using a linear model.",
  },
];

const regressionAlgorithms = [
  {
    id: "knn-regression",
    name: "KNN Regression",
    description: "Predicts values using nearby observations.",
  },
  {
    id: "linear-regression",
    name: "Linear Regression",
    description: "Models relationships between features and a numeric target.",
  },
  {
    id: "decision-tree-regression",
    name: "Decision Tree Regression",
    description: "Learns non-linear prediction rules from the data.",
  },
];

const clusteringAlgorithms = [
  {
    id: "kmeans",
    name: "K-Means",
    description: "Groups observations into K clusters.",
  },
  {
    id: "hierarchical",
    name: "Hierarchical Clustering",
    description: "Builds a hierarchy of clusters using distances.",
  },
  {
    id: "gmm",
    name: "Gaussian Mixture Model",
    description: "Models the dataset as a mixture of Gaussian distributions.",
  },
];

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
        <Icon size={17} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-950">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-neutral-950">
        {value ?? "—"}
      </p>
    </div>
  );
}

function AlgorithmCard({ algorithm, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition ${
        selected
          ? "border-violet-300 bg-violet-50/60"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? "border-violet-600 bg-violet-600"
              : "border-neutral-300 bg-white"
          }`}
        >
          {selected && (
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-900">
            {algorithm.name}
          </p>

          <p className="mt-1 text-xs leading-5 text-neutral-400">
            {algorithm.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function datasetToCsv(dataset) {
  if (
    !dataset ||
    !Array.isArray(dataset.headers) ||
    !Array.isArray(dataset.rows)
  ) {
    throw new Error(
      "The loaded dataset has an invalid format. Please upload the CSV again."
    );
  }

  if (dataset.headers.length === 0) {
    throw new Error("The dataset does not contain any columns.");
  }

  const headerLine = dataset.headers.map(escapeCsvValue).join(",");

  const dataLines = dataset.rows.map((row) => {
    const values = Array.isArray(row)
      ? row
      : dataset.headers.map((header) => row?.[header]);

    return dataset.headers
      .map((_, index) => escapeCsvValue(values[index]))
      .join(",");
  });

  return [headerLine, ...dataLines].join("\n");
}

function formatMetric(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value ?? "—";
  }

  return Number(value.toFixed(4)).toString();
}

function getModelName(model, index) {
  return (
    model?.name ||
    model?.model ||
    model?.model_name ||
    model?.algorithm ||
    `Model ${index + 1}`
  );
}

function getModelMetrics(model) {
  return model?.metrics || model?.evaluation || model || {};
}

export default function Experiments() {
  const navigate = useNavigate();
  const { dataset } = useDataset();

  const [task, setTask] = useState("classification");
  const [targetColumn, setTargetColumn] = useState("");
  const [algorithm, setAlgorithm] = useState("");
  const [testSize, setTestSize] = useState("0.2");
  const [randomState, setRandomState] = useState("42");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const algorithms = useMemo(() => {
    if (task === "classification") {
      return classificationAlgorithms;
    }

    if (task === "regression") {
      return regressionAlgorithms;
    }

    return clusteringAlgorithms;
  }, [task]);

  const featureColumns = useMemo(() => {
    if (!dataset) {
      return [];
    }

    return dataset.headers.filter(
      (column) => column !== targetColumn
    );
  }, [dataset, targetColumn]);

  const handleTaskChange = (newTask) => {
    setTask(newTask);
    setAlgorithm("");
    setTargetColumn("");
    setError("");
    setResult(null);
  };

  const handleRunExperiment = async () => {
    setError("");
    setResult(null);

    if (!dataset) {
      setError("No dataset is loaded. Please upload a dataset first.");
      return;
    }

    if (task === "clustering") {
      setError(
        "Clustering is not supported by the current /train-all backend endpoint. Please select classification or regression."
      );
      return;
    }

    if (!targetColumn) {
      setError("Please select a target column.");
      return;
    }

    if (!algorithm) {
      setError("Please select an algorithm.");
      return;
    }

    if (featureColumns.length === 0) {
      setError("At least one feature column is required.");
      return;
    }

    if (dataset.rows.length < 20) {
      setError(
        "The backend requires at least 20 dataset rows to train models."
      );
      return;
    }

    if (!Number.isInteger(Number(randomState))) {
      setError("Random state must be a whole number.");
      return;
    }

    setLoading(true);

    try {
      const csvContent = datasetToCsv(dataset);

      const fileName =
        typeof dataset.name === "string" &&
        dataset.name.toLowerCase().endsWith(".csv")
          ? dataset.name
          : "dataset.csv";

      const csvFile = new File([csvContent], fileName, {
        type: "text/csv",
      });

      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("target", targetColumn);

      const response = await fetch(`${API_URL}/train-all`, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `The backend returned an invalid response (HTTP ${response.status}). Check the FastAPI terminal.`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            `Backend request failed with status ${response.status}.`
        );
      }

      if (data.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            data.detail ||
            "The backend could not train the models."
        );
      }

      if (!Array.isArray(data.models) || data.models.length === 0) {
        throw new Error(
          "The backend did not return any successful model results. Check the FastAPI terminal."
        );
      }

      // Store the actual backend response for Model Arena.
      sessionStorage.setItem(
        "mlensArenaResult",
        JSON.stringify(data)
      );

      // Also keep the results available if the user returns to Experiments.
      setResult(data);

      // Open Model Arena only after training succeeds.
      navigate(MODEL_ARENA_PATH);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          `Cannot connect to the Python backend at ${API_URL}. Make sure FastAPI is running and try again.`
        );
      } else {
        setError(
          err.message ||
            "An unexpected error occurred while running the experiment."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const modelResults = result?.models || [];
  const isClassification =
    result?.problem_type === "classification" ||
    task === "classification";

  const metricColumns = isClassification
    ? [
        { key: "accuracy", label: "Accuracy" },
        { key: "precision", label: "Precision" },
        { key: "recall", label: "Recall" },
        { key: "f1_score", label: "F1 Score" },
        { key: "macro_f1", label: "Macro F1" },
        { key: "balanced_accuracy", label: "Balanced Accuracy" },
      ]
    : [
        { key: "mae", label: "MAE" },
        { key: "mse", label: "MSE" },
        { key: "rmse", label: "RMSE" },
        { key: "r2", label: "R²" },
      ];

  const winnerName =
    typeof result?.best_model === "string"
      ? result.best_model
      : result?.best_model?.name ||
        result?.best_model?.model ||
        result?.best_model?.model_name;

  if (!dataset) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-sm font-medium text-violet-600">
            Experiment Workspace
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            Experiments
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Configure and run machine-learning experiments on your uploaded dataset.
          </p>
        </div>

        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
            <Database size={20} />
          </div>

          <h2 className="mt-4 text-sm font-semibold text-neutral-800">
            No dataset loaded
          </h2>

          <p className="mt-2 max-w-md text-xs leading-5 text-neutral-400">
            Upload a CSV dataset from the Dataset page before creating an experiment.
          </p>

          <a
            href="/dataset"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            Go to Dataset
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-violet-600">
          Experiment Workspace
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
          Experiments
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
          Configure a machine-learning experiment and evaluate models using the Python ML backend.
        </p>
      </div>

      {/* Dataset summary */}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <SectionHeader
          icon={Database}
          title="Dataset"
          description="The dataset currently selected for this experiment."
        />

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">
                {dataset.name}
              </h3>

              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700">
                <CheckCircle2 size={11} />
                Loaded
              </span>
            </div>

            <p className="mt-1 text-xs text-neutral-400">
              Ready for experiment configuration
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Rows" value={dataset.rows.length} />
            <Stat label="Columns" value={dataset.headers.length} />
            <Stat
              label="Features"
              value={
                task === "clustering"
                  ? dataset.headers.length
                  : featureColumns.length
              }
            />
          </div>
        </div>
      </div>

      {/* Task selection */}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <SectionHeader
          icon={Brain}
          title="Choose Task"
          description="Select the type of machine-learning problem."
        />

        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              id: "classification",
              title: "Classification",
              description: "Predict a categorical target.",
            },
            {
              id: "regression",
              title: "Regression",
              description: "Predict a numerical target.",
            },
            {
              id: "clustering",
              title: "Clustering",
              description: "Discover groups without a target.",
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTaskChange(item.id)}
              className={`rounded-xl border p-4 text-left transition ${
                task === item.id
                  ? "border-violet-300 bg-violet-50/60"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <p className="text-sm font-medium text-neutral-900">
                {item.title}
              </p>

              <p className="mt-1 text-xs leading-5 text-neutral-400">
                {item.description}
              </p>
            </button>
          ))}
        </div>

        {task === "clustering" && (
          <p className="mt-4 text-xs leading-5 text-amber-700">
            The current backend endpoint supports supervised classification and regression, not clustering.
          </p>
        )}
      </div>

      {/* Target column */}

      {task !== "clustering" && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <SectionHeader
            icon={Target}
            title="Target Column"
            description="Choose the column the model should predict."
          />

          <label className="block">
            <span className="text-xs font-medium text-neutral-600">
              Target column
            </span>

            <select
              value={targetColumn}
              onChange={(event) => {
                setTargetColumn(event.target.value);
                setError("");
                setResult(null);
              }}
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:max-w-md"
            >
              <option value="">Select target column</option>

              {dataset.headers.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          {targetColumn && (
            <div className="mt-5 rounded-xl bg-neutral-50 p-4">
              <p className="text-xs font-medium text-neutral-500">
                Feature columns
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {featureColumns.map((column) => (
                  <span
                    key={column}
                    className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] text-neutral-600"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Algorithm selection */}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <SectionHeader
          icon={Brain}
          title="Choose Algorithm"
          description="Select an algorithm for your experiment configuration."
        />

        <div className="grid gap-3 md:grid-cols-2">
          {algorithms.map((item) => (
            <AlgorithmCard
              key={item.id}
              algorithm={item}
              selected={algorithm === item.id}
              onClick={() => {
                setAlgorithm(item.id);
                setError("");
                setResult(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* Configuration */}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <SectionHeader
          icon={Settings2}
          title="Experiment Configuration"
          description="Configure your preferred test split and random seed."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-neutral-600">
              Test size
            </label>

            <select
              value={testSize}
              onChange={(event) => setTestSize(event.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="0.2">20%</option>
              <option value="0.25">25%</option>
              <option value="0.3">30%</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-600">
              Random state
            </label>

            <input
              type="number"
              value={randomState}
              onChange={(event) => setRandomState(event.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        {algorithm && (
          <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs font-medium text-violet-700">
              Selected algorithm
            </p>

            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {algorithms.find((item) => item.id === algorithm)?.name}
            </p>

            <p className="mt-1 text-xs leading-5 text-neutral-500">
              The current /train-all endpoint evaluates multiple models. The selected algorithm, test size, and random state are not yet passed as training options to this backend endpoint.
            </p>
          </div>
        )}
      </div>

      {/* Error message */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Run experiment */}

      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">
            Ready to experiment?
          </h2>

          <p className="mt-1 text-xs leading-5 text-neutral-400">
            Train models using the Python backend, save the results, and open Model Arena.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunExperiment}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Play size={15} />
          )}

          {loading ? "Training models..." : "Run Experiment"}
        </button>
      </div>

      {/* Results preview, shown if training succeeds but navigation is delayed */}

      {result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-green-600"
              />

              <div>
                <h2 className="text-sm font-semibold text-green-800">
                  Experiment completed successfully
                </h2>

                <p className="mt-1 text-xs leading-5 text-green-700">
                  Backend evaluation results are ready for Model Arena.
                </p>

                <button
                  type="button"
                  onClick={() => navigate(MODEL_ARENA_PATH)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-800"
                >
                  Open Model Arena
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {winnerName && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <Trophy size={20} className="mt-0.5 text-amber-600" />

                <div>
                  <p className="text-xs font-medium text-amber-700">
                    Best model
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                    {winnerName}
                  </h2>

                  {result.ranking_metric && (
                    <p className="mt-1 text-xs text-neutral-600">
                      Ranking metric: {result.ranking_metric}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-neutral-950">
              Model Evaluation Results
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="px-3 py-3 font-medium">Model</th>

                    {metricColumns.map((metric) => (
                      <th
                        key={metric.key}
                        className="px-3 py-3 font-medium"
                      >
                        {metric.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {modelResults.map((model, index) => {
                    const name = getModelName(model, index);
                    const metrics = getModelMetrics(model);

                    return (
                      <tr
                        key={`${name}-${index}`}
                        className="border-b border-neutral-100 last:border-0"
                      >
                        <td className="px-3 py-3 font-medium text-neutral-900">
                          {name}
                        </td>

                        {metricColumns.map((metric) => (
                          <td
                            key={metric.key}
                            className="px-3 py-3 text-neutral-600"
                          >
                            {formatMetric(metrics[metric.key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
