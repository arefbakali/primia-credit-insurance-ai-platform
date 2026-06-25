const supabase = require('../utils/supabaseClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Configure Multer for File Uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
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

// Helper function to calculate total amount
const calculateTotalAmount = (baseAmount, tvaRate) => {
    if (baseAmount === null || baseAmount === undefined) return null;
    if (baseAmount === 0) return 0;
    const tva = tvaRate || 19; // Default to 19% if not provided
    return baseAmount * (1 + tva / 100);
};

// User requests a quote
exports.requestQuote = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const user_email = req.user?.email;
    const { description, sector } = req.body || {};
    
    if (!user_email) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (!sector) {
        return res.status(400).json({ message: 'sector is required' });
    }

    const bank_report_path = req.file ? `uploads/${req.file.filename}` : null;

    try {
        const { data, error } = await supabase
            .from('quotes')
            .insert([{
                user_email,
                description: description || 'Analyse automatique du rapport financier',
                sector,
                bank_report_path,
                status: 'pending',
                base_amount: 0,
                tva_rate: 19
            }])
            .select();

        if (error) throw error;
        
        const quote = data[0];
        if (quote) {
            quote.total_amount = calculateTotalAmount(quote.base_amount, quote.tva_rate);
        }
        
        res.status(201).json({ message: 'Quote request submitted', quote });
    } catch (error) {
        console.error('Quote request error:', error);
        res.status(500).json({
            message: 'Error submitting quote request',
            details: error.message || error
        });
    }
};

// Get quotes with complete pipeline data (Admin see all, User see their own)
exports.getQuotes = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const user_email = req.user?.email;
    const role = req.user?.role;

    try {
        // Use quotes_complete view to get all pipeline data
        let query = supabase
            .from('quotes_complete')
            .select('*')
            .order('quote_created_at', { ascending: false });

        if (role !== 'admin') {
            query = query.eq('user_email', user_email);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        res.status(200).json(data || []);
    } catch (error) {
        console.error('Get quotes error:', error);
        res.status(500).json({ message: 'Error fetching quotes', error: error.message });
    }
};

// Get single quote with complete pipeline data
exports.getQuote = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { id } = req.params;
    const user_email = req.user?.email;
    const role = req.user?.role;

    try {
        const { data, error } = await supabase
            .from('quotes_complete')
            .select('*')
            .eq('quote_id', id)
            .single();

        if (error) throw error;

        // Check permissions
        if (role !== 'admin' && data.user_email !== user_email) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Get quote error:', error);
        res.status(500).json({ message: 'Error fetching quote', error: error.message });
    }
};

// Admin updates quote (base_amount, tva_rate, status, admin_notes, commission_optimale)
exports.updateQuote = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { id } = req.params;
    const { base_amount, tva_rate, status, admin_notes, commission_optimale } = req.body;

    try {
        // Update quote table
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (base_amount !== undefined) updateData.base_amount = base_amount;
        if (tva_rate !== undefined) updateData.tva_rate = tva_rate;
        if (status !== undefined) updateData.status = status;
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

        const { data, error } = await supabase
            .from('quotes')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        // Update commission_optimale in optimal_commissions table if provided
        if (commission_optimale !== undefined && commission_optimale !== null) {
            // Get the commission record and quote data for this quote
            const { data: commissionData, error: commissionError } = await supabase
                .from('optimal_commissions')
                .select('id')
                .eq('quote_id', id)
                .single();

            if (!commissionError && commissionData) {
                // Get quote to find montant_credit
                const quote = data[0];
                
                // Try to get montant_credit from credit_offers
                const { data: creditOffer } = await supabase
                    .from('credit_offers')
                    .select('montant_credit')
                    .eq('quote_id', id)
                    .single();

                const montant_credit = creditOffer?.montant_credit || quote.base_amount || 0;
                const new_montant_commission = (commission_optimale * montant_credit) / 100;

                const { error: updateCommissionError } = await supabase
                    .from('optimal_commissions')
                    .update({
                        commission_optimale: commission_optimale,
                        montant_commission: new_montant_commission
                    })
                    .eq('id', commissionData.id);

                if (updateCommissionError) {
                    console.warn('Error updating commission:', updateCommissionError);
                } else {
                    // Update base_amount in quotes if not explicitly provided
                    if (base_amount === undefined) {
                        await supabase
                            .from('quotes')
                            .update({ base_amount: new_montant_commission })
                            .eq('id', id);
                    }
                }
            }
        }
        
        // Get complete quote data
        const { data: completeQuote, error: fetchError } = await supabase
            .from('quotes_complete')
            .select('*')
            .eq('quote_id', id)
            .single();

        if (fetchError) {
            console.warn('Could not fetch complete quote:', fetchError);
        }
        
        res.status(200).json({ 
            message: 'Quote updated successfully', 
            quote: completeQuote || data[0] 
        });
    } catch (error) {
        console.error('Update quote error:', error);
        res.status(500).json({ message: 'Error updating quote', error: error.message });
    }
};

