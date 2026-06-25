-- =====================================================
-- MAKINA INSURANCE PLATFORM - DATABASE SCHEMA
-- =====================================================
-- This file contains all SQL statements to create the database tables
-- Run this in your Supabase SQL editor or PostgreSQL database

-- =====================================================
-- 1. USERS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. QUOTES TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    sector VARCHAR(255),
    bank_report_path TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    base_amount DECIMAL(15, 2) DEFAULT 0,
    tva_rate DECIMAL(5, 2) DEFAULT 19,
    total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (base_amount * (1 + tva_rate / 100)) STORED,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 3. CREDIT_OFFERS TABLE (from extract_credit_offers.py)
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    nom_fichier VARCHAR(255) NOT NULL,
    montant_credit DECIMAL(15, 2),
    duree DECIMAL(10, 2), -- in months
    taux_interet DECIMAL(5, 2),
    type_credit VARCHAR(255),
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. RISK_FACTORS TABLE (from facteur_risque.PY)
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    credit_offer_id UUID REFERENCES credit_offers(id) ON DELETE CASCADE,
    entreprise VARCHAR(255),
    secteur VARCHAR(255),
    nb_sinistres INTEGER DEFAULT 0,
    montant_sinistres DECIMAL(15, 2) DEFAULT 0,
    status_financier VARCHAR(50), -- 'win' or 'loss'
    
    -- Risk scores (0-10)
    montant_score DECIMAL(5, 2),
    taux_score DECIMAL(5, 2),
    duree_score DECIMAL(5, 2),
    secteur_score DECIMAL(5, 2),
    sinistres_score DECIMAL(5, 2),
    type_credit_score DECIMAL(5, 2),
    etat_financier_score DECIMAL(5, 2),
    
    -- Final risk factor
    facteur_risque DECIMAL(5, 2) NOT NULL,
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. OPTIMAL_COMMISSIONS TABLE (from optimisation_prime.py)
-- =====================================================
CREATE TABLE IF NOT EXISTS optimal_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    risk_factor_id UUID REFERENCES risk_factors(id) ON DELETE CASCADE,
    
    -- Commission calculations
    commission_base DECIMAL(5, 2) NOT NULL, -- Base commission rate (%)
    commission_optimale DECIMAL(5, 2) NOT NULL, -- Optimal commission rate (%)
    montant_commission DECIMAL(15, 2) NOT NULL, -- Commission amount in DT
    fonction_objectif DECIMAL(10, 4), -- Objective function value
    commission_predite DECIMAL(5, 2), -- Predicted commission (from ML model)
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. FINANCIAL_RESULTS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    net_result DECIMAL(15, 2),
    revenue DECIMAL(15, 2),
    margin DECIMAL(5, 2),
    status VARCHAR(50) NOT NULL, -- 'win' or 'loss'
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_user_email ON quotes(user_email);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

-- Credit offers indexes
CREATE INDEX IF NOT EXISTS idx_credit_offers_quote_id ON credit_offers(quote_id);
CREATE INDEX IF NOT EXISTS idx_credit_offers_nom_fichier ON credit_offers(nom_fichier);

-- Risk factors indexes
CREATE INDEX IF NOT EXISTS idx_risk_factors_quote_id ON risk_factors(quote_id);
CREATE INDEX IF NOT EXISTS idx_risk_factors_credit_offer_id ON risk_factors(credit_offer_id);
CREATE INDEX IF NOT EXISTS idx_risk_factors_facteur_risque ON risk_factors(facteur_risque);

-- Optimal commissions indexes
CREATE INDEX IF NOT EXISTS idx_optimal_commissions_quote_id ON optimal_commissions(quote_id);
CREATE INDEX IF NOT EXISTS idx_optimal_commissions_risk_factor_id ON optimal_commissions(risk_factor_id);

-- Financial results indexes
CREATE INDEX IF NOT EXISTS idx_financial_results_company_name ON financial_results(company_name);
CREATE INDEX IF NOT EXISTS idx_financial_results_status ON financial_results(status);

-- =====================================================
-- 8. CREATE VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Complete quote information with all pipeline data
CREATE OR REPLACE VIEW quotes_complete AS
SELECT 
    q.id AS quote_id,
    q.user_email,
    q.description,
    q.sector,
    q.bank_report_path,
    q.status,
    q.base_amount,
    q.tva_rate,
    q.total_amount,
    q.admin_notes,
    q.created_at AS quote_created_at,
    q.updated_at AS quote_updated_at,
    
    -- Credit offer data
    co.id AS credit_offer_id,
    co.nom_fichier,
    co.montant_credit,
    co.duree,
    co.taux_interet,
    co.type_credit,
    co.extracted_at AS credit_extracted_at,
    
    -- Risk factor data
    rf.id AS risk_factor_id,
    rf.entreprise,
    rf.secteur AS secteur_risque,
    rf.nb_sinistres,
    rf.montant_sinistres,
    rf.status_financier,
    rf.montant_score,
    rf.taux_score,
    rf.duree_score,
    rf.secteur_score,
    rf.sinistres_score,
    rf.type_credit_score,
    rf.etat_financier_score,
    rf.facteur_risque,
    rf.calculated_at AS risk_calculated_at,
    
    -- Commission data
    oc.id AS commission_id,
    oc.commission_base,
    oc.commission_optimale,
    oc.montant_commission,
    oc.fonction_objectif,
    oc.commission_predite,
    oc.calculated_at AS commission_calculated_at
    
FROM quotes q
LEFT JOIN credit_offers co ON q.id = co.quote_id
LEFT JOIN risk_factors rf ON q.id = rf.quote_id
LEFT JOIN optimal_commissions oc ON q.id = oc.quote_id;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE credit_offers IS 'Stores extracted credit information from PDF documents';
COMMENT ON TABLE risk_factors IS 'Stores calculated risk factors and scores for quotes';
COMMENT ON TABLE optimal_commissions IS 'Stores optimized commission rates and amounts for quotes';
COMMENT ON VIEW quotes_complete IS 'Complete view of quotes with all pipeline data (credit offers, risk factors, commissions)';

