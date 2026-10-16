from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import numpy as np
import io
import time

from sklearn.model_selection import train_test_split

from sklearn.preprocessing import (
    LabelEncoder,
    OneHotEncoder,
    StandardScaler
)

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    balanced_accuracy_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from sklearn.linear_model import (
    LogisticRegression,
    LinearRegression
)

from sklearn.neighbors import (
    KNeighborsClassifier,
    KNeighborsRegressor
)

from sklearn.tree import (
    DecisionTreeClassifier,
    DecisionTreeRegressor
)

from sklearn.naive_bayes import GaussianNB

from sklearn.svm import (
    SVC,
    SVR
)

from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="MLens API",
    description="Machine Learning Experiment and Model Comparison API",
    version="3.1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "MLens backend is running",
        "version": "3.1.0"
    }


# ============================================================
# HELPER: DETECT PROBLEM TYPE
# ============================================================

def detect_problem_type(df, target):

    target_series = df[target]

    unique_values = int(target_series.nunique())
    rows = len(target_series)

    unique_ratio = unique_values / max(rows, 1)

    if pd.api.types.is_numeric_dtype(target_series):

        if unique_values <= 10:
            problem_type = "classification"

        elif unique_ratio < 0.05:
            problem_type = "classification"

        else:
            problem_type = "regression"

    else:
        problem_type = "classification"

    return problem_type


# ============================================================
# HELPER: ANALYZE CLASSES
# ============================================================

def analyze_classes(y):

    counts = pd.Series(y).value_counts()

    number_of_classes = len(counts)

    minimum_samples = int(counts.min())

    maximum_samples = int(counts.max())

    median_samples = float(counts.median())

    rare_classes = int((counts <= 2).sum())

    rare_class_percentage = (
        rare_classes / max(number_of_classes, 1) * 100
    )

    imbalance_ratio = (
        maximum_samples / max(minimum_samples, 1)
    )

    if number_of_classes >= 50:
        cardinality_level = "high"

    elif number_of_classes >= 10:
        cardinality_level = "medium"

    else:
        cardinality_level = "low"

    return {
        "number_of_classes": number_of_classes,
        "minimum_samples_per_class": minimum_samples,
        "maximum_samples_per_class": maximum_samples,
        "median_samples_per_class": round(median_samples, 2),
        "rare_classes": rare_classes,
        "rare_class_percentage": round(
            rare_class_percentage,
            2
        ),
        "imbalance_ratio": round(
            imbalance_ratio,
            2
        ),
        "cardinality": cardinality_level
    }


# ============================================================
# HELPER: CREATE MODEL
# ============================================================

def create_model(algorithm, problem_type):

    if problem_type == "classification":

        models = {

            "logistic_regression":
                LogisticRegression(
                    max_iter=1000
                ),

            "knn":
                KNeighborsClassifier(
                    n_neighbors=5
                ),

            "decision_tree":
                DecisionTreeClassifier(
                    random_state=42
                ),

            "naive_bayes":
                GaussianNB(),

            "svm":
                SVC(),

            "random_forest":
                RandomForestClassifier(
                    n_estimators=100,
                    random_state=42,
                    n_jobs=-1
                )
        }

    else:

        models = {

            "linear_regression":
                LinearRegression(),

            "knn_regression":
                KNeighborsRegressor(
                    n_neighbors=5
                ),

            "decision_tree_regression":
                DecisionTreeRegressor(
                    random_state=42
                ),

            "random_forest":
                RandomForestRegressor(
                    n_estimators=100,
                    random_state=42,
                    n_jobs=-1
                ),

            "svr":
                SVR()
        }

    if algorithm not in models:
        raise ValueError(
            f"Unknown algorithm: {algorithm}"
        )

    return models[algorithm]


# ============================================================
# HELPER: GET ALGORITHMS
# ============================================================

def get_algorithms(problem_type):

    if problem_type == "classification":

        return [
            "logistic_regression",
            "knn",
            "decision_tree",
            "naive_bayes",
            "svm",
            "random_forest"
        ]

    return [
        "linear_regression",
        "knn_regression",
        "decision_tree_regression",
        "random_forest",
        "svr"
    ]


# ============================================================
# HELPER: TRAIN ONE MODEL
# ============================================================