// Admin confirms quote (sets status to 'confirmed')
exports.confirmQuote = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('quotes')
            .update({
                status: 'confirmed',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        // Get complete quote data
        const { data: completeQuote, error: fetchError } = await supabase
            .from('quotes_complete')
            .select('*')
            .eq('quote_id', id)
            .single();

        if (fetchError) {
            console.warn('Could not fetch complete quote:', fetchError);
        }
        
        res.status(200).json({ 
            message: 'Quote confirmed successfully', 
            quote: completeQuote || data[0] 
        });
    } catch (error) {
        console.error('Confirm quote error:', error);
        res.status(500).json({ message: 'Error confirming quote', error: error.message });
    }
};

// Download quote as PDF
exports.downloadQuote = async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ message: 'Database service unavailable. Please configure Supabase credentials.' });
    }

    const { id } = req.params;
    const user_email = req.user?.email;
    const role = req.user?.role;

    try {
        // Get complete quote data
        const { data: quote, error } = await supabase
            .from('quotes_complete')
            .select('*')
            .eq('quote_id', id)
            .single();

        if (error) throw error;

        // Check permissions
        if (role !== 'admin' && quote.user_email !== user_email) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if quote is confirmed
        if (quote.status !== 'confirmed') {
            return res.status(400).json({ message: 'Quote must be confirmed before download' });
        }

        // Generate PDF HTML content
        const htmlContent = generateQuotePDF(quote);
        
        console.log('Generating PDF for quote:', id);
        
        // Convert HTML to PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        
        try {
            const page = await browser.newPage();
            
            // Set viewport for better rendering
            await page.setViewport({
                width: 1200,
                height: 1600,
                deviceScaleFactor: 1
            });
            
            // Set content with wait for fonts and styles
            await page.setContent(htmlContent, { 
                waitUntil: ['load', 'domcontentloaded']
            });
            
            // Wait a bit for styles to apply
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Generate PDF with proper settings
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: false,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });
            
            await browser.close();
            
            console.log('PDF generated successfully, size:', pdfBuffer.length);
            
            // Send PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="devis-${id.slice(0, 8)}.pdf"`);
            res.send(pdfBuffer);
        } catch (pdfError) {
            await browser.close();
            console.error('PDF generation error:', pdfError);
            throw pdfError;
        }
    } catch (error) {
        console.error('Download quote error:', error);
        res.status(500).json({ message: 'Error generating quote PDF', error: error.message });
    }
};

