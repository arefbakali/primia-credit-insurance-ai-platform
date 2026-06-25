const supabase = require('../utils/supabaseClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import services (JavaScript implementations)
const extractCreditService = require('../services/extractCreditService');
const calculateRiskService = require('../services/calculateRiskService');
const optimizeCommissionService = require('../services/optimizeCommissionService');

// Configure Multer for File Uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

exports.upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

/**
 * Generate complete quote with full pipeline:
 * 1. Extract credit info from PDF
 * 2. Calculate risk factors
 * 3. Optimize commission
 * 4. Save all data to database
 */
exports.generateQuote = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const user_email = req.user?.email;
    const { description, sector } = req.body || {};
    const bank_report_file = req.file;

    if (!user_email) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (!sector) {
        return res.status(400).json({ message: 'sector is required' });
    }

    if (!bank_report_file) {
        return res.status(400).json({ message: 'Bank report PDF file is required' });
    }

    const bank_report_path = `uploads/${bank_report_file.filename}`;
    const full_pdf_path = path.join(__dirname, '..', bank_report_path);

    try {
        // Step 1: Create quote record
        // Note: status will use database default ('pending'), will be updated to 'generated' after pipeline
        const quoteInsertData = {
            user_email,
            description: description || 'Analyse automatique du rapport financier',
            sector,
            bank_report_path,
            // status: omitted to use database default
            base_amount: 0,
            tva_rate: 19
        };
        
        console.log(`[Quote Generation] Inserting quote with data:`, JSON.stringify(quoteInsertData, null, 2));
        
        const { data: quoteData, error: quoteError } = await supabase
            .from('quotes')
            .insert([quoteInsertData])
            .select()
            .single();

        if (quoteError) {
            console.error('[Quote Generation] Error creating quote:', quoteError);
            console.error('[Quote Generation] Error details:', JSON.stringify(quoteError, null, 2));
            console.error('[Quote Generation] Insert data was:', JSON.stringify(quoteInsertData, null, 2));
            return res.status(500).json({ message: 'Error creating quote', error: quoteError.message });
        }

        const quoteId = quoteData.id;
        console.log(`[Quote ${quoteId}] Starting pipeline processing...`);

        // Step 2: Extract credit information from PDF
        console.log(`[Quote ${quoteId}] Step 1: Extracting credit information...`);
        let creditInfo = null;
        try {
            creditInfo = await extractCreditService.extractCreditFromPDF(full_pdf_path);
            if (!creditInfo) {
                throw new Error('Credit extraction returned null');
            }
            if (!creditInfo.nom_fichier) {
                creditInfo.nom_fichier = bank_report_file.originalname;
            }
        } catch (error) {
            console.error(`[Quote ${quoteId}] Error extracting credit info:`, error);
            return res.status(500).json({ 
                message: 'Error extracting credit information',
                error: error.message 
            });
        }

        // Save credit offer to database
        let creditOfferData = null;
        const { data: creditOfferResult, error: creditError } = await supabase
            .from('credit_offers')
            .insert([{
                quote_id: quoteId,
                nom_fichier: creditInfo.nom_fichier || bank_report_file.originalname,
                montant_credit: creditInfo.montant_credit,
                duree: creditInfo.duree,
                taux_interet: creditInfo.taux_interet,
                type_credit: creditInfo.type_credit
            }])
            .select()
            .single();

        if (creditError) {
            console.error(`[Quote ${quoteId}] Error saving credit offer:`, creditError);
            return res.status(500).json({ 
                message: 'Error saving credit offer to database',
                error: creditError.message 
            });
        }
        creditOfferData = creditOfferResult;

        console.log(`[Quote ${quoteId}] Credit info extracted:`, creditInfo);

        // Step 3: Calculate risk factors
        console.log(`[Quote ${quoteId}] Step 2: Calculating risk factors...`);
        let riskData = null;
        let riskFactorData = null;
        try {
            // Get additional data for risk calculation
            const nb_sinistres = 0; // TODO: Get from sinistres dataset
            const status_financier = null; // TODO: Get from financial_results

            riskData = calculateRiskService.calculate_risk_factor(
                creditInfo,
                sector,
                nb_sinistres,
                status_financier
            );

            if (!riskData) {
                throw new Error('Risk calculation returned null');
            }

            // Save risk factors to database
            const { data: riskFactorResult, error: riskError } = await supabase
                .from('risk_factors')
                .insert([{
                    quote_id: quoteId,
                    credit_offer_id: creditOfferData?.id,
                    entreprise: extract_entreprise_from_filename(creditInfo.nom_fichier),
                    secteur: sector,
                    nb_sinistres: riskData.nb_sinistres,
                    montant_sinistres: 0,
                    status_financier: riskData.status_financier,
                    montant_score: riskData.montant_score,
                    taux_score: riskData.taux_score,
                    duree_score: riskData.duree_score,
                    secteur_score: riskData.secteur_score,
                    sinistres_score: riskData.sinistres_score,
                    type_credit_score: riskData.type_credit_score,
                    etat_financier_score: riskData.etat_financier_score,
                    facteur_risque: riskData.facteur_risque
                }])
                .select()
                .single();

            if (riskError) {
                console.error(`[Quote ${quoteId}] Error saving risk factors:`, riskError);
                return res.status(500).json({ 
                    message: 'Error saving risk factors to database',
                    error: riskError.message 
                });
            }

            riskFactorData = riskFactorResult;
            console.log(`[Quote ${quoteId}] Risk factors calculated and saved:`, riskData);
        } catch (error) {
            console.error(`[Quote ${quoteId}] Error calculating risk:`, error);
            return res.status(500).json({ 
                message: 'Error calculating risk factors',
                error: error.message 
            });
        }

        // Step 4: Optimize commission
        console.log(`[Quote ${quoteId}] Step 3: Optimizing commission...`);
        let commissionData = null;
        try {
            commissionData = await optimizeCommissionService.calculate_optimal_commission(
                riskData,
                creditInfo
            );

            // Save commission to database
            const { data: commissionResult, error: commissionError } = await supabase
                .from('optimal_commissions')
                .insert([{
                    quote_id: quoteId,
                    risk_factor_id: riskFactorData?.id,
                    commission_base: commissionData.commission_base,
                    commission_optimale: commissionData.commission_optimale,
                    montant_commission: commissionData.montant_commission,
                    fonction_objectif: commissionData.fonction_objectif,
                    commission_predite: commissionData.commission_predite || null
                }])
                .select()
                .single();

            if (commissionError) {
                console.error(`[Quote ${quoteId}] Error saving commission:`, commissionError);
                return res.status(500).json({ 
                    message: 'Error saving commission to database',
                    error: commissionError.message 
                });
            }

            console.log(`[Quote ${quoteId}] Commission optimized:`, commissionData);
        } catch (error) {
            console.error(`[Quote ${quoteId}] Error optimizing commission:`, error);
            return res.status(500).json({ 
                message: 'Error optimizing commission',
                error: error.message 
            });
        }

        // Step 5: Update quote with final amounts
        const base_amount = commissionData.montant_commission || 0;
        const { error: updateError } = await supabase
            .from('quotes')
            .update({
                base_amount,
                status: 'generated',
                updated_at: new Date().toISOString()
            })
            .eq('id', quoteId);

        if (updateError) {
            console.error(`[Quote ${quoteId}] Error updating quote:`, updateError);
            return res.status(500).json({ 
                message: 'Error updating quote',
                error: updateError.message 
            });
        }

        console.log(`[Quote ${quoteId}] Pipeline completed successfully!`);

        // Return complete quote data
        const { data: completeQuote, error: fetchError } = await supabase
            .from('quotes_complete')
            .select('*')
            .eq('quote_id', quoteId)
            .single();

        res.status(201).json({
            message: 'Quote generated successfully',
            quote: completeQuote || quoteData,
            pipeline: {
                credit_info: creditInfo,
                risk_factors: riskData,
                commission: commissionData
            }
        });

    } catch (error) {
        console.error('Quote generation error:', error);
        res.status(500).json({
            message: 'Error generating quote',
            error: error.message
        });
    }
};

