# Complete CSV Data Import Guide

## Overview

The `importAllCSVData.js` script imports **ALL** CSV data files into the database and links everything to companies and users.

## What Gets Imported

### 1. Financial Data
- **File**: `financial_analysis_results.csv`
- **Table**: `financial_results`
- **Links**: via `company_name` field

### 2. Company Links
- **File**: `cmf.csv`
- **Table**: `companies.description` field
- **Content**: CMF URLs for each company

### 3. Stock Trading History
- **Files**: 
  - `histo_cotation_2022.csv`
  - `histo_cotation_2023.csv`
  - `histo_cotation_2024.csv`
- **Table**: `stock_trading_history`
- **Format**: Semicolon-delimited CSV
- **Links**: via `company_name` field (using `valeur` column as identifier)

### 4. Stock Index History
- **Files**:
  - `histo_indice_2022.csv`
  - `histo_indice_2023.csv`
  - `histo_indice_2024.csv`
- **Table**: `stock_index_history`
- **Format**: Semicolon-delimited CSV

### 5. Users and Companies
- Creates a user account for each company
- Creates company records linking users to companies
- Links all data via `company_name`

## Prerequisites

1. **Create all tables first**:
   ```bash
   # In Supabase Dashboard > SQL Editor, run:
   backend/scripts/createMissingTables.sql
   ```

2. **Environment variables**:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

## How to Run

```bash
cd backend
npm run import:csv
```

Or directly:
```bash
node scripts/importAllCSVData.js
```

## Import Process

The script follows these steps:

1. **STEP 1**: Read financial data and create users/companies
   - Reads `financial_analysis_results.csv`
   - Creates user account for each company (email: `company-name@makina.tn`)
   - Creates company record linking user email to company

2. **STEP 2**: Import financial data
   - Inserts/updates all financial results
   - Links to companies via `company_name`

3. **STEP 3**: Import CMF links
   - Updates company descriptions with CMF URLs

4. **STEP 4**: Import stock trading history
   - Processes all `histo_cotation_*.csv` files
   - Handles semicolon delimiters
   - Imports in batches of 500 records
   - Links via `company_name` (using `valeur` field)

5. **STEP 5**: Import stock index history
   - Processes all `histo_indice_*.csv` files
   - Handles semicolon delimiters
   - Imports in batches of 500 records

## Output Files

- **`company_credentials.json`**: Contains all created user credentials
  ```json
  [
    {
      "company": "BIAT",
      "email": "biat@makina.tn",
      "password": "generated-password"
    }
  ]
  ```

## Data Relationships

```
users (email, name, role)
  └───< companies (user_email, company_name)
          ├───< financial_results (company_name)
          └───< stock_trading_history (company_name from valeur)
```

## Notes

### Stock Trading History Linking

The `valeur` column in stock trading files contains company codes/identifiers like:
- "BIAT"
- "ATTIJARI BANK"
- "SFBT"
- etc.

These are stored in `stock_trading_history.company_name` field. For better matching, you may want to create a mapping table later that links these codes to full company names.

### File Formats

- **Comma-delimited**: `financial_analysis_results.csv`, `cmf.csv`
- **Semicolon-delimited**: `histo_cotation_*.csv`, `histo_indice_*.csv`

The script automatically handles both formats.

### Performance

- Large files (100k+ records) are processed in batches of 500
- Progress indicators show processing status
- Total import time depends on file sizes (can take several minutes)

## Troubleshooting

### "Table doesn't exist"
- Run `createMissingTables.sql` in Supabase Dashboard first

### "File not found"
- Ensure CSV files are in `ia_model/data/` directory
- Check file names match expected patterns

### Import errors
- Check Supabase credentials in `.env`
- Verify table structure matches schema
- Check CSV file encoding (should be UTF-8)

### Missing data links
- Run `npm run link:data` after import to verify all links
- Check `company_name` values match between tables

## Verification

After import, verify data:

1. **Check users**:
   ```sql
   SELECT COUNT(*) FROM users WHERE role = 'user';
   ```

2. **Check companies**:
   ```sql
   SELECT COUNT(*) FROM companies;
   ```

3. **Check financial data**:
   ```sql
   SELECT COUNT(*) FROM financial_results;
   ```

4. **Check stock trading**:
   ```sql
   SELECT COUNT(*) FROM stock_trading_history;
   ```

5. **Check stock indices**:
   ```sql
   SELECT COUNT(*) FROM stock_index_history;
   ```

## Next Steps

After importing all data:

1. Verify all relationships are correct
2. Run linking script if needed: `npm run link:data`
3. Review `company_credentials.json` for user access
4. Update stock trading history company_name mapping if needed (valeur codes to full names)

