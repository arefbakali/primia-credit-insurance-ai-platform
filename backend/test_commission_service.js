/**
 * Test script for commission optimization service (Step 3 of Pipeline)
 * Tests ML model prediction using joblib
 */
const optimizeCommissionService = require('./services/optimizeCommissionService');
const path = require('path');
const fs = require('fs');

async function testCommissionService() {
    console.log('='.repeat(80));
    console.log('TESTING COMMISSION OPTIMIZATION SERVICE (Step 3 of Pipeline)');
    console.log('='.repeat(80));
    
    // Test data from previous steps
    const creditData = {
        montant_credit: 60756000,
        taux_interet: 9.39,
        duree: 60,
        type_credit: 'Crédit de fonctionnement'
    };
    
    const riskData = {
        facteur_risque: 3.07,
        montant_score: 0.91,
        taux_score: 4.56,
        duree_score: 3.33,
        secteur_score: 5.0,
        sinistres_score: 0.0,
        type_credit_score: 7.0,
        etat_financier_score: 5.0
    };
    
    console.log('\n[1/4] Input Data:');
    console.log('  Credit Data:');
    console.log('    - Montant:', creditData.montant_credit.toLocaleString(), 'DT');
    console.log('    - Taux:', creditData.taux_interet, '%');
    console.log('    - Durée:', creditData.duree, 'mois');
    console.log('  Risk Data:');
    console.log('    - Facteur risque:', riskData.facteur_risque);
    console.log('    - Scores:', {
        montant: riskData.montant_score,
        taux: riskData.taux_score,
        secteur: riskData.secteur_score
    });
    
    console.log('\n[2/4] Checking ML Model...');
    const modelPath = path.join(__dirname, 'models', 'commission_model.joblib');
    const metadataPath = path.join(__dirname, 'models', 'model_metadata.json');
    
    if (fs.existsSync(modelPath)) {
        console.log('  ✅ ML Model found:', path.basename(modelPath));
        
        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            console.log('  ✅ Model metadata found');
            console.log('    - Model type:', metadata.model_type || 'N/A');
            console.log('    - Performance:', {
                mse: metadata.mse?.toFixed(4) || 'N/A',
                r2: metadata.r2?.toFixed(4) || 'N/A',
                mae: metadata.mae?.toFixed(4) || 'N/A'
            });
        } else {
            console.log('  ⚠️  Model metadata not found');
        }
    } else {
        console.log('  ⚠️  ML Model not found - will use optimization function only');
        console.log('  💡 To train model: cd ia_model && python train_and_save_model.py');
    }
    
    console.log('\n[3/4] Calculating Optimal Commission...');
    console.log('  This will:');
    console.log('    - Try to use ML model prediction (if available)');
    console.log('    - Calculate base commission');
    console.log('    - Optimize commission using objective function');
    console.log('    - Return best commission (ML prediction or optimized)');
    console.log('');
    
    const startTime = Date.now();
    
    try {
        const result = await optimizeCommissionService.calculate_optimal_commission(
            riskData,
            creditData
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(3);
        console.log(`  ⏱️  Calculation completed in ${duration}s\n`);
        
        console.log('[4/4] Commission Optimization Results:');
        console.log('  ' + '='.repeat(76));
        console.log('  ✅ Calculation successful!\n');
        
        console.log('  💰 Commission Details:');
        console.log('    - Commission base:', result.commission_base, '%');
        console.log('    - Commission optimale:', result.commission_optimale, '%');
        
        if (result.commission_predite !== null && result.commission_predite !== undefined) {
            console.log('    - Commission prédite (ML):', result.commission_predite, '%');
            console.log('    - ✅ Using ML model prediction!');
            
            // Compare ML vs optimization
            const diff = Math.abs(result.commission_predite - result.commission_optimale);
            console.log('    - Différence ML vs Optimisation:', diff.toFixed(2), '%');
        } else {
            console.log('    - Commission prédite (ML): N/A (using optimization function)');
        }
        
        console.log('    - Montant commission:', result.montant_commission.toLocaleString(), 'DT');
        console.log('    - Fonction objectif:', result.fonction_objectif);
        
        // Validation
        console.log('\n  🔍 Validation:');
        if (result.commission_optimale >= 0.3 && result.commission_optimale <= 4.0) {
            console.log('    ✅ Commission within valid range (0.3% - 4.0%)');
        } else {
            console.log('    ⚠️  Commission out of expected range');
        }
        
        if (result.montant_commission > 0) {
            console.log('    ✅ Commission amount calculated correctly');
        } else {
            console.log('    ⚠️  Commission amount is zero or negative');
        }
        
        if (result.commission_predite !== null) {
            console.log('    ✅ ML model is being used for predictions');
        } else {
            console.log('    ⚠️  ML model not available - using optimization function');
        }
        
        console.log('\n  ' + '='.repeat(76));
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ COMMISSION OPTIMIZATION SERVICE TEST COMPLETED');
        console.log('='.repeat(80));
        
        return result;
        
    } catch (error) {
        console.log('  ❌ Test failed:', error.message);
        console.log('  Stack:', error.stack);
        return null;
    }
}

// Run the test
testCommissionService()
    .then(result => {
        if (result) {
            console.log('\n✅ Service is working correctly!');
            if (result.commission_predite !== null) {
                console.log('✅ ML model (joblib) is being used successfully!');
            } else {
                console.log('⚠️  ML model not available - using optimization function');
            }
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

