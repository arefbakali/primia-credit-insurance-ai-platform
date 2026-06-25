import pandas as pd
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

# Configuration
DATA_DIR = "data"
# Path to backend/models directory (relative to ia_model directory)
BACKEND_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "models")
INPUT_CSV = os.path.join(DATA_DIR, "facteur_risque_calculated.csv")
OUTPUT_CSV = os.path.join(DATA_DIR, "commissions_optimales.csv")
MODEL_OUTPUT = os.path.join(DATA_DIR, "modele_optimisation_results.csv")

# Save model in backend/models directory
MODEL_PATH = os.path.join(BACKEND_MODELS_DIR, "commission_model.joblib")
SCALER_PATH = os.path.join(BACKEND_MODELS_DIR, "commission_scaler.joblib")
MODEL_METADATA_PATH = os.path.join(BACKEND_MODELS_DIR, "model_metadata.json")

# Poids pour la fonction d'objectif
# Ajustés pour minimiser la commission tout en couvrant le risque
ALPHA = 0.3  # Poids pour le facteur de risque (importance: minimiser le risque)
BETA = 0.7   # Poids pour la commission (importance: minimiser la commission - PRIORITÉ)

# Paramètres pour le calcul de commission de base
MIN_COMMISSION_RATE = 0.3   # Commission minimale en % (0.3% - plus basse)
MAX_COMMISSION_RATE = 4.0   # Commission maximale en % (4% - réduite)
BASE_COMMISSION_RATE = 1.5  # Commission de base en % (1.5% - réduite)


def calculate_base_commission(facteur_risque, montant_credit, taux_interet, duree):
    """
    Calcule la commission de base minimale nécessaire pour couvrir le risque.
    Optimisée pour être la plus basse possible tout en couvrant le risque.
    """
    # Normaliser le facteur de risque (supposé entre 0 et 10)
    risque_norm = min(facteur_risque / 10.0, 1.0)
    
    # Commission minimale basée sur le risque (0.3% à 4%)
    # Utilisation d'une fonction plus conservatrice qui privilégie les commissions basses
    commission_risque = MIN_COMMISSION_RATE + (MAX_COMMISSION_RATE - MIN_COMMISSION_RATE) * (risque_norm ** 1.2)
    # L'exposant 1.2 rend la courbe plus progressive (commissions plus basses pour risques moyens)
    
    # Ajustements basés sur les autres facteurs - optimisés pour minimiser
    # Montant: économie d'échelle plus importante pour gros montants
    montant_adj = 1.0 - (min(montant_credit / 100000000.0, 0.15))  # Réduction max 15% pour gros montants
    
    # Taux: ajustement plus conservateur
    taux_adj = 1.0 + (max(taux_interet - 7.0, 0) / 10.0) * 0.15  # Augmentation réduite à 15%
    
    # Durée: ajustement plus conservateur
    duree_mois = duree
    duree_adj = 1.0 + (max(duree_mois - 72, 0) / 120.0) * 0.10  # Augmentation réduite à 10%
    
    # Calcul final avec plancher de sécurité basé sur le risque minimum
    commission_finale = commission_risque * montant_adj * taux_adj * duree_adj
    
    # Assurer un minimum qui couvre toujours le risque de base
    commission_minimale_risque = MIN_COMMISSION_RATE + (risque_norm * 0.5)  # Minimum 0.3% + ajustement risque
    
    commission_finale = max(commission_minimale_risque, min(commission_finale, MAX_COMMISSION_RATE))
    
    return round(commission_finale, 2)


def objective_function(facteur_risque, commission_rate, montant_credit):
    """
    Fonction d'objectif à minimiser:
    α × facteur_risque + β × commission
    
    Ajustée pour privilégier la minimisation de la commission tout en couvrant le risque.
    """
    commission_absolute = commission_rate * montant_credit / 100
    # Normaliser pour que les deux termes soient dans une même échelle
    # Facteur de risque normalisé (0-10)
    risque_norm = facteur_risque / 10.0
    
    # Commission normalisée (basée sur 1.5% du montant moyen pour permettre des commissions plus basses)
    commission_norm = commission_absolute / (montant_credit * 0.015)
    
    # Pénalité si la commission est trop basse pour couvrir le risque
    # Minimum de commission nécessaire = 0.3% + (risque_norm * 0.37%)
    commission_min_necessaire = 0.003 + (risque_norm * 0.0037)
    if commission_rate / 100 < commission_min_necessaire:
        penalty = (commission_min_necessaire - commission_rate / 100) * 10  # Pénalité importante
    else:
        penalty = 0
    
    objective = ALPHA * risque_norm + BETA * commission_norm + penalty
    return objective


