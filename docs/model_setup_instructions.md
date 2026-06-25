# ML Model Setup Instructions

## Quick Start

### Step 1: Install joblib
```bash
cd ia_model
pip install joblib
```

### Step 2: Prepare Data
Make sure you have `facteur_risque_calculated.csv` in `ia_model/data/`:
```bash
cd ia_model
python facteur_risque.PY
```

### Step 3: Train and Save Model
```bash
cd ia_model
python train_and_save_model.py
```

This will create in `backend/models/`:
- `commission_model.joblib` - The trained Gradient Boosting model
- `model_metadata.json` - Model information and metrics

### Step 4: Verify Files
Check that these files exist:
```
backend/models/
  ├── commission_model.joblib
  └── model_metadata.json
```

## How It Works

1. **Training**: The script trains Gradient Boosting model (best for this task)
2. **Saving**: Model is saved in `backend/models/` directory using `joblib.dump()`
3. **Loading**: Backend loads model directly from `backend/models/` via Python script
4. **Prediction**: Model predicts commission rate for new quotes

## Backend Integration

The backend automatically:
- ✅ Checks if model exists
- ✅ Uses ML model prediction if available
- ✅ Falls back to optimization function if model not found
- ✅ Saves `commission_predite` in database

## API Response

When model is available, the API returns:
```json
{
  "commission": {
    "commission_base": 1.5,
    "commission_optimale": 1.8,
    "commission_predite": 1.75,  // ML model prediction
    "montant_commission": 1800.00
  }
}
```

## Retraining

When you have new data, simply retrain:
```bash
cd ia_model
python train_and_save_model.py
```

The new model will be automatically used by the backend.

## Troubleshooting

**Model not found?**
- Run `train_and_save_model.py` from `ia_model/` directory to create it
- Check file path: `backend/models/commission_model.joblib`
- Ensure `backend/models/` directory exists

**Python path issues?**
- Set `PYTHON_PATH=python3` in `.env` (or full path to Python executable)

**Import errors?**
- Install dependencies: `pip install -r ia_model/requirements.txt`

