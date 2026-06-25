"""
Service to extract credit information from PDF files
Adapted from extract_credit_offers.py for backend use
"""
import os
import json
import sys
from pathlib import Path

import google.generativeai as genai
from pypdf import PdfReader
from dotenv import load_dotenv

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try root .env
    load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Gemini client
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')
else:
    model = None
    print("Warning: GEMINI_API_KEY not found in environment variables")


def extract_text_from_pdf(pdf_path):
    """Extracts text from all pages of a PDF file."""
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
    """Uses Gemini LLM to extract credit information from text."""
    if not model:
        return None
    
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
        res_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        elif "```" in res_text:
            res_text = res_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(res_text)
        result["nom_fichier"] = filename
        return result
    except json.JSONDecodeError as e:
        print(f"JSON decode error for {filename}: {e}")
        return None
    except Exception as e:
        print(f"Gemini analysis error for {filename}: {e}")
        return None


def process_pdf(pdf_path):
    """
    Process a single PDF file and extract credit information.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        dict: Extracted credit information or None if failed
    """
    if not model:
        print("Error: Gemini model not initialized. Check GEMINI_API_KEY.")
        return None
    
    filename = os.path.basename(pdf_path)
    
    # Extract text from PDF
    text = extract_text_from_pdf(pdf_path)
    if not text:
        print(f"Warning: Could not extract text from {filename}")
        return {
            "nom_fichier": filename,
            "montant_credit": None,
            "duree": None,
            "taux_interet": None,
            "type_credit": None
        }
    
    # Extract credit info using LLM
    analysis = extract_credit_info(text, filename)
    if not analysis:
        print(f"Warning: Failed to extract credit info from {filename}")
        return {
            "nom_fichier": filename,
            "montant_credit": None,
            "duree": None,
            "taux_interet": None,
            "type_credit": None
        }
    
    return analysis


# Main function for command-line usage
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extractCreditService.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    result = process_pdf(pdf_path)
    if result:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({
            "nom_fichier": os.path.basename(pdf_path),
            "montant_credit": None,
            "duree": None,
            "taux_interet": None,
            "type_credit": None
        }, ensure_ascii=False, indent=2))

