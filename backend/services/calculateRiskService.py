"""
Service to calculate risk factors for credit offers
Adapted from facteur_risque.PY for backend use
"""
import os
import sys
import json
import pandas as pd
import re
from pathlib import Path

# Configuration - use backend/data directory
DATA_DIR = os.path.join(Path(__file__).parent.parent, 'data')

# Poids pour chaque variable (w1 à w7)
WEIGHTS = {
    'montant': 0.20,
    'taux': 0.15,
    'duree': 0.15,
    'secteur': 0.15,
    'sinistres': 0.20,
    'type_credit': 0.10,
    'etat_financier': 0.05
}

# Scores de risque par secteur (1-10, 10 = très risqué)
SECTEUR_RISQUE = {
    'construction': 8,
    'industrie': 7,
    'transport': 6,
    'energie': 5,
    'technologie': 4,
    'commerce': 5,
    'finance': 3,
    'sante': 4,
    'services': 3,
    'autre': 5,
    'default': 5
}

# Scores de risque par type de crédit (1-10, 10 = très risqué)
TYPE_CREDIT_RISQUE = {
    'Crédit-bail': 5,
    'Crédit immobilier': 3,
    "Crédit d'investissement": 6,
    "Crédit d'investissem": 6,
    'Crédit de fonctionnement': 7,
    'Crédit de fonctionnemen': 7,
    'Crédit de trésorerie': 8,
    'default': 5
}

# Scores d'état financier (1-10, 10 = très risqué)
ETAT_FINANCIER_RISQUE = {
    'win': 2,
    'loss': 8,
    'default': 5
}


