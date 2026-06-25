import pandas as pd
import os
import re

# Configuration des fichiers
DATA_DIR = "data"
OFFRES_CSV = os.path.join(DATA_DIR, "offres_credit_extracted.csv")
SINISTRES_CSV = os.path.join(DATA_DIR, "dataset_sinistres_entreprise.csv")
FINANCIAL_CSV = os.path.join(DATA_DIR, "financial_analysis_results.csv")
OUTPUT_CSV = os.path.join(DATA_DIR, "facteur_risque_calculated.csv")

# Poids pour chaque variable (w1 à w7)
WEIGHTS = {
    'montant': 0.20,      # w1: Poids du montant
    'taux': 0.15,         # w2: Poids du taux d'intérêt
    'duree': 0.15,        # w3: Poids de la durée
    'secteur': 0.15,      # w4: Poids du secteur
    'sinistres': 0.20,    # w5: Poids des sinistres
    'type_credit': 0.10,  # w6: Poids du type de crédit
    'etat_financier': 0.05 # w7: Poids de l'état financier
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
    'default': 5  # Valeur par défaut
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
    'default': 5  # Valeur par défaut
}

# Scores d'état financier (1-10, 10 = très risqué)
# win = 2, loss = 8, inconnu = 5
ETAT_FINANCIER_RISQUE = {
    'win': 2,
    'loss': 8,
    'default': 5
}


