# LUMORA — Intelligent Real Estate Valuation & Insights Platform

## Dataset used
`Housing.csv` is an exact copy of the uploaded `Housing(1).csv`.

- Rows: 545
- Columns: 13
- Target: price

## What this project demonstrates
- Data preprocessing and one-hot encoding
- Four-model benchmark: Linear Regression, Decision Tree, Random Forest, and Gradient Boosting
- Automatic model selection using a held-out 80/20 test split
- Explainable predictions with expected range, confidence, price per square foot, and feature impacts
- Dataset analytics for price, area, bedrooms, furnishing, and distribution trends
- Guided three-step prediction studio and property comparison
- Local prediction history, dark mode, and downloadable PDF property reports
- React frontend + Flask ML backend

## API surfaces
- `GET /api/health` — service status and selected model
- `GET /api/models` — model benchmark metrics
- `GET /api/analytics` — dataset summary and chart-ready series
- `POST /api/predict` — valuation, range, confidence, model metrics, and feature impacts
- `GET /api/upi` and `POST /api/upi` — generate a valid UPI deep link for payment requests using `amount`, `upi_id`, `payee_name`, and optional `note`

## Run

### Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Folder structure
```
LUMORA_House_Price_Prediction/
├── Housing.csv
├── README.md
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── model/
│       ├── linear_regression.joblib
│       └── feature_columns.joblib
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        └── styles.css
```