// Helper function to generate PDF HTML content
function generateQuotePDF(quote) {
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
        if (text == null) return 'N/A';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Devis ${escapeHtml(quote.quote_id?.slice(0, 8) || '')}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        @page {
            margin: 20mm 15mm;
        }
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: white;
            color: #000;
            line-height: 1.6;
        }
        .header { 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .header h1 {
            color: #000;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .header p {
            color: #333;
            margin: 5px 0;
        }
        .section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
        }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            color: #000;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 10px;
            padding: 5px 0;
        }
        .label { 
            font-weight: bold;
            color: #000;
        }
        .value { 
            color: #333;
        }
        .total { 
            font-size: 24px; 
            font-weight: bold; 
            color: #22c55e; 
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #22c55e;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            background: white;
        }
        th, td { 
            padding: 10px; 
            text-align: left; 
            border: 1px solid #ddd;
            background: white;
        }
        th { 
            background-color: #f3f4f6;
            color: #000;
            font-weight: bold;
        }
        td {
            color: #333;
        }
        .warning {
            color: #f59e0b;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>DEVIS D'ASSURANCE</h1>
        <p>Référence: ${escapeHtml(quote.quote_id?.slice(0, 8) || 'N/A')}</p>
        <p>Date: ${quote.quote_created_at ? new Date(quote.quote_created_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
    </div>

    <div class="section">
        <div class="section-title">Informations Client</div>
        <div class="row"><span class="label">Email:</span> <span class="value">${escapeHtml(quote.user_email || 'N/A')}</span></div>
        <div class="row"><span class="label">Secteur:</span> <span class="value">${escapeHtml(quote.sector || 'N/A')}</span></div>
    </div>

    ${quote.montant_credit ? `
    <div class="section">
        <div class="section-title">Offre de Crédit</div>
        <div class="row"><span class="label">Montant:</span> <span class="value">${quote.montant_credit?.toLocaleString() || 'N/A'} DT</span></div>
        <div class="row"><span class="label">Durée:</span> <span class="value">${escapeHtml(quote.duree || 'N/A')} mois</span></div>
        <div class="row"><span class="label">Taux d'intérêt:</span> <span class="value">${escapeHtml(quote.taux_interet || 'N/A')}%</span></div>
        <div class="row"><span class="label">Type de crédit:</span> <span class="value">${escapeHtml(quote.type_credit || 'N/A')}</span></div>
    </div>
    ` : ''}

    ${quote.facteur_risque ? `
    <div class="section">
        <div class="section-title">Analyse des Risques</div>
        <div class="row"><span class="label">Facteur de risque:</span> <span class="value">${escapeHtml(quote.facteur_risque)}</span></div>
        <table>
            <tr><th>Critère</th><th>Score</th></tr>
            <tr><td>Montant</td><td>${escapeHtml(quote.montant_score || 'N/A')}</td></tr>
            <tr><td>Taux</td><td>${escapeHtml(quote.taux_score || 'N/A')}</td></tr>
            <tr><td>Durée</td><td>${escapeHtml(quote.duree_score || 'N/A')}</td></tr>
            <tr><td>Secteur</td><td>${escapeHtml(quote.secteur_score || 'N/A')}</td></tr>
            <tr><td>Sinistres</td><td>${escapeHtml(quote.sinistres_score || 'N/A')}</td></tr>
            <tr><td>Type crédit</td><td>${escapeHtml(quote.type_credit_score || 'N/A')}</td></tr>
            <tr><td>État financier</td><td>${escapeHtml(quote.etat_financier_score || 'N/A')}</td></tr>
        </table>
    </div>
    ` : ''}

    ${quote.commission_optimale ? `
    <div class="section">
        <div class="section-title">Commission</div>
        <div class="row"><span class="label">Commission optimale:</span> <span class="value">${quote.commission_optimale}%</span></div>
        ${quote.commission_predite ? `<div class="row"><span class="label">Commission prédite (ML):</span> <span class="value">${quote.commission_predite}%</span></div>` : ''}
        ${quote.commission_predite && Math.abs(quote.commission_optimale - quote.commission_predite) > 0.01 ? `
        <div class="row warning">
            <span class="label">⚠️ Modifiée manuellement:</span> 
            <span class="value">Différence: ${(quote.commission_optimale - quote.commission_predite).toFixed(2)}%</span>
        </div>
        ` : ''}
        <div class="row"><span class="label">Montant commission:</span> <span class="value">${quote.montant_commission?.toLocaleString() || 'N/A'} DT</span></div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Montants</div>
        <div class="row"><span class="label">Montant de base:</span> <span class="value">${quote.base_amount?.toLocaleString() || '0'} DT</span></div>
        <div class="row"><span class="label">TVA (${quote.tva_rate || 19}%):</span> <span class="value">${((quote.base_amount || 0) * (quote.tva_rate || 19) / 100).toLocaleString()} DT</span></div>
        <div class="total">Total: ${quote.total_amount?.toLocaleString() || '0'} DT</div>
    </div>

    ${quote.admin_notes ? `
    <div class="section">
        <div class="section-title">Notes Administrateur</div>
        <p>${escapeHtml(quote.admin_notes)}</p>
    </div>
    ` : ''}

    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <p>Ce devis a été généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
        <p>Status: ${escapeHtml(quote.status?.toUpperCase() || 'N/A')}</p>
    </div>
</body>
</html>
    `;
    
    // For now, return HTML. In production, use a library like puppeteer or pdfkit to generate actual PDF
    return html.trim();
}
