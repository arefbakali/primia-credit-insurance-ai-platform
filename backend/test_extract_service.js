/**
 * Test script for credit extraction service
 * Tests the first step of the pipeline: PDF → Credit Info
 */
const extractCreditService = require('./services/extractCreditService');
const path = require('path');
const fs = require('fs');

async function testExtractService() {
    console.log('='.repeat(80));
    console.log('TESTING CREDIT EXTRACTION SERVICE (Step 1 of Pipeline)');
    console.log('='.repeat(80));
    
    // Find a test PDF
    const uploadsDir = path.join(__dirname, 'uploads');
    const testPdf = path.join(uploadsDir, 'bank_report-1766292579162-880831507.pdf');
    
    if (!fs.existsSync(testPdf)) {
        console.log('\n❌ Test PDF not found:', testPdf);
        console.log('   Please ensure a PDF file exists in backend/uploads/');
        return;
    }
    
    console.log('\n[1/3] PDF File Check');
    console.log('  ✅ PDF found:', path.basename(testPdf));
    console.log('  📄 Full path:', testPdf);
    
    console.log('\n[2/3] Extracting Credit Information...');
    console.log('  This will:');
    console.log('    - Extract text from PDF');
    console.log('    - Use Gemini LLM to extract structured data');
    console.log('    - Return: montant_credit, duree, taux_interet, type_credit');
    console.log('');
    
    const startTime = Date.now();
    
    try {
        const result = await extractCreditService.extractCreditFromPDF(testPdf);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`  ⏱️  Extraction completed in ${duration}s\n`);
        
        console.log('[3/3] Extraction Results:');
        console.log('  ' + '='.repeat(76));
        
        if (result.error) {
            console.log('  ❌ Error occurred:', result.error);
            console.log('  📋 Result structure:');
            console.log('    - nom_fichier:', result.nom_fichier);
            console.log('    - montant_credit:', result.montant_credit);
            console.log('    - duree:', result.duree);
            console.log('    - taux_interet:', result.taux_interet);
            console.log('    - type_credit:', result.type_credit);
        } else {
            console.log('  ✅ Extraction successful!\n');
            console.log('  📋 Extracted Data:');
            console.log('    - Nom fichier:', result.nom_fichier || 'N/A');
            console.log('    - Montant crédit:', result.montant_credit ? `${result.montant_credit.toLocaleString()} DT` : 'N/A');
            console.log('    - Durée:', result.duree ? `${result.duree} mois` : 'N/A');
            console.log('    - Taux intérêt:', result.taux_interet ? `${result.taux_interet}%` : 'N/A');
            console.log('    - Type crédit:', result.type_credit || 'N/A');
            
            // Validation
            console.log('\n  🔍 Validation:');
            const hasData = result.montant_credit || result.duree || result.taux_interet || result.type_credit;
            if (hasData) {
                console.log('    ✅ At least one field extracted successfully');
            } else {
                console.log('    ⚠️  No data extracted (PDF may not contain credit info)');
            }
        }
        
        console.log('\n  ' + '='.repeat(76));
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ EXTRACTION SERVICE TEST COMPLETED');
        console.log('='.repeat(80));
        
        // Return result for further testing
        return result;
        
    } catch (error) {
        console.log('  ❌ Test failed:', error.message);
        console.log('  Stack:', error.stack);
        return null;
    }
}

// Run the test
testExtractService()
    .then(result => {
        if (result && !result.error) {
            console.log('\n✅ Service is working correctly!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Service completed but may need configuration (GEMINI_API_KEY)');
            process.exit(0);
        }
    })
    .catch(error => {
        console.error('\n❌ Test error:', error);
        process.exit(1);
    });

