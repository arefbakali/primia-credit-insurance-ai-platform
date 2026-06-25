-- Complete Database Schema for Makina Insurance Platform
-- Run this script in Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. USERS TABLE (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. COMPANIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    sector VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_companies_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE SET NULL
);

-- ============================================================
-- 3. FINANCIAL RESULTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    net_result DECIMAL(15, 2),
    revenue DECIMAL(15, 2),
    margin DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'loss' CHECK (status IN ('win', 'loss')),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. STOCK TRADING HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_trading_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seance DATE NOT NULL,
    groupe VARCHAR(50),
    code VARCHAR(50),
    valeur VARCHAR(255),
    ouverture DECIMAL(10, 3),
    cloture DECIMAL(10, 3),
    plus_bas DECIMAL(10, 3),
    plus_haut DECIMAL(10, 3),
    quantite_negociee INTEGER,
    nb_transaction INTEGER,
    capitaux DECIMAL(15, 3),
    company_name VARCHAR(255),
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. STOCK INDEX HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_index_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seance DATE NOT NULL,
    code_indice VARCHAR(50),
    lib_indice VARCHAR(255),
    indice_jour DECIMAL(10, 3),
    indice_veille DECIMAL(10, 3),
    variation_veille DECIMAL(10, 3),
    indice_plus_haut DECIMAL(10, 3),
    indice_plus_bas DECIMAL(10, 3),
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. QUOTES TABLE (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    sector VARCHAR(255),
    bank_report_path TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'confirmed', 'updated')),
    base_amount DECIMAL(10, 2) DEFAULT 0,
    tva_rate DECIMAL(5, 2) DEFAULT 19,
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (base_amount * (1 + tva_rate / 100)) STORED,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_quotes_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_user_email ON companies(user_email);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- Financial results indexes
CREATE INDEX IF NOT EXISTS idx_financial_results_company ON financial_results(company_name);
CREATE INDEX IF NOT EXISTS idx_financial_results_status ON financial_results(status);
CREATE INDEX IF NOT EXISTS idx_financial_results_processed_at ON financial_results(processed_at);

-- Stock trading history indexes
CREATE INDEX IF NOT EXISTS idx_stock_trading_company ON stock_trading_history(company_name);
CREATE INDEX IF NOT EXISTS idx_stock_trading_seance ON stock_trading_history(seance);
CREATE INDEX IF NOT EXISTS idx_stock_trading_year ON stock_trading_history(year);
CREATE INDEX IF NOT EXISTS idx_stock_trading_code ON stock_trading_history(code);

-- Stock index history indexes
CREATE INDEX IF NOT EXISTS idx_stock_index_seance ON stock_index_history(seance);
CREATE INDEX IF NOT EXISTS idx_stock_index_year ON stock_index_history(year);
CREATE INDEX IF NOT EXISTS idx_stock_index_code_indice ON stock_index_history(code_indice);

-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_user_email ON quotes(user_email);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_sector ON quotes(sector);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for companies table
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for quotes table
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================
COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON TABLE companies IS 'Company/Enterprise records linked to users';
COMMENT ON TABLE financial_results IS 'AI-analyzed financial data from PDF reports';
COMMENT ON TABLE stock_trading_history IS 'Historical stock trading data';
COMMENT ON TABLE stock_index_history IS 'Historical stock index data';
COMMENT ON TABLE quotes IS 'Insurance quote requests and processing status';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All tables, indexes, and triggers created successfully!';
END $$;

