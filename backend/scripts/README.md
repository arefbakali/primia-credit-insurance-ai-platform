# Data Import Scripts

This directory contains scripts to import company data from CSV/XLSX files into the Supabase database.

## Quick Start

### 1. Setup Database Tables

First, create the necessary tables in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `createTables.sql`
4. Execute the SQL script

Or follow the instructions in `setupDatabase.md`

### 2. Run Import Script

```bash
cd backend
npm run import:all
```

This will:
- ✅ Create users for every enterprise with email and password (role: 'user')
- ✅ Link companies to users
- ✅ Import financial data from CSV
- ✅ Import stock trading history (optional)

## Scripts Overview

### importAllData.js

**Main comprehensive import script** that imports all data and creates users.

**What it does:**
1. Reads `financial_analysis_results.csv`
2. Creates user account for each company:
   - Email: `normalized-company-name@makina.tn`
   - Password: Auto-generated (12 characters)
   - Name: Company name
   - Role: `user` (default)
3. Creates company records in `companies` table
4. Stores financial data in `financial_results` table
5. Imports stock trading history from `histo_cotation_*.csv` files

**Usage:**
```bash
npm run import:all
```

**Output:**
- User accounts in `users` table
- Company records in `companies` table
- Financial data in `financial_results` table
- Stock trading history in `stock_trading_history` table
- Credentials file: `company_credentials.json` (in project root)

---

### importCompanyData.js

**Simplified script** for importing only company financial data and users (without stock history).

**Usage:**
```bash
npm run import:companies
```

---

## Database Schema

### Tables Created

1. **users** - User accounts
   - email (unique)
   - password
   - name
   - role (default: 'user')

2. **companies** - Company/Enterprise records
   - company_name (unique)
   - user_email (links to users.email)
   - sector
   - description

3. **financial_results** - Financial analysis data
   - company_name
   - net_result
   - revenue
   - margin
   - status (win/loss)

4. **stock_trading_history** - Stock trading data
   - seance (date)
   - valeur (company code)
   - company_name
   - Trading data (ouverture, cloture, etc.)

5. **quotes** - Insurance quote requests (already exists)

---

## Email Format

Company names are normalized for email addresses:
- Special characters removed
- Accents removed
- Spaces converted to dots
- Converted to lowercase

**Examples:**
- "SOCIETE TUNISIENNE DE BANQUE" → `societe.tunisienne.de.banque@makina.tn`
- "BH ASSURANCE" → `bh.assurance@makina.tn`
- "AIR LIQUIDE TUNISIE" → `air.liquide.tunisie@makina.tn`

---

## Credentials File

After import, a `company_credentials.json` file is created with all new user credentials:

```json
[
  {
    "company": "SOCIETE TUNISIENNE DE BANQUE",
    "email": "societe.tunisienne.de.banque@makina.tn",
    "password": "Abc123!@#XYZ"
  },
  ...
]
```

⚠️ **IMPORTANT**: 
- Keep this file secure!
- Share passwords with companies securely
- File is automatically added to `.gitignore`

---

## Requirements

- Node.js environment
- `.env` file in `backend/` directory with:
  ```
  SUPABASE_URL=your_supabase_url
  SUPABASE_KEY=your_supabase_service_role_key
  ```
- CSV files in `ia_model/data/`:
  - `financial_analysis_results.csv` (required)
  - `histo_cotation_*.csv` (optional)

---

## Troubleshooting

### Error: Table doesn't exist
- Make sure you've run the SQL script from `createTables.sql` in Supabase Dashboard

### Error: Foreign key constraint
- The script handles missing `companies` table gracefully
- If you get FK errors, check that data exists before adding constraints

### Error: Duplicate email
- Script checks for existing users and skips them
- Existing users won't get new passwords

### Import is slow
- Normal for large datasets
- Script includes delays to avoid rate limiting
- Progress is shown in console

---

## Notes

- Users are created with role `user` by default
- Passwords are randomly generated (12 characters)
- Financial data is upserted (updated if exists, inserted if new)
- Stock trading history import is optional (files may not exist)
- Company names link users to financial data
