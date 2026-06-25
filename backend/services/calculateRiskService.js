/**
 * JavaScript implementation of risk calculation service
 * Based on facteur_risque.PY
 */

// Weights for each variable
const WEIGHTS = {
    montant: 0.20,
    taux: 0.15,
    duree: 0.15,
    secteur: 0.15,
    sinistres: 0.20,
    type_credit: 0.10,
    etat_financier: 0.05
};

// Risk scores by sector (1-10, 10 = very risky)
const SECTEUR_RISQUE = {
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
};

// Risk scores by credit type
const TYPE_CREDIT_RISQUE = {
    'Crédit-bail': 5,
    'Crédit immobilier': 3,
    "Crédit d'investissement": 6,
    "Crédit d'investissem": 6,
    'Crédit de fonctionnement': 7,
    'Crédit de fonctionnemen': 7,
    'Crédit de trésorerie': 8,
    'default': 5
};

// Financial status risk scores
const ETAT_FINANCIER_RISQUE = {
    'win': 2,
    'loss': 8,
    'default': 5
};

function getSecteurScore(secteur) {
    if (!secteur) return SECTEUR_RISQUE['default'];
    
    const secteurLower = secteur.toLowerCase().trim();
    for (const [key, value] of Object.entries(SECTEUR_RISQUE)) {
        if (secteurLower.includes(key) || key.includes(secteurLower)) {
            return value;
        }
    }
    return SECTEUR_RISQUE['default'];
}

function getTypeCreditScore(typeCredit) {
    if (!typeCredit) return TYPE_CREDIT_RISQUE['default'];
    
    const typeStr = String(typeCredit).trim();
    for (const [key, value] of Object.entries(TYPE_CREDIT_RISQUE)) {
        if (typeStr.includes(key)) {
            return value;
        }
    }
    return TYPE_CREDIT_RISQUE['default'];
}

function normalizeValue(value, minVal, maxVal) {
    if (value == null || minVal == maxVal) {
        return 5.0;
    }
    
    const normalized = ((value - minVal) / (maxVal - minVal)) * 10;
    return Math.max(0, Math.min(10, normalized));
}

/**
 * Calculate risk factor for a credit offer
 */
function calculate_risk_factor(creditData, secteur = null, nb_sinistres = 0, status_financier = null) {
    const montant = creditData.montant_credit || 0;
    const taux = creditData.taux_interet || 0;
    const duree = creditData.duree || 0;
    const type_credit = creditData.type_credit || '';
    
    // Reference ranges for normalization
    const montant_min = montant > 0 ? montant * 0.1 : 10000;
    const montant_max = montant > 0 ? montant * 10 : 100000000;
    const taux_min = taux > 0 ? Math.max(3.0, taux * 0.5) : 3.0;
    const taux_max = taux > 0 ? Math.min(15.0, taux * 2) : 15.0;
    const duree_min = duree > 0 ? Math.max(12, duree * 0.5) : 12;
    const duree_max = duree > 0 ? Math.min(240, duree * 2) : 240;
    
    // Calculate scores
    const montant_score = normalizeValue(montant, montant_min, montant_max);
    const taux_score = normalizeValue(taux, taux_min, taux_max);
    const duree_score = normalizeValue(duree, duree_min, duree_max);
    const secteur_score = getSecteurScore(secteur);
    const type_credit_score = getTypeCreditScore(type_credit);
    
    // Sinistres score (0-10)
    const sinistres_max = Math.max(nb_sinistres, 10);
    const sinistres_score = Math.min(normalizeValue(nb_sinistres, 0, sinistres_max), 10);
    
    // État financier score
    const status = status_financier ? String(status_financier).toLowerCase() : 'default';
    const etat_financier_score = ETAT_FINANCIER_RISQUE[status] || ETAT_FINANCIER_RISQUE['default'];
    
    // Calculate final risk factor
    const facteur_risque = (
        montant_score * WEIGHTS.montant +
        taux_score * WEIGHTS.taux +
        duree_score * WEIGHTS.duree +
        secteur_score * WEIGHTS.secteur +
        sinistres_score * WEIGHTS.sinistres +
        type_credit_score * WEIGHTS.type_credit +
        etat_financier_score * WEIGHTS.etat_financier
    );
    
    return {
        montant_score: Math.round(montant_score * 100) / 100,
        taux_score: Math.round(taux_score * 100) / 100,
        duree_score: Math.round(duree_score * 100) / 100,
        secteur_score: secteur_score,
        sinistres_score: Math.round(sinistres_score * 100) / 100,
        type_credit_score: type_credit_score,
        etat_financier_score: etat_financier_score,
        facteur_risque: Math.round(facteur_risque * 100) / 100,
        nb_sinistres: nb_sinistres,
        status_financier: status_financier || 'default'
    };
}

module.exports = {
    calculate_risk_factor
};

