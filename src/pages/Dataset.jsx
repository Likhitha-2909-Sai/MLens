import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDataset } from "../context/DatasetContext";

import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Database,
  Columns3,
  Rows3,
  ArrowRight,
} from "lucide-react";

function parseCSV(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
    };
  }

  const parseLine = (line) => {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());

    return result;
  };

  const headers = parseLine(lines[0]);

  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);

    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });

  return {
    headers,
    rows,
  };
}

function getColumnType(values) {
  const nonEmptyValues = values.filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== ""
  );

  if (nonEmptyValues.length === 0) {
    return "Empty";
  }

  const numericValues = nonEmptyValues.filter(
    (value) => !Number.isNaN(Number(value))
  );

  if (numericValues.length === nonEmptyValues.length) {
    return "Numerical";
  }

  const uniqueValues = new Set(
    nonEmptyValues.map((value) =>
      String(value).toLowerCase()
    )
  );

  if (uniqueValues.size <= 20) {
    return "Categorical";
  }

  return "Text";
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold text-neutral-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function Dataset() {
  const { dataset, setDataset } = useDataset();

  const navigate = useNavigate();

  const [error, setError] = useState("");

  const handleFile = (file) => {
    setError("");

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target.result;

        const parsed = parseCSV(text);

        if (parsed.headers.length === 0) {
          setError("The CSV file appears to be empty.");
          return;
        }

        // Store the uploaded dataset in shared context
        setDataset({
          name: file.name,
          size: file.size,
          headers: parsed.headers,
          rows: parsed.rows,
        });
      } catch {
        setError("Unable to read this CSV file.");
      }
    };

    reader.onerror = () => {
      setError("Unable to read this file.");
    };

    reader.readAsText(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    handleFile(file);
  };

  const removeDataset = () => {
    setDataset(null);
    setError("");
  };

  const columnInformation = useMemo(() => {
    if (!dataset) {
      return [];
    }

    return dataset.headers.map((header) => {
      const values = dataset.rows.map(
        (row) => row[header]
      );

      const missingValues = values.filter(
        (value) =>
          value === null ||
          value === undefined ||
          value === ""
      ).length;

      const uniqueValues = new Set(
        values.filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== ""
        )
      ).size;

      return {
        name: header,
        type: getColumnType(values),
        missing: missingValues,
        unique: uniqueValues,
      };
    });
  }, [dataset]);

  const previewRows = dataset?.rows.slice(0, 8) ?? [];

  const totalMissingValues = columnInformation.reduce(
    (total, column) => total + column.missing,
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-violet-600">
          Dataset Workspace
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
          Dataset
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
          Upload a dataset, inspect its structure, and prepare it for
          machine-learning experiments.
        </p>
      </div>

      {/* Upload / Dataset Information */}
      {!dataset ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-neutral-950">
              Upload Dataset
            </h2>

            <p className="mt-1 text-xs text-neutral-400">
              Start by uploading a CSV dataset.
            </p>
          </div>

          <label
            htmlFor="dataset-upload"
            className="
              flex min-h-64 cursor-pointer
              flex-col items-center justify-center
              rounded-2xl border-2 border-dashed
              border-neutral-200
              bg-neutral-50
              px-6 py-10
              text-center
              transition
              hover:border-violet-300
              hover:bg-violet-50/30
            "
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Upload size={24} />
            </div>

            <h3 className="mt-5 text-sm font-semibold text-neutral-800">
              Upload your CSV dataset
            </h3>

            <p className="mt-2 text-xs text-neutral-400">
              Click here to choose a file from your computer
            </p>

            <span className="mt-4 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-medium text-white">
              Choose CSV File
            </span>

            <input
              id="dataset-upload"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Dataset Loaded Banner */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <FileSpreadsheet size={20} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {dataset.name}
                    </h2>

                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700">
                      <CheckCircle2 size={11} />
                      Loaded
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-neutral-400">
                    {(dataset.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <button
                onClick={removeDataset}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-lg border border-neutral-200
                  px-3 py-2
                  text-xs font-medium text-neutral-600
                  transition
                  hover:border-red-200
                  hover:bg-red-50
                  hover:text-red-600
                "
              >
                <X size={14} />
                Remove Dataset
              </button>
            </div>
          </div>

          {/* Dataset Statistics */}
          <div>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-neutral-950">
                Dataset Overview
              </h2>

              <p className="mt-1 text-xs text-neutral-400">
                Basic information detected from your dataset.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                icon={Rows3}
                label="Rows"
                value={dataset.rows.length}
              />

              <StatCard
                icon={Columns3}
                label="Columns"
                value={dataset.headers.length}
              />

              <StatCard
                icon={Database}
                label="Missing Values"
                value={totalMissingValues}
              />
            </div>
          </div>

          {/* Dataset Preview */}
          <div className="rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 p-6">
              <h2 className="text-base font-semibold text-neutral-950">
                Dataset Preview
              </h2>

              <p className="mt-1 text-xs text-neutral-400">
                Showing the first{" "}
                {Math.min(previewRows.length, 8)} rows of
                your dataset.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    {dataset.headers.map((header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-neutral-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      {dataset.headers.map((header) => (
                        <td
                          key={header}
                          className="max-w-64 truncate whitespace-nowrap px-5 py-3 text-xs text-neutral-600"
                        >
                          {row[header] === "" ? (
                            <span className="text-red-400">
                              Missing
                            </span>
                          ) : (
                            row[header]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column Information */}
          <div className="rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 p-6">
              <h2 className="text-base font-semibold text-neutral-950">
                Column Information
              </h2>

              <p className="mt-1 text-xs text-neutral-400">
                Basic column characteristics detected from the
                dataset.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-5 py-3 text-xs font-semibold text-neutral-500">
                      Column
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-neutral-500">
                      Type
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-neutral-500">
                      Missing
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-neutral-500">
                      Unique Values
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {columnInformation.map((column) => (
                    <tr
                      key={column.name}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-neutral-800">
                        {column.name}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                          {column.type}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {column.missing}
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {column.unique}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Continue */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                navigate("/experiments");
              }}
              className="
                inline-flex items-center gap-2
                rounded-xl bg-neutral-950
                px-5 py-2.5
                text-sm font-medium text-white
                transition
                hover:bg-neutral-800
              "
            >
              Continue to Experiments
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}