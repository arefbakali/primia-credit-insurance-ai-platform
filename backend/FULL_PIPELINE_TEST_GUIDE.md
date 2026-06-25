# 🧪 Complete Pipeline Test Guide

## Overview

This guide explains how to test the complete quote generation pipeline with database integration.

## Prerequisites

1. ✅ Backend server running on port 3000
2. ✅ Database tables created (run `sql/create_tables.sql`)
3. ✅ ML model trained (`backend/models/commission_model.joblib`)
4. ✅ Test PDF file in `backend/uploads/`
5. ✅ CSV data files in `backend/data/`

## Test Script

**File**: `test_full_pipeline_with_db.js`

This script tests the complete pipeline:
1. Uploads PDF file
2. Extracts credit info → saves to `credit_offers` table
3. Calculates risk factors → saves to `risk_factors` table
4. Optimizes commission (ML) → saves to `optimal_commissions` table
5. Updates quote → saves to `quotes` table
6. Verifies all data in database

## Running the Test

### Step 1: Ensure Backend Server is Running

```powershell
cd backend
npm start
```

The server should be running on `http://localhost:3000`

### Step 2: Run the Test

```powershell
cd backend
node test_full_pipeline_with_db.js
```

## Expected Output

The test will:
- ✅ Authenticate with test user
- ✅ Upload PDF file
- ✅ Extract credit information (using Gemini LLM)
- ✅ Calculate risk factors (7 scores + facteur_risque)
- ✅ Optimize commission (using ML model joblib)
- ✅ Save all data to database tables
- ✅ Verify data in database
- ✅ Display complete results

## Database Tables Used

### 1. `credit_offers`
Stores extracted credit information:
- `quote_id` (FK to quotes)
- `nom_fichier`
- `montant_credit`
- `duree`
- `taux_interet`
- `type_credit`

### 2. `risk_factors`
Stores calculated risk scores:
- `quote_id` (FK to quotes)
- `credit_offer_id` (FK to credit_offers)
- `facteur_risque`
- All 7 risk scores (montant, taux, duree, secteur, sinistres, type_credit, etat_financier)

### 3. `optimal_commissions`
Stores commission optimization results:
- `quote_id` (FK to quotes)
- `risk_factor_id` (FK to risk_factors)
- `commission_base`
- `commission_optimale`
- `commission_predite` (from ML model)
- `montant_commission`

### 4. `quotes`
Main quote table (updated):
- `id` (primary key)
- `user_email`
- `sector`
- `status` (updated to 'generated')
- `base_amount` (updated with commission amount)
- `total_amount` (calculated)

### 5. `quotes_complete` (VIEW)
Consolidated view joining all tables for easy querying.

## Troubleshooting

### Error: "Cannot POST /api/quotes/generate"
- **Solution**: Restart the backend server

### Error: "Status constraint violation"
- **Solution**: The code has been fixed. Restart the server to load the fix.

### Error: "Model file not found"
- **Solution**: Train the model: `cd ia_model && python train_and_save_model.py`

### Error: "Database service unavailable"
- **Solution**: Check `.env` file has correct Supabase credentials

### Error: "Authentication required"
- **Solution**: Ensure test user exists in database

## Verification

After the test completes, you can verify the data in Supabase:

1. Check `quotes` table for the new quote
2. Check `credit_offers` table for extracted credit info
3. Check `risk_factors` table for calculated risk scores
4. Check `optimal_commissions` table for commission data
5. Query `quotes_complete` view for complete data

## Next Steps

After successful test:
- ✅ All pipeline steps are working
- ✅ Data is saved to database
- ✅ ML model is being used
- ✅ Ready for frontend integration
- ✅ Ready for admin dashboard display

