# Backend Models Directory

This directory contains:

## JavaScript Data Models
- `Credit.js` - Credit data model
- `Insurer.js` - Insurer data model  
- `User.js` - User data model

## ML Model Files (after training)
- `commission_model.joblib` - Trained Gradient Boosting model for commission prediction
- `model_metadata.json` - Model metadata and performance metrics

## How to Generate ML Model

Run from `ia_model/` directory:
```bash
python train_and_save_model.py
```

The model will be automatically saved here in `backend/models/`.

## Model Usage

The backend automatically loads the model from this directory when making commission predictions.

