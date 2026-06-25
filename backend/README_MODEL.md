# ML Model Setup for Commission Prediction

## Overview

The commission optimization system can use a trained ML model to predict optimal commission rates. The model is trained using the `optimisation_prime.py` script and saved as a joblib file.

## Setup Steps

### 1. Install Dependencies

Make sure `joblib` is installed in your Python environment:

```bash
cd ia_model
pip install joblib
```

Or update requirements.txt (already done):
```bash
pip install -r requirements.txt
```

### 2. Train the Model

First, ensure you have data in `ia_model/data/facteur_risque_calculated.csv`. If not, run:

```bash
cd ia_model
python facteur_risque.PY
```

Then train and save the model:

```bash
# Option 1: Use the training script
python train_and_save_model.py

# Option 2: Run optimisation_prime.py (it will save the model automatically)
python optimisation_prime.py
```

This will create:
- `data/commission_model.joblib` - The trained model
- `data/commission_scaler.joblib` - The scaler (if Linear Regression was selected)
- `data/model_metadata.json` - Model metadata

### 3. Verify Model Files

Check that these files exist:
```
ia_model/data/
  ├── commission_model.joblib
  ├── commission_scaler.joblib (optional)
  └── model_metadata.json
```

### 4. Use in Backend

The backend will automatically use the model if it exists. The `optimizeCommissionService.js` will:
1. Try to load and use the ML model for predictions
2. Fall back to optimization function if model is not available

## Model Files Location

```
MakinaProject/
  └── backend/
      └── models/
          ├── commission_model.joblib      # Trained Gradient Boosting model
          └── model_metadata.json          # Model info and metrics
```

The model is saved directly in the backend for easy access.

## How It Works

1. **Training**: `optimisation_prime.py` trains multiple models and selects the best one
2. **Saving**: Model is saved using `joblib.dump()`
3. **Loading**: `loadCommissionModel.py` loads the model for predictions
4. **Prediction**: Backend calls Python script to get predictions

## API Integration

The model is automatically used in the quote generation pipeline:

```
POST /api/quotes/generate
```

The response includes:
```json
{
  "commission": {
    "commission_base": 1.5,
    "commission_optimale": 1.8,
    "commission_predite": 1.75,  // ML model prediction (if available)
    "montant_commission": 1800.00
  }
}
```

## Retraining the Model

When you have new data, retrain the model:

```bash
cd ia_model
python train_and_save_model.py
```

The new model will automatically be used by the backend.

## Troubleshooting

### Model Not Found
- Error: "Model not available or prediction failed"
- Solution: Run `train_and_save_model.py` from `ia_model/` directory to create the model
- Model will be saved in `backend/models/` directory

### Python Path Issues
- Set `PYTHON_PATH` in `.env`: `PYTHON_PATH=python3` or `PYTHON_PATH=C:\Python\python.exe`

### Model File Location
- Ensure model files are in `backend/models/` directory
- Check file permissions
- Verify the directory exists: `backend/models/`

## Model Selection

The training script uses **Gradient Boosting Regressor** as the best model:
- Best performance for regression tasks
- Handles non-linear relationships well
- No feature scaling required
- Good generalization

This is the optimal model for commission prediction.

