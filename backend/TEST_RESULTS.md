# Model Test Results

## ✅ Model Status: WORKING

### Model Information
- **Location**: `backend/models/commission_model.joblib`
- **Type**: Gradient Boosting Regressor
- **Performance Metrics**:
  - MSE: 0.0028
  - R²: 0.665 (66.5% variance explained)
  - MAE: 0.042

### Test Results

#### Test 1: Low Risk Credit
- **Input**: facteur_risque=3.0, montant=50,000 DT, taux=5%, duree=36 mois
- **ML Model Prediction**: 0.44% commission
- **Commission Amount**: 220.00 DT
- **Status**: ✅ PASSED

#### Test 2: Medium Risk Credit
- **Input**: facteur_risque=5.5, montant=200,000 DT, taux=8%, duree=60 mois
- **ML Model Prediction**: 0.55% commission
- **Commission Amount**: 1,100.00 DT
- **Status**: ✅ PASSED

#### Test 3: High Risk Credit
- **Input**: facteur_risque=8.5, montant=1,000,000 DT, taux=12%, duree=120 mois
- **ML Model Prediction**: 0.58% commission
- **Commission Amount**: 5,800.00 DT
- **Status**: ✅ PASSED

### Model Integration
- ✅ Model loads successfully from `backend/models/`
- ✅ Python script `loadCommissionModel.py` works correctly
- ✅ Backend service `optimizeCommissionService.js` integrates properly
- ✅ Predictions are within valid range (0.3% - 4.0%)

### Next Steps
The model is ready to use in production. It will automatically be used when:
1. User uploads PDF and requests quote
2. Credit information is extracted
3. Risk factors are calculated
4. Commission is optimized (uses ML model if available)

## Running Tests

To test the model again:
```bash
cd backend
node test_model.js
```

