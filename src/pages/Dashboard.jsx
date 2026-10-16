import {
  Database,
  FlaskConical,
  Brain,
  ArrowRight,
  Upload,
  BarChart3,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-semibold text-neutral-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
        <Icon size={19} />
      </div>

      <p className="mt-4 text-sm font-medium text-neutral-700">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
        {description}
      </p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-violet-600">
          Machine Learning Laboratory
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
          Welcome to MLens
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
          Experiment with machine-learning algorithms, compare their
          behavior, and understand why different models perform differently.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Database}
          label="Datasets"
          value="0"
          description="Datasets uploaded"
        />

        <StatCard
          icon={FlaskConical}
          label="Experiments"
          value="0"
          description="Experiments completed"
        />

        <StatCard
          icon={Brain}
          label="Models Tested"
          value="0"
          description="Models evaluated"
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Experiments */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-3">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-neutral-950">
              Recent Experiments
            </h2>

            <p className="mt-1 text-xs text-neutral-400">
              Your latest machine-learning experiments
            </p>
          </div>

          <EmptyState
            icon={FlaskConical}
            title="No experiments yet"
            description="Upload a dataset and run your first experiment to start seeing your results here."
          />
        </div>

        {/* Model Performance */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-neutral-950">
              Model Performance
            </h2>

            <p className="mt-1 text-xs text-neutral-400">
              Performance comparison across models
            </p>
          </div>

          <EmptyState
            icon={BarChart3}
            title="No results yet"
            description="Model performance will appear here after you run an experiment."
          />
        </div>
      </div>

      {/* Start Experiment */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Upload size={17} />
              </div>

              <h2 className="text-base font-semibold text-neutral-950">
                Start an Experiment
              </h2>
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
              Upload a dataset, inspect and preprocess your data, then
              experiment with different machine-learning algorithms.
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = "/dataset";
            }}
            className="
              inline-flex items-center justify-center gap-2
              rounded-xl bg-neutral-950
              px-5 py-2.5
              text-sm font-medium text-white
              transition
              hover:bg-neutral-800
            "
          >
            Go to Dataset
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}