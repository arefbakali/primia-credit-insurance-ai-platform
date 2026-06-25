# ✅ Risk Calculation Service - Test Results

## Status: **WORKING**

### Test Date
Test completed successfully

### Test Results

**Input Data**:
- Montant crédit: 60,756,000 DT
- Durée: 60 mois
- Taux intérêt: 9.39%
- Type crédit: Crédit de fonctionnement
- Secteur: BANQUES
- Nombre sinistres: 0
- Status financier: N/A

**Calculated Risk Scores** (0-10 scale):
- ✅ Montant score: 0.91
- ✅ Taux score: 4.56
- ✅ Durée score: 3.33
- ✅ Secteur score: 5.0
- ✅ Sinistres score: 0.0
- ✅ Type crédit score: 7.0
- ✅ État financier score: 5.0

**Final Risk Factor**: **3.07** (LOW RISK)

**Performance**: < 1ms

## Service Implementation

### Files Updated

1. **`backend/services/calculateRiskService.py`**
   - ✅ Adapted from `ia_model/facteur_risque.PY`
   - ✅ Uses `backend/data/` directory for CSV files
   - ✅ Can be run standalone with JSON input
   - ✅ Calculates 7 risk scores + final facteur_risque

2. **`backend/services/calculateRiskService.js`**
   - ✅ JavaScript implementation (already existed)
   - ✅ Pure JavaScript, no Python dependency
   - ✅ Fast calculation (< 1ms)

3. **`backend/data/` directory**
   - ✅ Created with required CSV files:
     - `dataset_sinistres_entreprise.csv`
     - `financial_analysis_results.csv`

4. **`backend/test_risk_service.js`**
   - ✅ Test script for validation

## Risk Calculation Formula

```
facteur_risque = 
  (montant_score × 0.20) +
  (taux_score × 0.15) +
  (duree_score × 0.15) +
  (secteur_score × 0.15) +
  (sinistres_score × 0.20) +
  (type_credit_score × 0.10) +
  (etat_financier_score × 0.05)
```

## Integration

The service is integrated into the quote generation pipeline:

```javascript
// In quoteGenerationController.js
const riskData = calculateRiskService.calculate_risk_factor(
    creditInfo,
    sector,
    nb_sinistres,
    status_financier
);
```

## Usage

### From Node.js
```javascript
const calculateRiskService = require('./services/calculateRiskService');
const result = calculateRiskService.calculate_risk_factor(
    creditData,
    secteur,
    nb_sinistres,
    status_financier
);
```

### From Python (command line)
```bash
cd backend/services
python calculateRiskService.py '{"montant_credit":50000,"taux_interet":8.5,"duree":60,"type_credit":"Crédit automobile"}' "BANQUES" 0 null
```

### Test
```bash
cd backend
node test_risk_service.js
```

## Requirements

- ✅ CSV files in `backend/data/`:
  - `dataset_sinistres_entreprise.csv`
  - `financial_analysis_results.csv`
- ✅ Python dependencies: `pandas` (if using Python version)

## Next Steps

The risk calculation service is ready for use in the complete pipeline:
1. ✅ PDF Upload
2. ✅ Credit Extraction
3. ✅ Risk Calculation (THIS STEP)
4. ⏳ Commission Optimization

