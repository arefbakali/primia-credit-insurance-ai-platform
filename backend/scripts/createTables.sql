-- Create all necessary tables for Makina Insurance Platform

-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Companies/Enterprises table to store company information
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255) REFERENCES users(email),
    sector VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial results table
CREATE TABLE IF NOT EXISTS financial_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    net_result DECIMAL(15, 2),
    revenue DECIMAL(15, 2),
    margin DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'loss',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Note: Foreign key to companies can be added later if needed
);

-- Stock trading history table (from histo_cotation files)
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
    -- Note: Foreign key to companies can be added later if needed
);

-- Stock index history table (from histo_indice files)
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

-- Quotes table (already exists, but adding for reference)
CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    sector VARCHAR(255),
    bank_report_path TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    base_amount DECIMAL(10, 2) DEFAULT 0,
    tva_rate DECIMAL(5, 2) DEFAULT 19,
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (base_amount * (1 + tva_rate / 100)) STORED,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Note: Foreign key constraint can be added: FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_user_email ON companies(user_email);
CREATE INDEX IF NOT EXISTS idx_financial_results_company ON financial_results(company_name);
CREATE INDEX IF NOT EXISTS idx_stock_trading_company ON stock_trading_history(company_name);
CREATE INDEX IF NOT EXISTS idx_stock_trading_seance ON stock_trading_history(seance);
CREATE INDEX IF NOT EXISTS idx_stock_index_seance ON stock_index_history(seance);
CREATE INDEX IF NOT EXISTS idx_quotes_user_email ON quotes(user_email);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