def train_single_model(
    algorithm,
    problem_type,
    X_train,
    X_test,
    y_train,
    y_test
):

    start_time = time.time()

    model = create_model(
        algorithm,
        problem_type
    )

    # --------------------------------------------------------
    # Identify columns
    # --------------------------------------------------------

    numeric_columns = X_train.select_dtypes(
        include=np.number
    ).columns.tolist()

    categorical_columns = X_train.select_dtypes(
        exclude=np.number
    ).columns.tolist()

    # --------------------------------------------------------
    # Naive Bayes requires dense input
    # --------------------------------------------------------

    dense_output = (
        problem_type == "classification"
        and algorithm == "naive_bayes"
    )

    # --------------------------------------------------------
    # Numeric pipeline
    # --------------------------------------------------------

    numeric_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="median"
                )
            ),
            (
                "scaler",
                StandardScaler()
            )
        ]
    )

    # --------------------------------------------------------
    # Categorical pipeline
    # --------------------------------------------------------

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="most_frequent"
                )
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=not dense_output
                )
            )
        ]
    )

    # --------------------------------------------------------
    # Preprocessor
    # --------------------------------------------------------

    transformers = []

    if numeric_columns:

        transformers.append(
            (
                "numeric",
                numeric_pipeline,
                numeric_columns
            )
        )

    if categorical_columns:

        transformers.append(
            (
                "categorical",
                categorical_pipeline,
                categorical_columns
            )
        )

    preprocessor = ColumnTransformer(
        transformers=transformers
    )

    # --------------------------------------------------------
    # Complete pipeline
    # --------------------------------------------------------

    pipeline = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor
            ),
            (
                "model",
                model
            )
        ]
    )

    # --------------------------------------------------------
    # Train
    # --------------------------------------------------------

    pipeline.fit(
        X_train,
        y_train
    )

    # --------------------------------------------------------
    # Predict
    # --------------------------------------------------------

    predictions = pipeline.predict(
        X_test
    )

    training_time = time.time() - start_time

    # ========================================================
    # CLASSIFICATION METRICS
    # ========================================================

    if problem_type == "classification":

        accuracy = accuracy_score(
            y_test,
            predictions
        )

        precision = precision_score(
            y_test,
            predictions,
            average="weighted",
            zero_division=0
        )

        recall = recall_score(
            y_test,
            predictions,
            average="weighted",
            zero_division=0
        )

        weighted_f1 = f1_score(
            y_test,
            predictions,
            average="weighted",
            zero_division=0
        )

        macro_f1 = f1_score(
            y_test,
            predictions,
            average="macro",
            zero_division=0
        )

        balanced_accuracy = balanced_accuracy_score(
            y_test,
            predictions
        )

        return {
            "algorithm": algorithm,
            "status": "success",
            "metrics": {
                "accuracy": round(
                    accuracy,
                    4
                ),
                "precision": round(
                    precision,
                    4
                ),
                "recall": round(
                    recall,
                    4
                ),
                "f1_score": round(
                    weighted_f1,
                    4
                ),
                "macro_f1": round(
                    macro_f1,
                    4
                ),
                "balanced_accuracy": round(
                    balanced_accuracy,
                    4
                )
            },
            "training_time_seconds": round(
                training_time,
                3
            )
        }

    # ========================================================
    # REGRESSION METRICS
    # ========================================================

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    mse = mean_squared_error(
        y_test,
        predictions
    )

    rmse = np.sqrt(mse)

    r2 = r2_score(
        y_test,
        predictions
    )

    return {
        "algorithm": algorithm,
        "status": "success",
        "metrics": {
            "mae": round(
                mae,
                4
            ),
            "mse": round(
                mse,
                4
            ),
            "rmse": round(
                rmse,
                4
            ),
            "r2_score": round(
                r2,
                4
            )
        },
        "training_time_seconds": round(
            training_time,
            3
        )
    }


# ============================================================
# ANALYZE DATASET
# ============================================================

@app.post("/analyze")
async def analyze_dataset(
    file: UploadFile = File(...)
):

    contents = await file.read()

    df = pd.read_csv(
        io.BytesIO(contents)
    )

    missing_values = int(
        df.isnull().sum().sum()
    )

    numeric_columns = df.select_dtypes(
        include=np.number
    ).columns.tolist()

    categorical_columns = df.select_dtypes(
        exclude=np.number
    ).columns.tolist()

    return {
        "success": True,
        "filename": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": df.columns.tolist(),
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "missing_values": missing_values,
        "duplicate_rows": int(
            df.duplicated().sum()
        )
    }


