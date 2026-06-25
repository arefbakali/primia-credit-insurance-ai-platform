-- Create the 3 missing tables: companies, stock_trading_history, stock_index_history

-- ============================================================
-- 1. COMPANIES TABLE
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
-- 2. STOCK TRADING HISTORY TABLE
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
-- 3. STOCK INDEX HISTORY TABLE
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
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_user_email ON companies(user_email);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- Stock trading history indexes
CREATE INDEX IF NOT EXISTS idx_stock_trading_company ON stock_trading_history(company_name);
CREATE INDEX IF NOT EXISTS idx_stock_trading_seance ON stock_trading_history(seance);
CREATE INDEX IF NOT EXISTS idx_stock_trading_year ON stock_trading_history(year);
CREATE INDEX IF NOT EXISTS idx_stock_trading_code ON stock_trading_history(code);

-- Stock index history indexes
CREATE INDEX IF NOT EXISTS idx_stock_index_seance ON stock_index_history(seance);
CREATE INDEX IF NOT EXISTS idx_stock_index_year ON stock_index_history(year);
CREATE INDEX IF NOT EXISTS idx_stock_index_code_indice ON stock_index_history(code_indice);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================

-- Function to update updated_at timestamp (create if doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for companies table
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Missing tables created successfully!';
    RAISE NOTICE '   - companies';
    RAISE NOTICE '   - stock_trading_history';
    RAISE NOTICE '   - stock_index_history';
END $$;

