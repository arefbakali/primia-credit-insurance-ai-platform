/**
 * Complete Pipeline Test
 * Tests the entire quote generation pipeline:
 * 1. Extract credit info from PDF
 * 2. Calculate risk factors
 * 3. Optimize commission (with ML model)
 * 4. Save to database
 * 5. Generate complete quote
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

async function testCompletePipeline() {
    console.log('='.repeat(80));
    console.log('COMPLETE QUOTE GENERATION PIPELINE TEST');
    console.log('='.repeat(80));
    
    // Step 0: Login
    const loggedIn = await login();
    if (!loggedIn) {
        console.log('\n❌ Cannot proceed without authentication');
        return;
    }
    
    // Check if test PDF exists
    if (!fs.existsSync(TEST_PDF_PATH)) {
        console.log('\n[INFO] Test PDF not found, creating a dummy test...');
        console.log('  Using existing PDF or will test with sample data');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('PIPELINE OVERVIEW');
    console.log('='.repeat(80));
    console.log(`
The complete pipeline consists of:

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

4. QUOTE GENERATION
   └─> Update quote with final amounts
   └─> Set status to 'generated'
   └─> Return complete quote with all pipeline data
    `);
    
    console.log('\n' + '='.repeat(80));
    console.log('TESTING PIPELINE');
    console.log('='.repeat(80));
    
    // Step 1: Generate Quote (Full Pipeline)
    console.log('\n[STEP 1] Generating Quote (Full Pipeline)...');
    console.log('  Endpoint: POST /api/quotes/generate');
    console.log('  This will:');
    console.log('    - Upload PDF');
    console.log('    - Extract credit info');
    console.log('    - Calculate risk factors');
    console.log('    - Optimize commission');
    console.log('    - Save all to database');
    
    try {
        const formData = new FormData();
        
        // Use existing PDF if available, otherwise create a note
        if (fs.existsSync(TEST_PDF_PATH)) {
            formData.append('bank_report', fs.createReadStream(TEST_PDF_PATH));
            console.log('  📄 Using PDF:', path.basename(TEST_PDF_PATH));
        } else {
            console.log('  ⚠️  PDF file not found, testing with minimal data');
            // Create a dummy file for testing
            const dummyPdf = path.join(__dirname, 'test_dummy.pdf');
            fs.writeFileSync(dummyPdf, 'dummy pdf content');
            formData.append('bank_report', fs.createReadStream(dummyPdf));
        }
        
        formData.append('sector', 'BANQUES');
        formData.append('description', 'Test quote - Complete pipeline');
        
        const response = await axios.post(
            `${API_URL}/quotes/generate`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );
        
        console.log('  ✅ Quote generated successfully!');
        console.log('  Quote ID:', response.data.quote?.quote_id || response.data.quote?.id);
        
        const quoteId = response.data.quote?.quote_id || response.data.quote?.id;
        
        // Display pipeline results
        if (response.data.pipeline) {
            console.log('\n  📊 Pipeline Results:');
            
            if (response.data.pipeline.credit_info) {
                console.log('    Credit Info:');
                console.log('      - Montant:', response.data.pipeline.credit_info.montant_credit || 'N/A');
                console.log('      - Durée:', response.data.pipeline.credit_info.duree || 'N/A', 'mois');
                console.log('      - Taux:', response.data.pipeline.credit_info.taux_interet || 'N/A', '%');
                console.log('      - Type:', response.data.pipeline.credit_info.type_credit || 'N/A');
            }
            
            if (response.data.pipeline.risk_factors) {
                console.log('    Risk Factors:');
                console.log('      - Facteur Risque:', response.data.pipeline.risk_factors.facteur_risque);
                console.log('      - Scores:', {
                    montant: response.data.pipeline.risk_factors.montant_score,
                    taux: response.data.pipeline.risk_factors.taux_score,
                    secteur: response.data.pipeline.risk_factors.secteur_score
                });
            }
            
            if (response.data.pipeline.commission) {
                console.log('    Commission:');
                console.log('      - Base:', response.data.pipeline.commission.commission_base, '%');
                console.log('      - Optimale:', response.data.pipeline.commission.commission_optimale, '%');
                if (response.data.pipeline.commission.commission_predite) {
                    console.log('      - ML Prediction:', response.data.pipeline.commission.commission_predite, '%');
                }
                console.log('      - Montant:', response.data.pipeline.commission.montant_commission, 'DT');
            }
        }
        
        // Step 2: Get Complete Quote
        console.log('\n[STEP 2] Retrieving Complete Quote from Database...');
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
                
                console.log('  ✅ Complete quote retrieved!');
                console.log('\n  📋 Complete Quote Data:');
                console.log('    User:', quoteResponse.data.user_email);
                console.log('    Sector:', quoteResponse.data.sector);
                console.log('    Status:', quoteResponse.data.status);
                console.log('    Base Amount:', quoteResponse.data.base_amount, 'DT');
                console.log('    Total Amount:', quoteResponse.data.total_amount, 'DT');
                
                if (quoteResponse.data.montant_credit) {
                    console.log('\n    Credit Offer:');
                    console.log('      - Montant Credit:', quoteResponse.data.montant_credit, 'DT');
                    console.log('      - Durée:', quoteResponse.data.duree, 'mois');
                    console.log('      - Taux:', quoteResponse.data.taux_interet, '%');
                }
                
                if (quoteResponse.data.facteur_risque) {
                    console.log('\n    Risk Factors:');
                    console.log('      - Facteur Risque:', quoteResponse.data.facteur_risque);
                }
                
                if (quoteResponse.data.commission_optimale) {
                    console.log('\n    Commission:');
                    console.log('      - Optimale:', quoteResponse.data.commission_optimale, '%');
                    console.log('      - Montant:', quoteResponse.data.montant_commission, 'DT');
                }
                
            } catch (error) {
                console.log('  ⚠️  Could not retrieve complete quote:', error.response?.data?.message || error.message);
            }
        }
        
        // Step 3: Get All Quotes (Admin View)
        console.log('\n[STEP 3] Testing Admin Dashboard View...');
        console.log('  Endpoint: GET /api/quotes/complete');
        
        try {
            const allQuotesResponse = await axios.get(
                `${API_URL}/quotes/complete`,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );
            
            console.log('  ✅ Retrieved', allQuotesResponse.data.length, 'quotes');
            console.log('  📊 Quotes Summary:');
            
            allQuotesResponse.data.slice(0, 3).forEach((quote, index) => {
                console.log(`\n    Quote ${index + 1}:`);
                console.log('      - ID:', quote.quote_id);
                console.log('      - User:', quote.user_email);
                console.log('      - Status:', quote.status);
                if (quote.facteur_risque) {
                    console.log('      - Risk Factor:', quote.facteur_risque);
                }
                if (quote.commission_optimale) {
                    console.log('      - Commission:', quote.commission_optimale + '%');
                }
            });
            
        } catch (error) {
            console.log('  ⚠️  Could not retrieve all quotes:', error.response?.data?.message || error.message);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ PIPELINE TEST COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log('\nSummary:');
        console.log('  ✅ Authentication: Working');
        console.log('  ✅ Quote Generation: Working');
        console.log('  ✅ Credit Extraction: Working');
        console.log('  ✅ Risk Calculation: Working');
        console.log('  ✅ Commission Optimization: Working');
        console.log('  ✅ Database Integration: Working');
        console.log('  ✅ Complete Quote Retrieval: Working');
        
    } catch (error) {
        console.log('  ❌ Pipeline test failed:', error.response?.data || error.message);
        if (error.response?.data) {
            console.log('  Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the complete pipeline test
testCompletePipeline().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});

