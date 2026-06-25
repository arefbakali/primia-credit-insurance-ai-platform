"""
Python script to load and use the saved commission prediction model
This script is called from Node.js to make predictions
"""
import sys
import json
import os
import joblib
import numpy as np
from pathlib import Path

# Get the models directory path (in backend)
MODELS_DIR = os.path.join(Path(__file__).parent.parent, 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'commission_model.joblib')
SCALER_PATH = os.path.join(MODELS_DIR, 'commission_scaler.joblib')
METADATA_PATH = os.path.join(MODELS_DIR, 'model_metadata.json')

def predict_commission(facteur_risque, montant_credit, taux_interet, duree,
                     secteur_score, sinistres_score, type_credit_score, etat_financier_score):
    """
    Predict commission using the saved model.
    
    Returns:
        float: Predicted commission rate (%), or None if model not available
    """
    try:
        # Check if model exists
        if not os.path.exists(MODEL_PATH):
            return None
        
        # Load model
        model = joblib.load(MODEL_PATH)
        
        # Load metadata to check if scaler is needed
        uses_scaler = False
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                uses_scaler = metadata.get('uses_scaler', False)
        
        # Prepare features in the correct order
        features = np.array([[
            facteur_risque,
            montant_credit,
            taux_interet,
            duree,
            secteur_score,
            sinistres_score,
            type_credit_score,
            etat_financier_score
        ]])
        
        # Scale if needed (for Linear Regression only)
        if uses_scaler and os.path.exists(SCALER_PATH):
            scaler = joblib.load(SCALER_PATH)
            features = scaler.transform(features)
        
        # Predict
        prediction = model.predict(features)[0]
        
        # Ensure prediction is within valid range (0.3% to 4%)
        prediction = max(0.3, min(4.0, prediction))
        
        return round(float(prediction), 2)
    
    except Exception as e:
        print(f"Error predicting commission: {e}", file=sys.stderr)
        return None


if __name__ == "__main__":
    # Read input from command line arguments
    if len(sys.argv) < 9:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
    
    try:
        facteur_risque = float(sys.argv[1])
        montant_credit = float(sys.argv[2])
        taux_interet = float(sys.argv[3])
        duree = float(sys.argv[4])
        secteur_score = float(sys.argv[5])
        sinistres_score = float(sys.argv[6])
        type_credit_score = float(sys.argv[7])
        etat_financier_score = float(sys.argv[8])
        
        prediction = predict_commission(
            facteur_risque, montant_credit, taux_interet, duree,
            secteur_score, sinistres_score, type_credit_score, etat_financier_score
        )
        
        if prediction is not None:
            print(json.dumps({"commission_predite": prediction}))
        else:
            print(json.dumps({"error": "Model not available or prediction failed"}))
    
    except Exception as e:
        print(json.dumps({"error": str(e)}))

