"""
Service to optimize commission rates for quotes
Based on optimisation_prime.py
"""
import numpy as np

# Poids pour la fonction d'objectif
ALPHA = 0.3  # Poids pour le facteur de risque
BETA = 0.7   # Poids pour la commission (PRIORITÉ)

# Paramètres pour le calcul de commission de base
MIN_COMMISSION_RATE = 0.3   # Commission minimale en %
MAX_COMMISSION_RATE = 4.0   # Commission maximale en %
BASE_COMMISSION_RATE = 1.5  # Commission de base en %


def calculate_base_commission(facteur_risque, montant_credit, taux_interet, duree):
    """Calcule la commission de base minimale nécessaire pour couvrir le risque."""
    # Normaliser le facteur de risque (supposé entre 0 et 10)
    risque_norm = min(facteur_risque / 10.0, 1.0)
    
    # Commission minimale basée sur le risque (0.3% à 4%)
    commission_risque = MIN_COMMISSION_RATE + (MAX_COMMISSION_RATE - MIN_COMMISSION_RATE) * (risque_norm ** 1.2)
    
    # Ajustements basés sur les autres facteurs
    montant_adj = 1.0 - (min(montant_credit / 100000000.0, 0.15))
    taux_adj = 1.0 + (max(taux_interet - 7.0, 0) / 10.0) * 0.15
    duree_adj = 1.0 + (max(duree - 72, 0) / 120.0) * 0.10
    
    # Calcul final
    commission_finale = commission_risque * montant_adj * taux_adj * duree_adj
    
    # Assurer un minimum qui couvre toujours le risque de base
    commission_minimale_risque = MIN_COMMISSION_RATE + (risque_norm * 0.5)
    
    commission_finale = max(commission_minimale_risque, min(commission_finale, MAX_COMMISSION_RATE))
    
    return round(commission_finale, 2)


def objective_function(facteur_risque, commission_rate, montant_credit):
    """Fonction d'objectif à minimiser."""
    commission_absolute = commission_rate * montant_credit / 100
    risque_norm = facteur_risque / 10.0
    commission_norm = commission_absolute / (montant_credit * 0.015)
    
    # Pénalité si la commission est trop basse pour couvrir le risque
    commission_min_necessaire = 0.003 + (risque_norm * 0.0037)
    if commission_rate / 100 < commission_min_necessaire:
        penalty = (commission_min_necessaire - commission_rate / 100) * 10
    else:
        penalty = 0
    
    objective = ALPHA * risque_norm + BETA * commission_norm + penalty
    return objective


def optimize_commission(facteur_risque, montant_credit, taux_interet, duree, 
                       secteur_score, sinistres_score, type_credit_score, etat_financier_score):
    """
    Optimise la commission pour minimiser la fonction d'objectif.
    
    Returns:
        tuple: (commission_optimale, fonction_objectif)
    """
    # Calculer la commission de base minimale nécessaire
    commission_base = calculate_base_commission(facteur_risque, montant_credit, taux_interet, duree)
    
    # Calculer le minimum de commission nécessaire pour couvrir le risque
    risque_norm = min(facteur_risque / 10.0, 1.0)
    commission_min_necessaire = MIN_COMMISSION_RATE + (risque_norm * 0.5)
    commission_min_necessaire = max(MIN_COMMISSION_RATE, min(commission_min_necessaire, MAX_COMMISSION_RATE))
    
    # Recherche de la commission optimale
    start_commission = max(commission_min_necessaire, MIN_COMMISSION_RATE)
    end_commission = min(commission_base * 1.2, MAX_COMMISSION_RATE)
    
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


def calculate_optimal_commission(risk_data, credit_data):
    """
    Calculate optimal commission for a quote.
    
    Args:
        risk_data: dict with risk scores and facteur_risque
        credit_data: dict with montant_credit, taux_interet, duree
    
    Returns:
        dict: Commission calculations
    """
    facteur_risque = risk_data.get('facteur_risque', 5.0)
    montant = credit_data.get('montant_credit', 0) or 0
    taux = credit_data.get('taux_interet', 0) or 0
    duree = credit_data.get('duree', 0) or 0
    
    secteur_score = risk_data.get('secteur_score', 5)
    sinistres_score = risk_data.get('sinistres_score', 5)
    type_credit_score = risk_data.get('type_credit_score', 5)
    etat_financier_score = risk_data.get('etat_financier_score', 5)
    
    # Calculate base commission
    commission_base = calculate_base_commission(facteur_risque, montant, taux, duree)
    
    # Optimize commission
    commission_optimale, fonction_objectif = optimize_commission(
        facteur_risque, montant, taux, duree,
        secteur_score, sinistres_score, type_credit_score, etat_financier_score
    )
    
    # Calculate commission amount
    montant_commission = (commission_optimale * montant) / 100
    
    return {
        'commission_base': commission_base,
        'commission_optimale': commission_optimale,
        'montant_commission': round(montant_commission, 2),
        'fonction_objectif': fonction_objectif
    }

