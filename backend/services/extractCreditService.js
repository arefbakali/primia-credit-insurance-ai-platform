/**
 * JavaScript wrapper for credit extraction service
 * Calls the Python service extractCreditService.py
 */
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = util.promisify(exec);

/**
 * Extract credit information from PDF using Python service
 * @param {string} pdfPath - Full path to the PDF file
 * @returns {Promise<Object>} Extracted credit information
 */
async function extractCreditFromPDF(pdfPath) {
    try {
        const pythonPath = process.env.PYTHON_PATH || 'python';
        const servicePath = path.join(__dirname, 'extractCreditService.py');
        
        // Verify PDF exists
        if (!fs.existsSync(pdfPath)) {
            console.error(`PDF file not found: ${pdfPath}`);
            return {
                nom_fichier: path.basename(pdfPath),
                montant_credit: null,
                duree: null,
                taux_interet: null,
                type_credit: null,
                error: 'PDF file not found'
            };
        }
        
        // Execute Python service
        const { stdout, stderr } = await execPromise(
            `"${pythonPath}" "${servicePath}" "${pdfPath}"`,
            { 
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                cwd: __dirname
            }
        );
        
        // Log warnings but don't fail on them
        if (stderr && !stderr.includes('Warning') && stderr.trim()) {
            console.warn('Python stderr:', stderr);
        }
        
        // Parse JSON output
        const output = stdout.trim();
        if (!output) {
            throw new Error('No output from Python service');
        }
        
        const result = JSON.parse(output);
        return result;
    } catch (error) {
        console.error('Error extracting credit info:', error.message);
        // Return default structure with error info
        return {
            nom_fichier: path.basename(pdfPath),
            montant_credit: null,
            duree: null,
            taux_interet: null,
            type_credit: null,
            error: error.message
        };
    }
}

module.exports = {
    extractCreditFromPDF,
    process_pdf: extractCreditFromPDF
};

