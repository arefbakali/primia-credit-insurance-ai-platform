# Database Setup Instructions

## Prerequisites

Before running the import script, you need to create the necessary tables in your Supabase database.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `createTables.sql`
4. Execute the SQL script
5. Verify that all tables are created in the **Table Editor**

## Option 2: Manual Table Creation

Create the following tables in Supabase:

### 1. Users Table (usually already exists)
```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Companies Table
```sql
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255) REFERENCES users(email),
    sector VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Financial Results Table (usually already exists)
```sql
CREATE TABLE IF NOT EXISTS financial_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    net_result DECIMAL(15, 2),
    revenue DECIMAL(15, 2),
    margin DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'loss',
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Stock Trading History Table
```sql
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
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Quotes Table (usually already exists)
```sql
CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    sector VARCHAR(255),
    bank_report_path TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    base_amount DECIMAL(10, 2) DEFAULT 0,
    tva_rate DECIMAL(5, 2) DEFAULT 19,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Important Notes

1. **Foreign Key Constraints**: The SQL script includes foreign keys. If your existing tables have data that doesn't match, you may need to:
   - Remove the foreign key constraints temporarily
   - Or ensure data integrity before adding constraints

2. **Companies Table**: This is a new table that links companies to users. Make sure to create it before running the import.

3. **Indexes**: The script creates indexes for better query performance. You can add them later if needed.

## After Creating Tables

Once tables are created, run the import script:

```bash
cd backend
npm run import:all
```

This will:
- Create users for each enterprise
- Link companies to users
- Import financial data
- Import stock trading history (optional)

