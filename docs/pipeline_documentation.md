# 📋 Complete Quote Generation Pipeline Documentation

## 🎯 Overview

The complete quote generation pipeline processes a bank report PDF through multiple stages to generate an insurance quote with optimized commission.

## 🔄 Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUOTE GENERATION PIPELINE                     │
└─────────────────────────────────────────────────────────────────┘

1. PDF UPLOAD
   │
   ├─> User uploads bank_report PDF file
   ├─> File saved to: backend/uploads/
   └─> Quote record created in database (status: 'processing')

2. CREDIT EXTRACTION (extractCreditService)
   │
   ├─> Extract text from PDF using pypdf
   ├─> Use Gemini LLM to extract structured data:
   │   ├─> montant_credit (amount)
   │   ├─> duree (duration in months)
   │   ├─> taux_interet (interest rate %)
   │   └─> type_credit (credit type)
   ├─> Save to: credit_offers table
   └─> Returns: creditInfo object

3. RISK CALCULATION (calculateRiskService)
   │
   ├─> Calculate 7 risk scores:
   │   ├─> montant_score (based on credit amount)
   │   ├─> taux_score (based on interest rate)
   │   ├─> duree_score (based on duration)
   │   ├─> secteur_score (based on sector)
   │   ├─> sinistres_score (based on claims history)
   │   ├─> type_credit_score (based on credit type)
   │   └─> etat_financier_score (based on financial status)
   ├─> Calculate final: facteur_risque (weighted average)
   ├─> Save to: risk_factors table
   └─> Returns: riskData object

4. COMMISSION OPTIMIZATION (optimizeCommissionService)
   │
   ├─> Load ML model: backend/models/commission_model.joblib
   ├─> If model exists:
   │   ├─> Predict commission using Gradient Boosting Regressor
   │   └─> commission_predite = ML prediction
   ├─> Calculate optimization:
   │   ├─> commission_base (base commission %)
   │   ├─> commission_optimale (optimized commission %)
   │   └─> montant_commission (commission amount in DT)
   ├─> Save to: optimal_commissions table
   └─> Returns: commissionData object

5. QUOTE FINALIZATION
   │
   ├─> Update quote record:
   │   ├─> base_amount = montant_commission
   │   ├─> status = 'generated'
   │   └─> updated_at = current timestamp
   └─> Return complete quote with all pipeline data

```

## 📊 Database Schema

### Tables Created

1. **credit_offers**
   - Stores extracted credit information from PDFs
   - Fields: quote_id, nom_fichier, montant_credit, duree, taux_interet, type_credit

2. **risk_factors**
   - Stores calculated risk scores and final risk factor
   - Fields: quote_id, credit_offer_id, facteur_risque, all 7 risk scores

3. **optimal_commissions**
   - Stores commission optimization results
   - Fields: quote_id, risk_factor_id, commission_base, commission_optimale, montant_commission, commission_predite

4. **quotes_complete** (VIEW)
   - Consolidated view joining all tables
   - Provides complete quote data in one query

## 🔌 API Endpoints

### 1. Generate Quote (Full Pipeline)
```
POST /api/quotes/generate
Headers:
  Authorization: Bearer <token>
  Content-Type: multipart/form-data

Body (form-data):
  - bank_report: <PDF file>
  - sector: <string> (e.g., "BANQUES", "INDUSTRIE")
  - description: <string> (optional)

Response:
{
  "message": "Quote generated successfully",
  "quote": { ... complete quote data ... },
  "pipeline": {
    "credit_info": { ... },
    "risk_factors": { ... },
    "commission": { ... }
  }
}
```

### 2. Get All Complete Quotes
```
GET /api/quotes/complete
Headers:
  Authorization: Bearer <token>

Response:
[
  {
    "quote_id": 1,
    "user_email": "user@example.com",
    "sector": "BANQUES",
    "status": "generated",
    "montant_credit": 500000,
    "facteur_risque": 5.2,
    "commission_optimale": 0.55,
    "montant_commission": 2750,
    ...
  },
  ...
]
```

### 3. Get Single Complete Quote
```
GET /api/quotes/complete/:id
Headers:
  Authorization: Bearer <token>

Response:
{
  "quote_id": 1,
  "user_email": "user@example.com",
  ... complete quote data ...
}
```

## 🧪 Testing

### Test Script
```bash
cd backend
node test_complete_pipeline.js
```

This script tests:
- ✅ Authentication
- ✅ PDF upload
- ✅ Credit extraction
- ✅ Risk calculation
- ✅ Commission optimization
- ✅ Database integration
- ✅ Complete quote retrieval

## 📁 File Structure

```
backend/
├── controllers/
│   └── quoteGenerationController.js    # Main pipeline controller
├── services/
│   ├── extractCreditService.js         # Node.js wrapper
│   ├── extractCreditService.py         # Python: PDF extraction + Gemini
│   ├── calculateRiskService.js         # Node.js wrapper
│   ├── calculateRiskService.py         # Python: Risk calculation
│   ├── optimizeCommissionService.js   # Node.js wrapper
│   ├── optimizeCommissionService.py   # Python: Commission optimization
│   └── loadCommissionModel.py         # Python: ML model loader
├── models/
│   ├── commission_model.joblib         # Trained ML model
│   └── model_metadata.json            # Model metadata
├── routes/
│   └── quoteRoutes.js                  # API routes
└── test_complete_pipeline.js           # End-to-end test
```

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: Required for PDF text extraction
- `SUPABASE_URL`: Database connection
- `SUPABASE_KEY`: Database authentication
- `JWT_SECRET`: JWT token signing

### Python Dependencies
See `ia_model/requirements.txt`:
- pandas, numpy
- scikit-learn, joblib
- pypdf
- google-generativeai (Gemini)

## 🚀 Usage Example

```javascript
// Frontend example
const formData = new FormData();
formData.append('bank_report', pdfFile);
formData.append('sector', 'BANQUES');
formData.append('description', 'Credit analysis');

const response = await fetch('/api/quotes/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Quote ID:', result.quote.quote_id);
console.log('Risk Factor:', result.pipeline.risk_factors.facteur_risque);
console.log('Commission:', result.pipeline.commission.commission_optimale);
```

## 📈 ML Model Details

- **Model Type**: Gradient Boosting Regressor
- **Performance**:
  - MSE: 0.0028
  - R²: 0.665 (66.5% variance explained)
  - MAE: 0.042
- **Input Features**:
  - facteur_risque
  - montant_credit
  - taux_interet
  - duree
- **Output**: commission_predite (predicted commission %)

## ⚠️ Error Handling

The pipeline includes error handling at each step:
- If PDF extraction fails → uses default values
- If risk calculation fails → returns 500 error
- If commission optimization fails → returns 500 error
- If ML model not found → falls back to optimization function

## 🔐 Security

- All endpoints require authentication (JWT token)
- Admin-only endpoints protected with `requireAdmin` middleware
- File uploads limited to 10MB
- User can only access their own quotes (unless admin)

