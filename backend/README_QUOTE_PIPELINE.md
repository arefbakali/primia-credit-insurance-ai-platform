# Quote Generation Pipeline Documentation

## Overview

This document describes the complete quote generation pipeline that processes PDF uploads, extracts credit information, calculates risk factors, optimizes commissions, and generates insurance quotes.

## Database Schema

All SQL statements are in `sql/create_tables.sql`. Run this file in your Supabase SQL editor to create all required tables.

### Tables Created:

1. **credit_offers** - Stores extracted credit information from PDFs
2. **risk_factors** - Stores calculated risk scores and factors
3. **optimal_commissions** - Stores optimized commission rates and amounts
4. **quotes_complete** (VIEW) - Complete view joining all pipeline data

## API Endpoints

### 1. Generate Quote (Full Pipeline)
```
POST /api/quotes/generate
Content-Type: multipart/form-data

Body:
- bank_report: PDF file (required)
- description: string (optional)
- sector: string (required)

Headers:
- Authorization: Bearer <JWT_TOKEN>

Response:
{
  "message": "Quote generated successfully",
  "quote": { ... },
  "pipeline": {
    "credit_info": { ... },
    "risk_factors": { ... },
    "commission": { ... }
  }
}
```

### 2. Get All Quotes (Complete Data)
```
GET /api/quotes/complete
Headers:
- Authorization: Bearer <JWT_TOKEN>

Response: Array of complete quote objects with all pipeline data
```

### 3. Get Single Quote (Complete Data)
```
GET /api/quotes/complete/:id
Headers:
- Authorization: Bearer <JWT_TOKEN>

Response: Single complete quote object
```

## Pipeline Steps

### Step 1: Extract Credit Information
- Uses `extractCreditService.py` (Python)
- Extracts: montant_credit, duree, taux_interet, type_credit
- Saves to `credit_offers` table

### Step 2: Calculate Risk Factors
- Uses `calculateRiskService.py` (Python)
- Calculates risk scores for: montant, taux, duree, secteur, sinistres, type_credit, etat_financier
- Calculates final `facteur_risque`
- Saves to `risk_factors` table

### Step 3: Optimize Commission
- Uses `optimizeCommissionService.py` (Python)
- Calculates: commission_base, commission_optimale, montant_commission
- Saves to `optimal_commissions` table

### Step 4: Update Quote
- Updates quote with final base_amount
- Sets status to 'generated'

## Python Services Integration

The Python services are located in:
- `services/extractCreditService.py`
- `services/calculateRiskService.py`
- `services/optimizeCommissionService.py`

These are Node.js wrappers that call the original Python scripts in `ia_model/`.

## Admin Dashboard

The admin dashboard should display quotes using the `quotes_complete` view which includes:
- Quote basic info (user, sector, status, amounts)
- Credit offer data (montant, duree, taux, type)
- Risk factor scores and final facteur_risque
- Commission calculations (base, optimale, montant)

## Status Flow

1. **pending** - Quote created, waiting for processing
2. **processing** - Pipeline is running
3. **generated** - Quote generated successfully with all pipeline data
4. **confirmed** - Admin confirmed the quote
5. **updated** - Quote was updated after confirmation

## Error Handling

If any step fails:
- Error is logged
- Quote status remains as 'processing' or 'pending'
- Partial data is saved (what was successfully processed)
- Error message returned to client

## Next Steps

1. Run `sql/create_tables.sql` in Supabase
2. Install Python dependencies: `pip install -r ia_model/requirements.txt`
3. Test the `/api/quotes/generate` endpoint
4. Update frontend to use new endpoints
5. Update admin dashboard to display complete pipeline data