def optimize_commission(facteur_risque, montant_credit, taux_interet, duree, 
                       secteur_score, sinistres_score, type_credit_score, etat_financier_score):
    """
    Optimise la commission pour minimiser la fonction d'objectif.
    Recherche la commission la plus basse possible qui couvre le risque.
    """
    # Calculer la commission de base minimale nécessaire
    commission_base = calculate_base_commission(facteur_risque, montant_credit, taux_interet, duree)
    
    # Calculer le minimum de commission nécessaire pour couvrir le risque
    risque_norm = min(facteur_risque / 10.0, 1.0)
    commission_min_necessaire = MIN_COMMISSION_RATE + (risque_norm * 0.5)
    commission_min_necessaire = max(MIN_COMMISSION_RATE, min(commission_min_necessaire, MAX_COMMISSION_RATE))
    
    # Recherche de la commission optimale dans une plage plus basse
    # Commencer à partir du minimum nécessaire, aller jusqu'à la commission de base + marge
    start_commission = max(commission_min_necessaire, MIN_COMMISSION_RATE)
    end_commission = min(commission_base * 1.2, MAX_COMMISSION_RATE)  # Maximum 20% au-dessus de la base
    
    commission_candidates = np.linspace(start_commission, end_commission, 200)
    
    best_objective = float('inf')
    best_commission = commission_min_necessaire
    
    for commission_candidate in commission_candidates:
        objective_value = objective_function(facteur_risque, commission_candidate, montant_credit)
        
        if objective_value < best_objective:
            best_objective = objective_value
            best_commission = commission_candidate
    
    # Assurer que la commission finale couvre au minimum le risque
    commission_finale = max(best_commission, commission_min_necessaire)
    
    return round(commission_finale, 2), round(best_objective, 4)


def build_commission_model(df):
    """
    Construit le meilleur modèle de prédiction de commission optimale.
    Utilise Gradient Boosting comme modèle principal (meilleur performance).
    """
    # Préparer les features
    feature_columns = [
        'facteur_risque', 'montant_credit', 'taux_interet', 'duree',
        'secteur_score', 'sinistres_score', 'type_credit_score', 'etat_financier_score'
    ]
    
    # Filtrer les données avec valeurs valides
    df_clean = df[feature_columns].dropna()
    
    if len(df_clean) < 5:
        print("  [WARNING] Pas assez de données pour entraîner le modèle")
        return None, None
    
    X = df_clean[feature_columns]
    
    # Calculer les commissions optimales comme target
    print("  [INFO] Calcul des commissions optimales pour l'entraînement...")
    y = []
    for idx, row in df_clean.iterrows():
        commission_opt, _ = optimize_commission(
            row['facteur_risque'],
            row['montant_credit'],
            row['taux_interet'],
            row['duree'],
            row['secteur_score'],
            row['sinistres_score'],
            row['type_credit_score'],
            row['etat_financier_score']
        )
        y.append(commission_opt)
    
    y = np.array(y)
    
    # Diviser en train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Utiliser Gradient Boosting (meilleur modèle en général)
    print("  [INFO] Entraînement du modèle Gradient Boosting...")
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    # Évaluer le modèle
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"  [OK] Modèle entraîné: Gradient Boosting")
    print(f"  [OK] MSE: {mse:.4f}")
    print(f"  [OK] R²: {r2:.4f}")
    print(f"  [OK] MAE: {mae:.4f}")
    
    # Save model in backend/models directory
    os.makedirs(BACKEND_MODELS_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"  [OK] Modèle sauvegardé: {MODEL_PATH}")
    
    # Save metadata
    import json
    metadata = {
        'model_name': 'Gradient Boosting',
        'mse': float(mse),
        'r2': float(r2),
        'mae': float(mae),
        'uses_scaler': False,
        'feature_columns': feature_columns,
        'n_samples': len(df_clean),
        'n_train': len(X_train),
        'n_test': len(X_test)
    }
    with open(MODEL_METADATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"  [OK] Metadata sauvegardée: {MODEL_METADATA_PATH}")
    
    return model, None  # No scaler needed for Gradient Boosting