/**
 * Get all quotes with complete pipeline data (for admin dashboard)
 */
exports.getQuotesComplete = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const user_email = req.user?.email;
    const role = req.user?.role;

    try {
        let query = supabase
            .from('quotes_complete')
            .select('*')
            .order('quote_created_at', { ascending: false });

        if (role !== 'admin') {
            query = query.eq('user_email', user_email);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Get quotes complete error:', error);
        res.status(500).json({ message: 'Error fetching quotes', error: error.message });
    }
};

/**
 * Get single quote with complete pipeline data
 */
exports.getQuoteComplete = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { id } = req.params;
    const user_email = req.user?.email;
    const role = req.user?.role;

    try {
        let query = supabase
            .from('quotes_complete')
            .select('*')
            .eq('quote_id', id)
            .single();

        const { data, error } = await query;

        if (error) throw error;

        // Check permissions
        if (role !== 'admin' && data.user_email !== user_email) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Get quote complete error:', error);
        res.status(500).json({ message: 'Error fetching quote', error: error.message });
    }
};

// Helper function
function extract_entreprise_from_filename(filename) {
    if (!filename) return '';
    let name = filename.replace('.pdf', '').replace('.PDF', '');
    name = name.replace('_', ' ').replace('-', ' ');
    return name.toUpperCase().trim();
}

