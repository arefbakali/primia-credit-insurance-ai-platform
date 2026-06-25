import os
import glob
import json
import time
import pandas as pd
import google.generativeai as genai
from pypdf import PdfReader
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PDF_FOLDER = os.path.join("data", "offre_banque")
OUTPUT_CSV = os.path.join("data", "offres_credit_extracted.csv")

# Initialize Gemini client
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')
else:
    print("Warning: GEMINI_API_KEY not found in .env file")

def extract_text_from_pdf(pdf_path):
    """
    Extracts text from all pages of a PDF file.
    """
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return None

def extract_credit_info(text, filename):
    """
    Uses Gemini LLM to extract credit information from text.
    """
    prompt = f"""
You are a credit information extraction system for bank offers.

Analyze the provided document text and extract credit-related information. Return ONLY valid JSON (no markdown, no explanations).

========================================
OUTPUT FORMAT
========================================
{{
  "nom_fichier": string,
  "montant_credit": number | null,
  "duree": number | null,
  "taux_interet": number | null,
  "type_credit": string | null
}}

========================================
EXTRACTION RULES
========================================

1. MONTANT_CREDIT
   Extract the credit amount. Look for:
   - "Montant", "Montant du crédit", "Montant du prêt"
   - "Capital", "Capital emprunté"
   - Numbers followed by "DT", "TND", "Dinars"
   - Convert KDT or MD → multiply by 1,000
   - Return as number (float), null if not found

2. DUREE
   Extract the loan duration/term. Look for:
   - "Durée", "Durée du crédit", "Durée du prêt"
   - "Période", "Échéance"
   - Numbers followed by "mois", "ans", "années", "année"
   - If in months, keep as is
   - If in years, convert to months (multiply by 12)
   - Return as number (float) representing months, null if not found

3. TAUX_INTERET
   Extract the interest rate. Look for:
   - "Taux d'intérêt", "Taux", "Taux annuel"
   - "TAEG", "TEG", "Taux effectif"
   - Numbers followed by "%"
   - Return as number (float) without % symbol, null if not found

4. TYPE_CREDIT
   Extract the type of credit. Look for:
   - "Crédit à la consommation"
   - "Crédit immobilier"
   - "Crédit automobile", "Crédit auto"
   - "Crédit personnel"
   - "Leasing", "Location-financement"
   - "Crédit professionnel", "Crédit entreprise"
   - Or any other specific credit type mentioned
   - Return as string, null if not found

========================================
IMPORTANT RULES
========================================
- Extract ONLY the most relevant/main credit offer if multiple offers exist
- Use ONLY numbers and text found in the document
- DO NOT guess or estimate
- DO NOT round numbers unnecessarily
- If information is not clearly stated, return null
- Convert all monetary units to base units (DT, not KDT)
- Convert all durations to months

========================================
EXAMPLE
========================================

Text: "Offre de crédit: Montant 50 000 DT, Durée 60 mois, Taux 8.5%, Type: Crédit automobile"
Output: {{ "nom_fichier": "example.pdf", "montant_credit": 50000.0, "duree": 60.0, "taux_interet": 8.5, "type_credit": "Crédit automobile" }}

========================================

Document text (first 40000 characters):
{text[:40000]}

JSON Output:
"""
    
    try:
        response = model.generate_content(prompt)
        # Parse JSON from response
        res_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        elif "```" in res_text:
            res_text = res_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(res_text)
        # Always use the actual filename
        result["nom_fichier"] = filename
        return result
    except json.JSONDecodeError as e:
        print(f"JSON decode error for {filename}: {e}")
        print(f"Response text: {res_text[:500]}")
        return None
    except Exception as e:
        print(f"Gemini analysis error for {filename}: {e}")
        return None

def main():
    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY not found in .env file.")
        print("Please add GEMINI_API_KEY to your .env file.")
        return

    if not os.path.exists(PDF_FOLDER):
        print(f"Error: Folder not found: {PDF_FOLDER}")
        return

    pdf_files = glob.glob(os.path.join(PDF_FOLDER, "*.pdf"))
    print(f"Found {len(pdf_files)} PDF files to process.")

    if len(pdf_files) == 0:
        print("No PDF files found in the folder.")
        return

    results = []

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"\nProcessing {filename}...")
        
        # Extract text from PDF
        text = extract_text_from_pdf(pdf_path)
        if not text:
            print(f"  [WARNING] Could not extract text from {filename}")
            # Add empty result
            results.append({
                "nom_fichier": filename,
                "montant_credit": None,
                "duree": None,
                "taux_interet": None,
                "type_credit": None
            })
            continue
        
        print(f"  [OK] Extracted {len(text)} characters from PDF")
        
        # Extract credit info using LLM
        analysis = extract_credit_info(text, filename)
        if analysis:
            print(f"  [OK] Extracted data: {analysis}")
            results.append(analysis)
        else:
            print(f"  [WARNING] Failed to extract credit info from {filename}")
            # Add empty result
            results.append({
                "nom_fichier": filename,
                "montant_credit": None,
                "duree": None,
                "taux_interet": None,
                "type_credit": None
            })
        
        # Avoid rate limits
        time.sleep(2)

    # Save results to CSV
    if results:
        df = pd.DataFrame(results)
        
        # Ensure output directory exists
        os.makedirs("data", exist_ok=True)
        
        # Save to CSV
        df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
        print(f"\n{'='*60}")
        print(f"[SUCCESS] Successfully processed {len(results)} files")
        print(f"[SUCCESS] Results saved to: {OUTPUT_CSV}")
        print(f"{'='*60}")
        
        # Display summary
        print("\nSummary:")
        print(df.to_string())
    else:
        print("No results to save.")

if __name__ == "__main__":
    main()