# ============================================================
# UPLOAD
# ============================================================

@app.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...)
):

    contents = await file.read()

    df = pd.read_csv(
        io.BytesIO(contents)
    )

    return {
        "success": True,
        "filename": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": df.columns.tolist()
    }


# ============================================================
# TRAIN SINGLE MODEL
# ============================================================

@app.post("/train")
async def train_model(
    file: UploadFile = File(...),
    target: str = Form(...),
    algorithm: str = Form("auto")
):

    contents = await file.read()

    df = pd.read_csv(
        io.BytesIO(contents)
    )

    if target not in df.columns:

        return {
            "success": False,
            "error": f"Target column '{target}' not found."
        }

    df = df.dropna(
        subset=[target]
    )

    if len(df) < 20:

        return {
            "success": False,
            "error": "Dataset must contain at least 20 valid rows."
        }

    problem_type = detect_problem_type(
        df,
        target
    )

    X = df.drop(
        columns=[target]
    )

    y = df[target]

    label_encoder = None

    if problem_type == "classification":

        label_encoder = LabelEncoder()

        y = label_encoder.fit_transform(
            y.astype(str)
        )

    # --------------------------------------------------------
    # Select algorithm automatically
    # --------------------------------------------------------

    if algorithm == "auto":

        if problem_type == "classification":

            algorithm = "logistic_regression"

        else:

            algorithm = "random_forest"

    # --------------------------------------------------------
    # Split dataset
    # --------------------------------------------------------

    stratify_value = None

    if problem_type == "classification":

        class_counts = pd.Series(
            y
        ).value_counts()

        if len(class_counts) > 1:

            if class_counts.min() >= 2:

                stratify_value = y

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=stratify_value
    )

    try:

        result = train_single_model(
            algorithm,
            problem_type,
            X_train,
            X_test,
            y_train,
            y_test
        )

        return {
            "success": True,
            "problem_type": problem_type,
            "target": target,
            "algorithm": algorithm,
            "dataset": {
                "rows": len(df),
                "features": X.shape[1],
                "train_rows": len(X_train),
                "test_rows": len(X_test)
            },
            "metrics": result["metrics"],
            "training_time_seconds":
                result["training_time_seconds"]
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }


# ============================================================
# TRAIN ALL MODELS
# ============================================================