def normalize_entreprise_name(name):
    """Normalise le nom d'entreprise pour faciliter le matching"""
    if pd.isna(name):
        return ""
    
    name = str(name).upper()
    # Enlever les extensions de fichiers
    name = name.replace('.PDF', '')
    name = name.replace('.pdf', '')
    # Enlever les caractères spéciaux et espaces multiples
    name = re.sub(r'[^A-Z0-9\s]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def extract_entreprise_from_filename(filename):
    """Extrait le nom d'entreprise depuis le nom de fichier PDF"""
    if pd.isna(filename):
        return ""
    
    name = str(filename)
    # Enlever l'extension .pdf
    name = name.replace('.pdf', '').replace('.PDF', '')
    # Enlever les caractères spéciaux
    name = name.replace('_', ' ').replace('-', ' ')
    # Nettoyer
    name = re.sub(r'\s+', ' ', name).strip()
    return name.upper()


def get_secteur_score(secteur):
    """Retourne le score de risque du secteur"""
    if pd.isna(secteur):
        return SECTEUR_RISQUE['default']
    
    secteur = str(secteur).lower().strip()
    for key, value in SECTEUR_RISQUE.items():
        if key in secteur or secteur in key:
            return value
    return SECTEUR_RISQUE['default']


def get_type_credit_score(type_credit):
    """Retourne le score de risque du type de crédit"""
    if pd.isna(type_credit):
        return TYPE_CREDIT_RISQUE['default']
    
    type_credit = str(type_credit).strip()
    for key, value in TYPE_CREDIT_RISQUE.items():
        if key in type_credit:
            return value
    return TYPE_CREDIT_RISQUE['default']


def normalize_value(value, min_val, max_val, reverse=False):
    """
    Normalise une valeur entre 0 et 10
    reverse=True: plus la valeur est élevée, plus le score est bas (pour montant, durée)
    reverse=False: plus la valeur est élevée, plus le score est élevé (pour taux)
    """
    if pd.isna(value) or min_val == max_val:
        return 5.0  # Valeur moyenne par défaut
    
    normalized = ((value - min_val) / (max_val - min_val)) * 10
    
    if reverse:
        # Pour montant et durée: plus c'est élevé, plus c'est risqué
        return normalized
    else:
        # Pour taux: plus c'est élevé, plus c'est risqué
        return normalized


def calculate_risk_factor(row):
    """
    Calcule le facteur de risque selon la formule:
    facteur_risque = (montant*w1) + (taux*w2) + (duree*w3) + (secteur*w4) + 
                     (sinistres*w5) + (type_credit*w6) + (etat_financier*w7)
    """
    montant_score = row['montant_score']
    taux_score = row['taux_score']
    duree_score = row['duree_score']
    secteur_score = row['secteur_score']
    sinistres_score = row['sinistres_score']
    type_credit_score = row['type_credit_score']
    etat_financier_score = row['etat_financier_score']
    
    facteur_risque = (
        montant_score * WEIGHTS['montant'] +
        taux_score * WEIGHTS['taux'] +
        duree_score * WEIGHTS['duree'] +
        secteur_score * WEIGHTS['secteur'] +
        sinistres_score * WEIGHTS['sinistres'] +
        type_credit_score * WEIGHTS['type_credit'] +
        etat_financier_score * WEIGHTS['etat_financier']
    )
    
    return round(facteur_risque, 2)


def main():
    print("=" * 60)
    print("CALCUL DU FACTEUR DE RISQUE")
    print("=" * 60)
    
    # Charger les données
    print("\n[1/4] Chargement des données...")
    try:
        df_offres = pd.read_csv(OFFRES_CSV, encoding='utf-8-sig')
        print(f"  [OK] Offres de credit: {len(df_offres)} lignes")
    except Exception as e:
        print(f"  [ERROR] Erreur lors du chargement de {OFFRES_CSV}: {e}")
        return
    
    try:
        df_sinistres = pd.read_csv(SINISTRES_CSV, encoding='utf-8-sig')
        print(f"  [OK] Sinistres: {len(df_sinistres)} lignes")
    except Exception as e:
        print(f"  [ERROR] Erreur lors du chargement de {SINISTRES_CSV}: {e}")
        return
    
    try:
        df_financial = pd.read_csv(FINANCIAL_CSV, encoding='utf-8-sig')
        print(f"  [OK] Donnees financieres: {len(df_financial)} lignes")
    except Exception as e:
        print(f"  ✗ Erreur lors du chargement de {FINANCIAL_CSV}: {e}")
        df_financial = pd.DataFrame()
    
    # Préparer les données de base
    print("\n[2/4] Préparation des données...")
    df = df_offres.copy()
    
    # Extraire le nom d'entreprise depuis le nom de fichier
    df['entreprise'] = df['nom_fichier'].apply(extract_entreprise_from_filename)
    
    # Agréger les sinistres par entreprise
    if not df_sinistres.empty:
        # Trouver les noms de colonnes réels (gérer les problèmes d'encodage)
        entreprise_col = 'Entreprise'
        sinistres_col = None
        secteur_col = None
        montant_col = None
        
        for col in df_sinistres.columns:
            col_lower = col.lower()
            if 'historique' in col_lower or 'sinistres pass' in col_lower:
                sinistres_col = col
            elif 'secteur' in col_lower:
                secteur_col = col
            elif 'montant du sinistre' in col_lower or 'montant' in col_lower:
                montant_col = col
        
        if sinistres_col and secteur_col and montant_col:
            sinistres_grouped = df_sinistres.groupby(entreprise_col).agg({
                sinistres_col: 'max',  # Prendre le max des sinistres
                secteur_col: 'first',  # Prendre le premier secteur
                montant_col: 'sum'  # Somme des montants de sinistres
            }).reset_index()
            sinistres_grouped.columns = ['entreprise', 'nb_sinistres', 'secteur', 'montant_sinistres']
        else:
            print(f"  [WARNING] Colonnes manquantes dans sinistres. Colonnes disponibles: {list(df_sinistres.columns)}")
            sinistres_grouped = pd.DataFrame(columns=['entreprise', 'nb_sinistres', 'secteur', 'montant_sinistres'])
        sinistres_grouped['entreprise_norm'] = sinistres_grouped['entreprise'].apply(normalize_entreprise_name)
        
        # Fusionner avec les sinistres
        df['entreprise_norm'] = df['entreprise'].apply(normalize_entreprise_name)
        df = df.merge(sinistres_grouped[['entreprise_norm', 'nb_sinistres', 'secteur', 'montant_sinistres']], 
                     on='entreprise_norm', how='left')
    else:
        df['nb_sinistres'] = 0
        df['secteur'] = None
        df['montant_sinistres'] = 0
    
    # Fusionner avec les données financières
    if not df_financial.empty:
        df_financial['entreprise_norm'] = df_financial['company_name'].apply(normalize_entreprise_name)
        df = df.merge(df_financial[['entreprise_norm', 'status']], on='entreprise_norm', how='left')
    else:
        df['status'] = None
    
    # Calculer les scores de risque
    print("\n[3/4] Calcul des scores de risque...")
    
    # Normaliser les montants (0-10)
    montant_min = df['montant_credit'].min()
    montant_max = df['montant_credit'].max()
    df['montant_score'] = df['montant_credit'].apply(
        lambda x: normalize_value(x, montant_min, montant_max, reverse=False)
    )
    
    # Normaliser les taux (0-10)
    taux_min = df['taux_interet'].min()
    taux_max = df['taux_interet'].max()
    df['taux_score'] = df['taux_interet'].apply(
        lambda x: normalize_value(x, taux_min, taux_max, reverse=False)
    )
    
    # Normaliser les durées (0-10) - convertir en mois si nécessaire
    # La durée est déjà en mois dans notre CSV
    duree_min = df['duree'].min()
    duree_max = df['duree'].max()
    df['duree_score'] = df['duree'].apply(
        lambda x: normalize_value(x, duree_min, duree_max, reverse=False)
    )
    
    # Score secteur
    df['secteur_score'] = df['secteur'].apply(get_secteur_score)
    
    # Score sinistres (normaliser entre 0-10, max 10 sinistres = score 10)
    df['nb_sinistres'] = df['nb_sinistres'].fillna(0)
    sinistres_max = max(df['nb_sinistres'].max(), 10)  # Au moins 10 pour la normalisation
    df['sinistres_score'] = df['nb_sinistres'].apply(
        lambda x: min(normalize_value(x, 0, sinistres_max, reverse=False), 10)
    )
    
    # Score type de crédit
    df['type_credit_score'] = df['type_credit'].apply(get_type_credit_score)
    
    # Score état financier
    df['status'] = df['status'].fillna('default')
    df['etat_financier_score'] = df['status'].apply(
        lambda x: ETAT_FINANCIER_RISQUE.get(str(x).lower(), ETAT_FINANCIER_RISQUE['default'])
    )
    
    # Calculer le facteur de risque final
    print("\n[4/4] Calcul du facteur de risque final...")
    df['facteur_risque'] = df.apply(calculate_risk_factor, axis=1)
    
    # Sélectionner les colonnes à sauvegarder
    output_columns = [
        'nom_fichier',
        'entreprise',
        'montant_credit',
        'taux_interet',
        'duree',
        'type_credit',
        'secteur',
        'nb_sinistres',
        'montant_sinistres',
        'status',
        'montant_score',
        'taux_score',
        'duree_score',
        'secteur_score',
        'sinistres_score',
        'type_credit_score',
        'etat_financier_score',
        'facteur_risque'
    ]
    
    df_output = df[output_columns].copy()
    
    # Trier par facteur de risque décroissant (plus risqué en premier)
    df_output = df_output.sort_values('facteur_risque', ascending=False)
    
    # Sauvegarder
    os.makedirs(DATA_DIR, exist_ok=True)
    df_output.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
    
    print(f"\n{'=' * 60}")
    print(f"[SUCCESS] Facteur de risque calculé pour {len(df_output)} offres")
    print(f"[SUCCESS] Fichier sauvegardé: {OUTPUT_CSV}")
    print(f"{'=' * 60}")
    
    # Afficher un résumé
    print("\nRésumé statistique du facteur de risque:")
    print(f"  Minimum: {df_output['facteur_risque'].min():.2f}")
    print(f"  Maximum: {df_output['facteur_risque'].max():.2f}")
    print(f"  Moyenne: {df_output['facteur_risque'].mean():.2f}")
    print(f"  Médiane: {df_output['facteur_risque'].median():.2f}")
    
    print("\nTop 5 des offres les plus risquées:")
    print(df_output[['nom_fichier', 'facteur_risque', 'montant_credit', 'secteur', 'nb_sinistres']].head().to_string(index=False))


if __name__ == "__main__":
    main()

