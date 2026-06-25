# Backend Data Directory

This directory contains CSV data files needed for risk calculation and other services.

## Files

### `dataset_sinistres_entreprise.csv`
- Contains historical claims data for companies
- Used for calculating `sinistres_score` in risk factor calculation
- Columns: Entreprise, Historique sinistres passés, Secteur, Montant du sinistre

### `financial_analysis_results.csv`
- Contains financial analysis results for companies
- Used for determining `etat_financier_score` (win/loss status)
- Columns: company_name, net_result, revenue, margin, status

## Source

These files are copied from `ia_model/data/` directory and should be kept in sync.

## Usage

The risk calculation service (`calculateRiskService.py`) reads these files to:
1. Normalize risk scores based on historical data
2. Match company names for sinistres lookup
3. Determine financial status for risk scoring

## Updating Data

To update the data files:
1. Update files in `ia_model/data/`
2. Copy to `backend/data/`:
   ```powershell
   Copy-Item "ia_model\data\dataset_sinistres_entreprise.csv" "backend\data\" -Force
   Copy-Item "ia_model\data\financial_analysis_results.csv" "backend\data\" -Force
   ```