def main():
    print("=" * 70)
    print("OPTIMISATION DE LA COMMISSION (PRIME) OPTIMALE")
    print("=" * 70)
    
    # Charger les données
    print("\n[1/5] Chargement des donnees...")
    try:
        df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')
        print(f"  [OK] Donnees chargees: {len(df)} lignes")
    except Exception as e:
        print(f"  [ERROR] Erreur lors du chargement: {e}")
        return
    
    # Calculer les commissions optimales
    print("\n[2/5] Calcul des commissions optimales...")
    commissions = []
    objectives = []
    commissions_base = []
    
    for idx, row in df.iterrows():
        facteur_risque = row['facteur_risque']
        montant = row['montant_credit']
        taux = row['taux_interet']
        duree = row['duree']
        secteur = row.get('secteur_score', 5)
        sinistres = row.get('sinistres_score', 5)
        type_credit = row.get('type_credit_score', 5)
        etat = row.get('etat_financier_score', 5)
        
        # Calculer commission de base
        commission_base = calculate_base_commission(facteur_risque, montant, taux, duree)
        commissions_base.append(commission_base)
        
        # Optimiser la commission
        commission_opt, objective = optimize_commission(
            facteur_risque, montant, taux, duree, secteur, sinistres, type_credit, etat
        )
        commissions.append(commission_opt)
        objectives.append(objective)
    
    df['commission_base'] = commissions_base
    df['commission_optimale'] = commissions
    df['fonction_objectif'] = objectives
    df['montant_commission'] = df['commission_optimale'] * df['montant_credit'] / 100
    
    print(f"  [OK] Commissions calculees pour {len(commissions)} offres")
    print(f"  Commission moyenne: {np.mean(commissions):.2f}%")
    print(f"  Commission minimale: {np.min(commissions):.2f}%")
    print(f"  Commission maximale: {np.max(commissions):.2f}%")
    
    # Construire un modèle de prédiction
    print("\n[3/5] Construction du modele de prediction...")
    model, scaler = build_commission_model(df)
    
    # Prédire avec le modèle si disponible
    if model is not None:
        feature_columns = [
            'facteur_risque', 'montant_credit', 'taux_interet', 'duree',
            'secteur_score', 'sinistres_score', 'type_credit_score', 'etat_financier_score'
        ]
        df_clean = df[feature_columns].dropna()
        if len(df_clean) > 0:
            # Gradient Boosting doesn't need scaling
            predictions = model.predict(df_clean[feature_columns])
            df_clean_idx = df_clean.index
            
            df.loc[df_clean_idx, 'commission_predite'] = predictions
            print(f"  [OK] Predictions generees pour {len(predictions)} offres")
    
    # Analyser les résultats
    print("\n[4/5] Analyse des resultats...")
    print(f"\n  Statistiques des commissions optimales:")
    print(f"    Moyenne: {df['commission_optimale'].mean():.2f}%")
    print(f"    Mediane: {df['commission_optimale'].median():.2f}%")
    print(f"    Ecart-type: {df['commission_optimale'].std():.2f}%")
    
    print(f"\n  Correlation facteur_risque / commission:")
    correlation = df['facteur_risque'].corr(df['commission_optimale'])
    print(f"    Coefficient de correlation: {correlation:.3f}")
    
    # Sauvegarder les résultats
    print("\n[5/5] Sauvegarde des resultats...")
    output_columns = [
        'nom_fichier', 'entreprise', 'montant_credit', 'taux_interet', 'duree',
        'type_credit', 'secteur', 'facteur_risque',
        'commission_base', 'commission_optimale', 'montant_commission', 'fonction_objectif'
    ]
    
    if 'commission_predite' in df.columns:
        output_columns.append('commission_predite')
    
    df_output = df[output_columns].copy()
    df_output = df_output.sort_values('facteur_risque', ascending=False)
    
    os.makedirs(DATA_DIR, exist_ok=True)
    df_output.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
    
    print(f"\n{'=' * 70}")
    print(f"[SUCCESS] Commissions optimales calculees pour {len(df_output)} offres")
    print(f"[SUCCESS] Fichier sauvegarde: {OUTPUT_CSV}")
    print(f"{'=' * 70}")
    
    # Afficher le top 5 des offres avec les commissions les plus élevées
    print("\nTop 5 des offres avec les commissions optimales les plus elevees:")
    top_commissions = df_output.nlargest(5, 'commission_optimale')
    print(top_commissions[['nom_fichier', 'facteur_risque', 'commission_optimale', 
                           'montant_commission']].to_string(index=False))
    
    print("\nTop 5 des offres les plus risquees avec leurs commissions:")
    top_risque = df_output.head(5)
    print(top_risque[['nom_fichier', 'facteur_risque', 'commission_optimale', 
                      'montant_commission']].to_string(index=False))


if __name__ == "__main__":
    main()

