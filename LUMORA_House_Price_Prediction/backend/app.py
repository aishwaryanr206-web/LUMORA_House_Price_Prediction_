from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
import numpy as np
import pandas as pd
import os
import urllib.parse

app = Flask(__name__)
CORS(app)
BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "..", "Housing.csv")
REQUIRED = [
    "area", "bedrooms", "bathrooms", "stories", "mainroad", "guestroom", "basement",
    "hotwaterheating", "airconditioning", "parking", "prefarea", "furnishingstatus",
    "cctv", "security", "garden", "gym", "swimmingpool", "elevator", "balcony", "clubhouse"
]
EXTRA_FEATURES = ["cctv", "security", "garden", "gym", "swimmingpool", "elevator", "balcony", "clubhouse"]
BOOLEAN_COLUMNS = [
    "mainroad", "guestroom", "basement", "hotwaterheating", "airconditioning",
    "prefarea", "cctv", "security", "garden", "gym", "swimmingpool", "elevator", "balcony", "clubhouse"
]


def extend_dataset(dataset):
    for column in EXTRA_FEATURES:
        if column not in dataset.columns:
            dataset[column] = "no"
    for column in dataset.columns:
        if column in BOOLEAN_COLUMNS:
            dataset[column] = dataset[column].fillna("no").astype(str).str.strip().str.lower()
    return dataset


def load_workspace():
    dataset = extend_dataset(pd.read_csv(DATA))
    encoded = pd.get_dummies(dataset.drop(columns=["price"]), drop_first=True)
    x_train, x_test, y_train, y_test = train_test_split(encoded, dataset["price"], test_size=0.2, random_state=42)
    candidates = {
        "Linear Regression": LinearRegression(),
        "Decision Tree": DecisionTreeRegressor(max_depth=6, random_state=42),
        "Random Forest": RandomForestRegressor(n_estimators=180, max_depth=12, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=140, learning_rate=0.04, max_depth=2, random_state=42),
    }
    results = []
    trained = {}
    for name, candidate in candidates.items():
        candidate.fit(x_train, y_train)
        prediction = candidate.predict(x_test)
        results.append({
            "name": name,
            "r2": round(float(r2_score(y_test, prediction)), 4),
            "mae": round(float(mean_absolute_error(y_test, prediction))),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, prediction)))),
        })
        trained[name] = candidate
    results.sort(key=lambda item: item["r2"], reverse=True)
    return dataset, encoded.columns.tolist(), trained, results, results[0]["name"]


dataset, feature_columns, models, model_metrics, best_model_name = load_workspace()


def prepare(data):
    row = pd.DataFrame([{key: data.get(key, "no") for key in REQUIRED}])
    for column in ["area", "bedrooms", "bathrooms", "stories", "parking"]:
        row[column] = pd.to_numeric(row[column], errors="coerce").fillna(0)
    for column in BOOLEAN_COLUMNS:
        if column in row.columns:
            row[column] = row[column].fillna("no").astype(str).str.strip().str.lower()
    return pd.get_dummies(row, drop_first=True).reindex(columns=feature_columns, fill_value=0)


def money(value):
    return "₹{:,.0f}".format(max(0, value))


def build_upi_url(amount, upi_id, payee_name="LUMORA", note="Property valuation payment"):
    amount_value = float(amount)
    if amount_value < 0:
        raise ValueError("UPI amount cannot be negative")

    params = {
        "pa": upi_id,
        "pn": payee_name,
        "am": f"{amount_value:.2f}",
        "cu": "INR",
        "tn": note,
    }
    return "upi://pay?" + urllib.parse.urlencode(params)