@app.post("/train-all")
async def train_all_models(
    file: UploadFile = File(...),
    target: str = Form(...)
):

    # --------------------------------------------------------
    # Read CSV
    # --------------------------------------------------------

    contents = await file.read()

    df = pd.read_csv(
        io.BytesIO(contents)
    )

    # --------------------------------------------------------
    # Validate target
    # --------------------------------------------------------

    if target not in df.columns:

        return {
            "success": False,
            "error": f"Target column '{target}' not found."
        }

    # --------------------------------------------------------
    # Remove rows where target is missing
    # --------------------------------------------------------

    df = df.dropna(
        subset=[target]
    )

    if len(df) < 20:

        return {
            "success": False,
            "error": "Dataset must contain at least 20 valid rows."
        }

    # --------------------------------------------------------
    # Detect problem
    # --------------------------------------------------------

    problem_type = detect_problem_type(
        df,
        target
    )

    # --------------------------------------------------------
    # Prepare X and y
    # --------------------------------------------------------

    X = df.drop(
        columns=[target]
    )

    y = df[target]

    # --------------------------------------------------------
    # Classification encoding
    # --------------------------------------------------------

    label_encoder = None

    if problem_type == "classification":

        label_encoder = LabelEncoder()

        y = label_encoder.fit_transform(
            y.astype(str)
        )

    # --------------------------------------------------------
    # Class analysis
    # --------------------------------------------------------

    class_analysis = None

    if problem_type == "classification":

        class_analysis = analyze_classes(
            y
        )

    # --------------------------------------------------------
    # Split
    # --------------------------------------------------------

    stratify_value = None

    if problem_type == "classification":

        class_counts = pd.Series(
            y
        ).value_counts()

        if len(class_counts) > 1:

            if class_counts.min() >= 2:

                stratify_value = y

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=stratify_value
    )

    # --------------------------------------------------------
    # Get algorithms
    # --------------------------------------------------------

    algorithms = get_algorithms(
        problem_type
    )

    results = []

    failed_models = []

    # ========================================================
    # TRAIN EVERY MODEL
    # ========================================================

    for algorithm in algorithms:

        try:

            result = train_single_model(
                algorithm,
                problem_type,
                X_train,
                X_test,
                y_train,
                y_test
            )

            results.append(
                result
            )

        except Exception as e:

            failed_models.append(
                {
                    "algorithm": algorithm,
                    "status": "failed",
                    "error": str(e)
                }
            )

    # ========================================================
    # DETERMINE RANKING STRATEGY
    # ========================================================

    ranking_metric = None

    ranking_reason = None

    if problem_type == "classification":

        # ----------------------------------------------------
        # High-cardinality / severe imbalance
        # ----------------------------------------------------

        difficult_classification = (
            class_analysis["cardinality"] == "high"
            or
            class_analysis["rare_class_percentage"] > 20
            or
            class_analysis["imbalance_ratio"] > 10
        )

        if difficult_classification:

            ranking_metric = "macro_f1"

            ranking_reason = (
                "High-cardinality and/or severe class "
                "imbalance detected; Macro F1 is used "
                "as the primary ranking metric so that "
                "performance across minority classes "
                "is considered more fairly."
            )

        else:

            ranking_metric = "f1_score"

            ranking_reason = (
                "Standard classification detected; "
                "weighted F1 is used as the primary "
                "ranking metric."
            )

    else:

        ranking_metric = "r2_score"

        ranking_reason = (
            "Regression detected; R² is used as the "
            "primary ranking metric."
        )

    # ========================================================
    # SORT MODELS
    # ========================================================

    if problem_type == "classification":

        results.sort(
            key=lambda x: x["metrics"].get(
                ranking_metric,
                -float("inf")
            ),
            reverse=True
        )

    else:

        results.sort(
            key=lambda x: x["metrics"].get(
                ranking_metric,
                -float("inf")
            ),
            reverse=True
        )

    # ========================================================
    # ASSIGN RANK
    # ========================================================

    for index, result in enumerate(
        results,
        start=1
    ):

        result["rank"] = index

    # ========================================================
    # BEST MODEL
    # ========================================================

    best_model = None

    if results:

        best_result = results[0]

        best_model = {
            "algorithm":
                best_result["algorithm"],

            "metric":
                ranking_metric,

            "score":
                best_result["metrics"].get(
                    ranking_metric
                )
        }

    # ========================================================
    # INSIGHTS
    # ========================================================

    insights = []

    # --------------------------------------------------------
    # Classification insights
    # --------------------------------------------------------

    if problem_type == "classification":

        if class_analysis["cardinality"] == "high":

            insights.append(
                "High-cardinality classification detected."
            )

        if class_analysis[
            "rare_class_percentage"
        ] > 20:

            insights.append(
                "A large percentage of classes have "
                "very few samples."
            )

        if class_analysis[
            "imbalance_ratio"
        ] > 10:

            insights.append(
                "Strong class imbalance is present."
            )

        if class_analysis[
            "minimum_samples_per_class"
        ] == 1:

            insights.append(
                "Some classes contain only one sample; "
                "this makes reliable generalization "
                "for those classes difficult."
            )

        if ranking_metric == "macro_f1":

            insights.append(
                "Macro F1 is being used for model ranking "
                "because minority-class performance "
                "needs greater consideration."
            )

    # --------------------------------------------------------
    # Missing values
    # --------------------------------------------------------

    missing_values = int(
        X.isnull().sum().sum()
    )

    if missing_values > 0:

        insights.append(
            "Missing values were detected and "
            "automatically imputed."
        )

    # --------------------------------------------------------
    # Categorical features
    # --------------------------------------------------------

    categorical_columns = X.select_dtypes(
        exclude=np.number
    ).columns.tolist()

    if categorical_columns:

        insights.append(
            "Categorical features were automatically encoded."
        )

    # --------------------------------------------------------
    # Regression insight
    # --------------------------------------------------------

    if problem_type == "regression":

        insights.append(
            "Multiple regression algorithms were "
            "trained and compared using R²."
        )

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {
        "success": True,

        "problem_type": problem_type,

        "target": target,

        "dataset": {
            "rows": len(df),
            "features": X.shape[1],
            "train_rows": len(X_train),
            "test_rows": len(X_test)
        },

        "class_analysis":
            class_analysis,

        "models":
            results,

        "failed_models":
            failed_models,

        "best_model":
            best_model,

        "ranking_metric":
            ranking_metric,

        "ranking_reason":
            ranking_reason,

        "insights":
            insights
    }