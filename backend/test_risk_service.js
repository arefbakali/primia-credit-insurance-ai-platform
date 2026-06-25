/**
 * Test script for risk calculation service (Step 2 of Pipeline)
 */
const calculateRiskService = require('./services/calculateRiskService');

async function testRiskService() {
    console.log('='.repeat(80));
    console.log('TESTING RISK CALCULATION SERVICE (Step 2 of Pipeline)');
    console.log('='.repeat(80));
    
    // Test data from extraction service
    const creditData = {
        nom_fichier: 'bank_report-1766292579162-880831507.pdf',
        montant_credit: 60756000,
        duree: 60,
        taux_interet: 9.39,
        type_credit: 'Crédit de fonctionnement'
    };
    
    const secteur = 'BANQUES';
    const nb_sinistres = 0;
    const status_financier = null;
    
    console.log('\n[1/3] Input Data:');
    console.log('  Credit Data:');
    console.log('    - Montant:', creditData.montant_credit.toLocaleString(), 'DT');
    console.log('    - Durée:', creditData.duree, 'mois');
    console.log('    - Taux:', creditData.taux_interet, '%');
    console.log('    - Type:', creditData.type_credit);
    console.log('  Additional Data:');
    console.log('    - Secteur:', secteur);
    console.log('    - Nombre sinistres:', nb_sinistres);
    console.log('    - Status financier:', status_financier || 'N/A');
    
    console.log('\n[2/3] Calculating Risk Factors...');
    console.log('  This will calculate:');
    console.log('    - 7 individual risk scores (montant, taux, duree, secteur, sinistres, type, etat)');
    console.log('    - Final facteur_risque (weighted sum)');
    console.log('');
    
    const startTime = Date.now();
    
    try {
        const result = calculateRiskService.calculate_risk_factor(
            creditData,
            secteur,
            nb_sinistres,
            status_financier
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(3);
        console.log(`  ⏱️  Calculation completed in ${duration}s\n`);
        
        console.log('[3/3] Risk Calculation Results:');
        console.log('  ' + '='.repeat(76));
        console.log('  ✅ Calculation successful!\n');
        
        console.log('  📊 Individual Risk Scores (0-10):');
        console.log('    - Montant score:', result.montant_score);
        console.log('    - Taux score:', result.taux_score);
        console.log('    - Durée score:', result.duree_score);
        console.log('    - Secteur score:', result.secteur_score);
        console.log('    - Sinistres score:', result.sinistres_score);
        console.log('    - Type crédit score:', result.type_credit_score);
        console.log('    - État financier score:', result.etat_financier_score);
        
        console.log('\n  🎯 Final Risk Factor:', result.facteur_risque);
        console.log('    (Weighted sum of all scores)');
        
        // Validation
        console.log('\n  🔍 Validation:');
        const allScoresValid = Object.values(result).every(v => 
            typeof v === 'number' && !isNaN(v) && v >= 0
        );
        if (allScoresValid && result.facteur_risque >= 0 && result.facteur_risque <= 10) {
            console.log('    ✅ All scores are valid (0-10 range)');
        } else {
            console.log('    ⚠️  Some scores may be out of expected range');
        }
        
        if (result.facteur_risque > 7) {
            console.log('    ⚠️  HIGH RISK: facteur_risque > 7');
        } else if (result.facteur_risque > 5) {
            console.log('    ⚠️  MEDIUM RISK: facteur_risque > 5');
        } else {
            console.log('    ✅ LOW RISK: facteur_risque <= 5');
        }
        
        console.log('\n  ' + '='.repeat(76));
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ RISK CALCULATION SERVICE TEST COMPLETED');
        console.log('='.repeat(80));
        
        return result;
        
    } catch (error) {
        console.log('  ❌ Test failed:', error.message);
        console.log('  Stack:', error.stack);
        return null;
    }
}

// Run the test
testRiskService()
    .then(result => {
        if (result) {
            console.log('\n✅ Service is working correctly!');
            process.exit(0);
        } else {
            console.log('\n❌ Service test failed');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n❌ Test error:', error);
        process.exit(1);
    });

