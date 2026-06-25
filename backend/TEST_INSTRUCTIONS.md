# 🧪 Complete Pipeline Test Instructions

## Prerequisites
1. ✅ Backend server must be running
2. ✅ Server must have the new routes loaded (restart if needed)
3. ✅ Test PDF file exists: `backend/uploads/bank_report-*.pdf`
4. ✅ ML model exists: `backend/models/commission_model.joblib`
5. ✅ Database tables created (run `backend/sql/create_tables.sql`)

## Step 1: Restart Backend Server

The server needs to be restarted to load the new `/api/quotes/generate` route.

### Quick Restart:
```powershell
cd backend
# Stop current server (Ctrl+C in the terminal running it)
# Or kill the process:
Get-Process -Id 26288 | Stop-Process -Force

# Start server
npm start
```

## Step 2: Run Pipeline Test

```powershell
cd backend
node test_complete_pipeline.js
```

## Expected Output

The test will:
1. ✅ Authenticate with test user
2. ✅ Upload PDF file
3. ✅ Extract credit information
4. ✅ Calculate risk factors
5. ✅ Optimize commission (using ML model)
6. ✅ Save all data to database
7. ✅ Retrieve complete quote

## What the Test Checks

- **Authentication**: Login with `amen@gmail.com` / `amen1920`
- **PDF Upload**: Upload existing PDF file
- **Credit Extraction**: Extract montant, duree, taux, type
- **Risk Calculation**: Calculate 7 risk scores + facteur_risque
- **Commission Optimization**: Use ML model to predict commission
- **Database Integration**: Save to credit_offers, risk_factors, optimal_commissions
- **Complete Quote**: Retrieve quote with all pipeline data

## Troubleshooting

### Error: "Cannot POST /api/quotes/generate"
- **Solution**: Restart the backend server

### Error: "Model file not found"
- **Solution**: Run `cd ia_model && python train_and_save_model.py`

### Error: "Database service unavailable"
- **Solution**: Check `.env` file has correct Supabase credentials

### Error: "Authentication required"
- **Solution**: Check that test user exists in database