@app.route("/api/upi", methods=["GET", "POST"])
def upi_url():
    if request.method == "POST":
        payload = request.get_json(silent=True) or request.form.to_dict() or {}
    else:
        payload = request.args.to_dict()

    amount = payload.get("amount") or payload.get("amt")
    upi_id = payload.get("upi_id") or payload.get("vpa") or payload.get("upi") or "lumora@upi"
    payee_name = payload.get("payee_name") or payload.get("name") or payload.get("merchant") or "LUMORA"
    note = payload.get("note") or "Property valuation payment"

    if amount is None or str(amount).strip() == "":
        return jsonify({"error": "amount is required"}), 400

    try:
        upi_link = build_upi_url(amount, upi_id, payee_name, note)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid amount provided"}), 400

    return jsonify({
        "upi_url": upi_link,
        "payee_name": payee_name,
        "amount": float(amount),
        "upi_id": upi_id,
        "note": note,
    })


def feature_impacts(data):
    prepared = prepare(data)
    active_model = models[best_model_name]
    raw = np.abs(active_model.feature_importances_) if hasattr(active_model, "feature_importances_") else np.abs(active_model.coef_)
    ranked = sorted(zip(prepared.columns, raw), key=lambda item: item[1], reverse=True)
    labels = {
        "area": "Property size", "bedrooms": "Bedrooms", "bathrooms": "Bathrooms",
        "stories": "Stories", "parking": "Parking", "cctv": "CCTV",
        "security": "Security", "garden": "Garden", "gym": "Gym",
        "swimmingpool": "Swimming pool", "elevator": "Elevator",
        "balcony": "Balcony", "clubhouse": "Clubhouse",
        "airconditioning": "Air conditioning", "mainroad": "Main road",
        "prefarea": "Preferred area"
    }
    impacts = []
    for column, value in ranked[:5]:
        clean = column.replace("_yes", "").replace("_semi-furnished", "").replace("_furnished", "").replace("_unfurnished", "")
        impacts.append({"label": labels.get(clean, clean.replace("_", " ").title()), "value": round(float(value), 4), "positive": True})
    maximum = max((item["value"] for item in impacts), default=1)
    for item in impacts:
        item["percent"] = round(item["value"] / maximum * 100)
    return impacts


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "model": best_model_name})


@app.get("/api/models")
def model_lab():
    return jsonify({"best": best_model_name, "models": model_metrics})


@app.get("/api/analytics")
def analytics():
    sample = dataset.sort_values("area").iloc[::max(1, len(dataset) // 80)]
    correlation_columns = ["price", "area", "bedrooms", "bathrooms", "stories", "parking"]
    correlation = dataset[correlation_columns].corr().round(2)
    return jsonify({
        "summary": {
            "count": int(len(dataset)), "averagePrice": round(float(dataset.price.mean())),
            "maximumPrice": round(float(dataset.price.max())), "minimumPrice": round(float(dataset.price.min())),
            "averageArea": round(float(dataset.area.mean())),
        },
        "distribution": dataset["price"].round(-5).value_counts().sort_index().head(18).reset_index().rename(columns={"price": "value", "count": "count"}).to_dict("records"),
        "areaPrice": sample[["area", "price"]].round().to_dict("records"),
        "bedroomPrice": dataset.groupby("bedrooms", as_index=False)["price"].mean().round().to_dict("records"),
        "furnishingPrice": dataset.groupby("furnishingstatus", as_index=False)["price"].mean().round().to_dict("records"),
        "correlation": {"labels": correlation_columns, "values": correlation.values.tolist()},
    })


@app.post("/api/predict")
def predict():
    data = request.get_json(silent=True) or {}
    missing = [key for key in REQUIRED if key not in data]
    if missing:
        return jsonify({"error": "Missing: " + ", ".join(missing)}), 400
    prediction = float(models[best_model_name].predict(prepare(data))[0])
    metric = next(item for item in model_metrics if item["name"] == best_model_name)
    spread = max(metric["mae"], prediction * 0.08)
    return jsonify({
        "price": round(prediction, 2), "formatted": money(prediction),
        "range": {"low": round(max(0, prediction - spread)), "high": round(prediction + spread)},
        "perSqFt": round(prediction / max(1, float(data["area"]))),
        "confidence": round(max(0.55, min(0.97, 1 - metric["mae"] / max(1, dataset.price.mean()))), 2),
        "model": best_model_name, "metrics": metric, "impacts": feature_impacts(data),
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)
