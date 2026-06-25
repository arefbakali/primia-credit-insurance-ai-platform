"""
Script to train and save the commission prediction model (Gradient Boosting)
Run this script after you have enough data in facteur_risque_calculated.csv
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from optimisation_prime import build_commission_model
import pandas as pd

if __name__ == "__main__":
    print("=" * 70)
    print("TRAINING AND SAVING COMMISSION PREDICTION MODEL")
    print("Model: Gradient Boosting Regressor")
    print("=" * 70)
    
    # Check if input data exists
    DATA_DIR = "data"
    INPUT_CSV = os.path.join(DATA_DIR, "facteur_risque_calculated.csv")
    
    if not os.path.exists(INPUT_CSV):
        print(f"\n[ERROR] Input file not found: {INPUT_CSV}")
        print("Please run facteur_risque.PY first to generate the risk factors.")
        sys.exit(1)
    
    # Load data
    print(f"\n[1/2] Loading data from {INPUT_CSV}...")
    try:
        df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')
        print(f"  [OK] Loaded {len(df)} records")
    except Exception as e:
        print(f"  [ERROR] Failed to load data: {e}")
        sys.exit(1)
    
    # Build and save model (Gradient Boosting only)
    print(f"\n[2/2] Training Gradient Boosting model...")
    model, scaler = build_commission_model(df)
    
    if model is None:
        print("\n[ERROR] Model training failed. Not enough data or error occurred.")
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("[SUCCESS] Gradient Boosting model trained and saved successfully!")
    print("=" * 70)
    print("\nModel files saved in 'backend/models/' directory:")
    print("  - commission_model.joblib (Gradient Boosting)")
    print("  - model_metadata.json")
    print("\nThe model is now ready to use in the backend for predictions.")

