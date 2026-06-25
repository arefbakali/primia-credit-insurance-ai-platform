# Linking All Data to Companies

## Overview

This script (`linkAllCompanyData.js`) creates company records and links all existing data in the database to companies.

## What It Does

1. **Creates Company Records**: 
   - Reads all unique company names from `financial_results` table
   - Creates records in `companies` table for each company

2. **Links Users to Companies**:
   - Matches users by `name` field to company names
   - Links via `user_email` field in companies table

3. **Links Financial Data**:
   - Financial results are already linked via `company_name` field
   - Verifies all financial data is properly linked

4. **Links Stock Trading History**:
   - Stock trading history is linked via `company_name` field
   - Verifies the relationship exists

## How to Run

```bash
cd backend
npm run link:data
```

Or directly:
```bash
node scripts/linkAllCompanyData.js
```

## Prerequisites

- Tables must exist (run `createMissingTables.sql` first)
- Users should already be created (run `npm run import:all` first)
- Financial data should exist in `financial_results` table

## Relationships Created

```
users (email) ────< companies (user_email)
companies (company_name) ────< financial_results (company_name)
companies (company_name) ────< stock_trading_history (company_name)
```

## After Running

The script will:
- Create company records for all companies in financial_results
- Link user emails to companies
- Verify all data relationships

You can verify by checking the `companies` table in Supabase Dashboard.