def normalize_entreprise_name(name):
    """Normalise le nom d'entreprise pour faciliter le matching"""
    if pd.isna(name) or not name:
        return ""
    
    name = str(name).upper()
    name = name.replace('.PDF', '').replace('.pdf', '')
    name = re.sub(r'[^A-Z0-9\s]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def extract_entreprise_from_filename(filename):
    """Extrait le nom d'entreprise depuis le nom de fichier PDF"""
    if pd.isna(filename) or not filename:
        return ""
    
    name = str(filename)
    name = name.replace('.pdf', '').replace('.PDF', '')
    name = name.replace('_', ' ').replace('-', ' ')
    name = re.sub(r'\s+', ' ', name).strip()
    return name.upper()


def get_secteur_score(secteur):
    """Retourne le score de risque du secteur"""
    if pd.isna(secteur) or not secteur:
        return SECTEUR_RISQUE['default']
    
    secteur = str(secteur).lower().strip()
    for key, value in SECTEUR_RISQUE.items():
        if key in secteur or secteur in key:
            return value
    return SECTEUR_RISQUE['default']


def get_type_credit_score(type_credit):
    """Retourne le score de risque du type de crédit"""
    if pd.isna(type_credit) or not type_credit:
        return TYPE_CREDIT_RISQUE['default']
    
    type_credit = str(type_credit).strip()
    for key, value in TYPE_CREDIT_RISQUE.items():
        if key in type_credit:
            return value
    return TYPE_CREDIT_RISQUE['default']


def normalize_value(value, min_val, max_val, reverse=False):
    """Normalise une valeur entre 0 et 10"""
    if pd.isna(value) or min_val == max_val:
        return 5.0
    
    normalized = ((value - min_val) / (max_val - min_val)) * 10
    return normalized if reverse else normalized


def calculate_risk_factor(credit_data, secteur=None, nb_sinistres=0, status_financier=None):
    """
    Calculate risk factor for a credit offer.
    Adapted from facteur_risque.PY
    
    Args:
        credit_data: dict with montant_credit, taux_interet, duree, type_credit, nom_fichier
        secteur: Business sector string
        nb_sinistres: Number of claims (default 0)
        status_financier: 'win' or 'loss' (default None)
    
    Returns:
        dict: Risk factor scores and final facteur_risque
    """
    # Load reference data for normalization ranges
    montant_min, montant_max = 10000, 100000000
    taux_min, taux_max = 3.0, 15.0
    duree_min, duree_max = 12, 240
    
    try:
        # Try to load sinistres data to get better normalization ranges
        sinistres_path = os.path.join(DATA_DIR, "dataset_sinistres_entreprise.csv")
        if os.path.exists(sinistres_path):
            df_sinistres = pd.read_csv(sinistres_path, encoding='utf-8-sig')
            # Could use this for better normalization if needed
    except Exception as e:
        pass  # Use defaults
    
    try:
        # Try to load financial data for better normalization
        financial_path = os.path.join(DATA_DIR, "financial_analysis_results.csv")
        if os.path.exists(financial_path):
            df_financial = pd.read_csv(financial_path, encoding='utf-8-sig')
            # Could use this for better normalization if needed
    except Exception as e:
        pass  # Use defaults
    
    # Extract values from credit_data
    montant = float(credit_data.get('montant_credit', 0) or 0)
    taux = float(credit_data.get('taux_interet', 0) or 0)
    duree = float(credit_data.get('duree', 0) or 0)
    type_credit = str(credit_data.get('type_credit', '') or '')
    nom_fichier = str(credit_data.get('nom_fichier', '') or '')
    
    # Adjust ranges based on actual values if available
    if montant > 0:
        montant_min = min(montant_min, montant * 0.1)
        montant_max = max(montant_max, montant * 10)
    if taux > 0:
        taux_min = min(taux_min, max(3.0, taux * 0.5))
        taux_max = max(taux_max, min(15.0, taux * 2))
    if duree > 0:
        duree_min = min(duree_min, max(12, duree * 0.5))
        duree_max = max(duree_max, min(240, duree * 2))
    
    # Calculate individual risk scores
    montant_score = normalize_value(montant, montant_min, montant_max, reverse=False)
    taux_score = normalize_value(taux, taux_min, taux_max, reverse=False)
    duree_score = normalize_value(duree, duree_min, duree_max, reverse=False)
    secteur_score = get_secteur_score(secteur)
    type_credit_score = get_type_credit_score(type_credit)
    
    # Sinistres score (0-10, max 10 sinistres = score 10)
    sinistres_max = max(nb_sinistres, 10)
    sinistres_score = min(normalize_value(nb_sinistres, 0, sinistres_max, reverse=False), 10)
    
    # État financier score
    status = str(status_financier).lower() if status_financier else 'default'
    etat_financier_score = ETAT_FINANCIER_RISQUE.get(status, ETAT_FINANCIER_RISQUE['default'])
    
    # Calculate final risk factor using weighted sum
    facteur_risque = (
        montant_score * WEIGHTS['montant'] +
        taux_score * WEIGHTS['taux'] +
        duree_score * WEIGHTS['duree'] +
        secteur_score * WEIGHTS['secteur'] +
        sinistres_score * WEIGHTS['sinistres'] +
        type_credit_score * WEIGHTS['type_credit'] +
        etat_financier_score * WEIGHTS['etat_financier']
    )
    
    return {
        'montant_score': round(montant_score, 2),
        'taux_score': round(taux_score, 2),
        'duree_score': round(duree_score, 2),
        'secteur_score': secteur_score,
        'sinistres_score': round(sinistres_score, 2),
        'type_credit_score': type_credit_score,
        'etat_financier_score': etat_financier_score,
        'facteur_risque': round(facteur_risque, 2),
        'nb_sinistres': nb_sinistres,
        'status_financier': status_financier or 'default'
    }


# Main function for command-line usage
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python calculateRiskService.py <credit_data_json>")
        print("Example: python calculateRiskService.py '{\"montant_credit\":50000,\"taux_interet\":8.5,\"duree\":60,\"type_credit\":\"Crédit automobile\"}'")
        sys.exit(1)
    
    try:
        credit_data = json.loads(sys.argv[1])
        secteur = sys.argv[2] if len(sys.argv) > 2 else None
        nb_sinistres = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        status_financier = sys.argv[4] if len(sys.argv) > 4 else None
        
        result = calculate_risk_factor(credit_data, secteur, nb_sinistres, status_financier)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "facteur_risque": 5.0,
            "montant_score": 5.0,
            "taux_score": 5.0,
            "duree_score": 5.0,
            "secteur_score": 5.0,
            "sinistres_score": 5.0,
            "type_credit_score": 5.0,
            "etat_financier_score": 5.0
        }, ensure_ascii=False, indent=2))

