/**
 * JavaScript implementation of commission optimization service
 * Based on optimisation_prime.py
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = util.promisify(exec);

// Weights for objective function
const ALPHA = 0.3;  // Risk factor weight
const BETA = 0.7;   // Commission weight (PRIORITY)

// Commission parameters
const MIN_COMMISSION_RATE = 0.3;   // Minimum commission %
const MAX_COMMISSION_RATE = 4.0;   // Maximum commission %
const BASE_COMMISSION_RATE = 1.5;  // Base commission %

/**
 * Calculate base commission
 */
function calculate_base_commission(facteur_risque, montant_credit, taux_interet, duree) {
    const risque_norm = Math.min(facteur_risque / 10.0, 1.0);
    
    // Commission based on risk (0.3% to 4%)
    const commission_risque = MIN_COMMISSION_RATE + (MAX_COMMISSION_RATE - MIN_COMMISSION_RATE) * Math.pow(risque_norm, 1.2);
    
    // Adjustments
    const montant_adj = 1.0 - Math.min(montant_credit / 100000000.0, 0.15);
    const taux_adj = 1.0 + (Math.max(taux_interet - 7.0, 0) / 10.0) * 0.15;
    const duree_adj = 1.0 + (Math.max(duree - 72, 0) / 120.0) * 0.10;
    
    // Final calculation
    let commission_finale = commission_risque * montant_adj * taux_adj * duree_adj;
    
    // Ensure minimum covers risk
    const commission_minimale_risque = MIN_COMMISSION_RATE + (risque_norm * 0.5);
    
    commission_finale = Math.max(commission_minimale_risque, Math.min(commission_finale, MAX_COMMISSION_RATE));
    
    return Math.round(commission_finale * 100) / 100;
}

/**
 * Objective function to minimize
 */
function objective_function(facteur_risque, commission_rate, montant_credit) {
    const commission_absolute = (commission_rate * montant_credit) / 100;
    const risque_norm = facteur_risque / 10.0;
    const commission_norm = commission_absolute / (montant_credit * 0.015);
    
    // Penalty if commission too low
    const commission_min_necessaire = 0.003 + (risque_norm * 0.0037);
    let penalty = 0;
    if (commission_rate / 100 < commission_min_necessaire) {
        penalty = (commission_min_necessaire - commission_rate / 100) * 10;
    }
    
    return ALPHA * risque_norm + BETA * commission_norm + penalty;
}

/**
 * Optimize commission
 */
function optimize_commission(facteur_risque, montant_credit, taux_interet, duree,
                           secteur_score, sinistres_score, type_credit_score, etat_financier_score) {
    // Calculate base commission
    const commission_base = calculate_base_commission(facteur_risque, montant_credit, taux_interet, duree);
    
    // Calculate minimum necessary
    const risque_norm = Math.min(facteur_risque / 10.0, 1.0);
    let commission_min_necessaire = MIN_COMMISSION_RATE + (risque_norm * 0.5);
    commission_min_necessaire = Math.max(MIN_COMMISSION_RATE, Math.min(commission_min_necessaire, MAX_COMMISSION_RATE));
    
    // Search for optimal commission
    const start_commission = Math.max(commission_min_necessaire, MIN_COMMISSION_RATE);
    const end_commission = Math.min(commission_base * 1.2, MAX_COMMISSION_RATE);
    
    // Test 200 candidate values
    const step = (end_commission - start_commission) / 200;
    let best_objective = Infinity;
    let best_commission = commission_min_necessaire;
    
    for (let i = 0; i <= 200; i++) {
        const commission_candidate = start_commission + (step * i);
        const objective_value = objective_function(facteur_risque, commission_candidate, montant_credit);
        
        if (objective_value < best_objective) {
            best_objective = objective_value;
            best_commission = commission_candidate;
        }
    }
    
    // Ensure final commission covers minimum risk
    const commission_finale = Math.max(best_commission, commission_min_necessaire);
    
    return [
        Math.round(commission_finale * 100) / 100,
        Math.round(best_objective * 10000) / 10000
    ];
}

/**
 * Predict commission using saved ML model (if available)
 */
async function predict_commission_with_model(risk_data, credit_data) {
    try {
        const pythonPath = process.env.PYTHON_PATH || 'python';
        const modelScript = path.join(__dirname, 'loadCommissionModel.py');
        
        const facteur_risque = risk_data.facteur_risque || 5.0;
        const montant = credit_data.montant_credit || 0;
        const taux = credit_data.taux_interet || 0;
        const duree = credit_data.duree || 0;
        const secteur_score = risk_data.secteur_score || 5;
        const sinistres_score = risk_data.sinistres_score || 5;
        const type_credit_score = risk_data.type_credit_score || 5;
        const etat_financier_score = risk_data.etat_financier_score || 5;
        
        // Check if model file exists (in backend/models directory)
        const modelPath = path.join(__dirname, '..', 'models', 'commission_model.joblib');
        if (!fs.existsSync(modelPath)) {
            return null; // Model not trained yet
        }
        
        const { stdout, stderr } = await execPromise(
            `"${pythonPath}" "${modelScript}" ${facteur_risque} ${montant} ${taux} ${duree} ${secteur_score} ${sinistres_score} ${type_credit_score} ${etat_financier_score}`,
            { maxBuffer: 10 * 1024 * 1024 }
        );
        
        if (stderr && !stderr.includes('Warning')) {
            console.warn('Model prediction stderr:', stderr);
        }
        
        const result = JSON.parse(stdout.trim());
        return result.commission_predite || null;
    } catch (error) {
        console.warn('Error using ML model for prediction:', error.message);
        return null; // Fallback to optimization function
    }
}

/**
 * Calculate optimal commission for a quote
 */
async function calculate_optimal_commission(risk_data, credit_data) {
    const facteur_risque = risk_data.facteur_risque || 5.0;
    const montant = credit_data.montant_credit || 0;
    const taux = credit_data.taux_interet || 0;
    const duree = credit_data.duree || 0;
    
    const secteur_score = risk_data.secteur_score || 5;
    const sinistres_score = risk_data.sinistres_score || 5;
    const type_credit_score = risk_data.type_credit_score || 5;
    const etat_financier_score = risk_data.etat_financier_score || 5;
    
    // Calculate base commission
    const commission_base = calculate_base_commission(facteur_risque, montant, taux, duree);
    
    // Try to use ML model prediction first (if available)
    let commission_predite = null;
    try {
        commission_predite = await predict_commission_with_model(risk_data, credit_data);
    } catch (error) {
        console.warn('ML model prediction failed, using optimization:', error.message);
    }
    
    // Optimize commission (always calculate for comparison)
    const [commission_optimale, fonction_objectif] = optimize_commission(
        facteur_risque, montant, taux, duree,
        secteur_score, sinistres_score, type_credit_score, etat_financier_score
    );
    
    // Use ML prediction if available, otherwise use optimized
    const final_commission = commission_predite || commission_optimale;
    
    // Calculate commission amount
    const montant_commission = (final_commission * montant) / 100;
    
    return {
        commission_base: commission_base,
        commission_optimale: final_commission,
        commission_predite: commission_predite, // ML model prediction (if available)
        montant_commission: Math.round(montant_commission * 100) / 100,
        fonction_objectif: fonction_objectif
    };
}

module.exports = {
    calculate_optimal_commission,
    calculate_base_commission,
    optimize_commission,
    predict_commission_with_model
};

