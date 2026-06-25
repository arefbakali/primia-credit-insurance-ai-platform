/**
 * Test script for the commission prediction model
 * Tests loading and using the joblib model
 */
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = util.promisify(exec);

const MODEL_PATH = path.join(__dirname, 'models', 'commission_model.joblib');
const METADATA_PATH = path.join(__dirname, 'models', 'model_metadata.json');
const LOAD_SCRIPT = path.join(__dirname, 'services', 'loadCommissionModel.py');

async function testModel() {
    console.log('='.repeat(70));
    console.log('TESTING COMMISSION PREDICTION MODEL');
    console.log('='.repeat(70));
    
    // Check if model exists
    console.log('\n[1/4] Checking model files...');
    if (!fs.existsSync(MODEL_PATH)) {
        console.log('  ❌ Model file not found:', MODEL_PATH);
        console.log('  💡 Run: cd ia_model && python train_and_save_model.py');
        return;
    }
    console.log('  ✅ Model file found:', MODEL_PATH);
    
    if (fs.existsSync(METADATA_PATH)) {
        const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
        console.log('  ✅ Metadata found:');
        console.log('     Model:', metadata.model_name);
        console.log('     MSE:', metadata.mse);
        console.log('     R²:', metadata.r2);
        console.log('     MAE:', metadata.mae);
    } else {
        console.log('  ⚠️  Metadata file not found');
    }
    
    // Test cases
    const testCases = [
        {
            name: 'Low Risk Credit',
            input: {
                facteur_risque: 3.0,
                montant_credit: 50000,
                taux_interet: 5.0,
                duree: 36,
                secteur_score: 3,
                sinistres_score: 2,
                type_credit_score: 3,
                etat_financier_score: 2
            }
        },
        {
            name: 'Medium Risk Credit',
            input: {
                facteur_risque: 5.5,
                montant_credit: 200000,
                taux_interet: 8.0,
                duree: 60,
                secteur_score: 5,
                sinistres_score: 5,
                type_credit_score: 5,
                etat_financier_score: 5
            }
        },
        {
            name: 'High Risk Credit',
            input: {
                facteur_risque: 8.5,
                montant_credit: 1000000,
                taux_interet: 12.0,
                duree: 120,
                secteur_score: 8,
                sinistres_score: 9,
                type_credit_score: 7,
                etat_financier_score: 8
            }
        }
    ];
    
    console.log('\n[2/4] Testing model predictions...');
    const pythonPath = process.env.PYTHON_PATH || 'python';
    
    for (const testCase of testCases) {
        console.log(`\n  Testing: ${testCase.name}`);
        console.log('  Input:', JSON.stringify(testCase.input, null, 2));
        
        try {
            const args = [
                testCase.input.facteur_risque,
                testCase.input.montant_credit,
                testCase.input.taux_interet,
                testCase.input.duree,
                testCase.input.secteur_score,
                testCase.input.sinistres_score,
                testCase.input.type_credit_score,
                testCase.input.etat_financier_score
            ].join(' ');
            
            const { stdout, stderr } = await execPromise(
                `"${pythonPath}" "${LOAD_SCRIPT}" ${args}`,
                { maxBuffer: 10 * 1024 * 1024 }
            );
            
            if (stderr && !stderr.includes('Warning')) {
                console.log('  ⚠️  Python stderr:', stderr);
            }
            
            const result = JSON.parse(stdout.trim());
            
            if (result.error) {
                console.log('  ❌ Error:', result.error);
            } else {
                const prediction = result.commission_predite;
                const montant_commission = (prediction * testCase.input.montant_credit) / 100;
                
                console.log('  ✅ Prediction successful!');
                console.log('     Commission rate:', prediction + '%');
                console.log('     Commission amount:', montant_commission.toFixed(2), 'DT');
            }
        } catch (error) {
            console.log('  ❌ Test failed:', error.message);
        }
    }
    
    // Test with optimization function for comparison
    console.log('\n[3/4] Testing optimization function (for comparison)...');
    const optimizeCommissionService = require('./services/optimizeCommissionService');
    
    for (const testCase of testCases) {
        console.log(`\n  Testing: ${testCase.name}`);
        try {
            const result = await optimizeCommissionService.calculate_optimal_commission(
                {
                    facteur_risque: testCase.input.facteur_risque,
                    secteur_score: testCase.input.secteur_score,
                    sinistres_score: testCase.input.sinistres_score,
                    type_credit_score: testCase.input.type_credit_score,
                    etat_financier_score: testCase.input.etat_financier_score
                },
                {
                    montant_credit: testCase.input.montant_credit,
                    taux_interet: testCase.input.taux_interet,
                    duree: testCase.input.duree
                }
            );
            
            console.log('  ✅ Optimization result:');
            console.log('     Commission optimale:', result.commission_optimale + '%');
            console.log('     Commission amount:', result.montant_commission.toFixed(2), 'DT');
            if (result.commission_predite) {
                console.log('     ML Model prediction:', result.commission_predite + '%');
                console.log('     Difference:', Math.abs(result.commission_optimale - result.commission_predite).toFixed(2) + '%');
            } else {
                console.log('     ML Model: Not used (fallback to optimization)');
            }
        } catch (error) {
            console.log('  ❌ Optimization failed:', error.message);
        }
    }
    
    console.log('\n[4/4] Summary');
    console.log('='.repeat(70));
    console.log('✅ Model test completed!');
    console.log('\nIf all tests passed, the model is working correctly.');
    console.log('The model will be automatically used in the quote generation pipeline.');
}

// Run tests
testModel().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});

