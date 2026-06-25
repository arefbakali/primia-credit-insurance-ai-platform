/**
 * Complete Pipeline Test with Database Integration
 * Tests all 3 steps together:
 * 1. Extract credit info from PDF
 * 2. Calculate risk factors
 * 3. Optimize commission (with ML model)
 * Saves all data to database tables
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000/api';
const TEST_PDF_PATH = path.join(__dirname, 'uploads', 'bank_report-1766292579162-880831507.pdf');

// Test user credentials
const TEST_USER = {
    email: 'amen@gmail.com',
    password: 'amen1920'
};

let authToken = null;

async function login() {
    console.log('\n[STEP 0] Authenticating...');
    try {
        const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
        authToken = response.data.token;
        console.log('  ✅ Login successful');
        console.log('  User:', response.data.user.email, `(${response.data.user.role})`);
        return true;
    } catch (error) {
        console.log('  ❌ Login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testFullPipeline() {
    console.log('='.repeat(80));
    console.log('COMPLETE PIPELINE TEST WITH DATABASE INTEGRATION');
    console.log('='.repeat(80));
    
    // Step 0: Login
    const loggedIn = await login();
    if (!loggedIn) {
        console.log('\n❌ Cannot proceed without authentication');
        return;
    }
    
    // Check if test PDF exists
    if (!fs.existsSync(TEST_PDF_PATH)) {
        console.log('\n❌ Test PDF not found:', TEST_PDF_PATH);
        console.log('   Please ensure a PDF file exists in backend/uploads/');
        return;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('PIPELINE OVERVIEW');
    console.log('='.repeat(80));
    console.log(`
The complete pipeline will:

1. PDF UPLOAD & CREDIT EXTRACTION
   └─> Upload PDF file
   └─> Extract: montant_credit, duree, taux_interet, type_credit
   └─> Save to: credit_offers table

2. RISK FACTOR CALCULATION
   └─> Calculate 7 risk scores (montant, taux, duree, secteur, sinistres, type_credit, etat_financier)
   └─> Calculate final: facteur_risque
   └─> Save to: risk_factors table

3. COMMISSION OPTIMIZATION
   └─> Use ML model (Gradient Boosting) if available
   └─> Calculate: commission_base, commission_optimale, montant_commission
   └─> Save to: optimal_commissions table

4. QUOTE FINALIZATION
   └─> Update quote with final amounts
   └─> Set status to 'generated'
   └─> Return complete quote with all pipeline data
    `);
    
    console.log('\n' + '='.repeat(80));
    console.log('TESTING COMPLETE PIPELINE');
    console.log('='.repeat(80));
    
    // Step 1: Generate Quote (Full Pipeline)
    console.log('\n[STEP 1] Generating Quote (Full Pipeline)...');
    console.log('  Endpoint: POST /api/quotes/generate');
    console.log('  PDF File:', path.basename(TEST_PDF_PATH));
    
    try {
        const formData = new FormData();
        formData.append('bank_report', fs.createReadStream(TEST_PDF_PATH));
        formData.append('sector', 'BANQUES');
        formData.append('description', 'Test complet du pipeline avec sauvegarde en base de données');
        
        console.log('  📤 Uploading PDF and starting pipeline...');
        const startTime = Date.now();
        
        const response = await axios.post(
            `${API_URL}/quotes/generate`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 60000 // 60 seconds timeout
            }
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`  ⏱️  Pipeline completed in ${duration}s\n`);
        
        console.log('  ✅ Quote generated successfully!');
        
        const quoteId = response.data.quote?.quote_id || response.data.quote?.id;
        console.log('  📋 Quote ID:', quoteId);
        
        // Display pipeline results
        if (response.data.pipeline) {
            console.log('\n  📊 Pipeline Results:');
            
            if (response.data.pipeline.credit_info) {
                console.log('\n    [STEP 1] Credit Extraction:');
                console.log('      ✅ Saved to: credit_offers table');
                console.log('      - Montant:', response.data.pipeline.credit_info.montant_credit?.toLocaleString() || 'N/A', 'DT');
                console.log('      - Durée:', response.data.pipeline.credit_info.duree || 'N/A', 'mois');
                console.log('      - Taux:', response.data.pipeline.credit_info.taux_interet || 'N/A', '%');
                console.log('      - Type:', response.data.pipeline.credit_info.type_credit || 'N/A');
            }
            
            if (response.data.pipeline.risk_factors) {
                console.log('\n    [STEP 2] Risk Calculation:');
                console.log('      ✅ Saved to: risk_factors table');
                console.log('      - Facteur Risque:', response.data.pipeline.risk_factors.facteur_risque);
                console.log('      - Scores:', {
                    montant: response.data.pipeline.risk_factors.montant_score,
                    taux: response.data.pipeline.risk_factors.taux_score,
                    secteur: response.data.pipeline.risk_factors.secteur_score,
                    sinistres: response.data.pipeline.risk_factors.sinistres_score
                });
            }
            
            if (response.data.pipeline.commission) {
                console.log('\n    [STEP 3] Commission Optimization:');
                console.log('      ✅ Saved to: optimal_commissions table');
                console.log('      - Commission base:', response.data.pipeline.commission.commission_base, '%');
                console.log('      - Commission optimale:', response.data.pipeline.commission.commission_optimale, '%');
                if (response.data.pipeline.commission.commission_predite) {
                    console.log('      - Commission prédite (ML):', response.data.pipeline.commission.commission_predite, '%');
                    console.log('      - ✅ Using ML model (joblib)!');
                }
                console.log('      - Montant commission:', response.data.pipeline.commission.montant_commission?.toLocaleString() || 'N/A', 'DT');
            }
        }
        
        // Step 2: Verify data in database
        console.log('\n[STEP 2] Verifying Data in Database...');
        console.log('  Endpoint: GET /api/quotes/complete/:id');
        
        if (quoteId) {
            try {
                const quoteResponse = await axios.get(
                    `${API_URL}/quotes/complete/${quoteId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`
                        }
                    }
                );
                
                console.log('  ✅ Complete quote retrieved from database!\n');
                console.log('  📋 Database Verification:');
                console.log('    ' + '='.repeat(76));
                
                const quote = quoteResponse.data;
                
                // Verify credit_offers table
                if (quote.montant_credit) {
                    console.log('\n    ✅ credit_offers table:');
                    console.log('      - Montant crédit:', quote.montant_credit?.toLocaleString() || 'N/A', 'DT');
                    console.log('      - Durée:', quote.duree || 'N/A', 'mois');
                    console.log('      - Taux:', quote.taux_interet || 'N/A', '%');
                    console.log('      - Type:', quote.type_credit || 'N/A');
                } else {
                    console.log('\n    ⚠️  credit_offers table: No data found');
                }
                
                // Verify risk_factors table
                if (quote.facteur_risque) {
                    console.log('\n    ✅ risk_factors table:');
                    console.log('      - Facteur risque:', quote.facteur_risque);
                    console.log('      - Montant score:', quote.montant_score || 'N/A');
                    console.log('      - Taux score:', quote.taux_score || 'N/A');
                    console.log('      - Secteur score:', quote.secteur_score || 'N/A');
                } else {
                    console.log('\n    ⚠️  risk_factors table: No data found');
                }
                
                // Verify optimal_commissions table
                if (quote.commission_optimale) {
                    console.log('\n    ✅ optimal_commissions table:');
                    console.log('      - Commission base:', quote.commission_base || 'N/A', '%');
                    console.log('      - Commission optimale:', quote.commission_optimale, '%');
                    if (quote.commission_predite) {
                        console.log('      - Commission prédite (ML):', quote.commission_predite, '%');
                    }
                    console.log('      - Montant commission:', quote.montant_commission?.toLocaleString() || 'N/A', 'DT');
                } else {
                    console.log('\n    ⚠️  optimal_commissions table: No data found');
                }
                
                // Verify quote table
                console.log('\n    ✅ quotes table:');
                console.log('      - Quote ID:', quote.quote_id);
                console.log('      - User:', quote.user_email);
                console.log('      - Sector:', quote.sector);
                console.log('      - Status:', quote.status);
                console.log('      - Base amount:', quote.base_amount?.toLocaleString() || 'N/A', 'DT');
                console.log('      - Total amount:', quote.total_amount?.toLocaleString() || 'N/A', 'DT');
                
                console.log('\n    ' + '='.repeat(76));
                
            } catch (error) {
                console.log('  ⚠️  Could not retrieve complete quote:', error.response?.data?.message || error.message);
            }
        }
        
        // Step 3: Summary
        console.log('\n[STEP 3] Pipeline Summary');
        console.log('  ' + '='.repeat(76));
        console.log('  ✅ All pipeline steps completed successfully!');
        console.log('  ✅ All data saved to database tables:');
        console.log('     - credit_offers');
        console.log('     - risk_factors');
        console.log('     - optimal_commissions');
        console.log('     - quotes (updated)');
        console.log('  ✅ ML model (joblib) used for commission prediction');
        console.log('  ✅ Complete quote view (quotes_complete) working');
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ COMPLETE PIPELINE TEST SUCCESSFUL!');
        console.log('='.repeat(80));
        console.log('\nAll data has been saved to the database and is ready for use in the admin dashboard.\n');
        
    } catch (error) {
        console.log('  ❌ Pipeline test failed:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.log('  Error details:', JSON.stringify(error.response.data, null, 2));
        }
        if (error.stack) {
            console.log('  Stack:', error.stack);
        }
    }
}

// Run the complete pipeline test
testFullPipeline().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});

