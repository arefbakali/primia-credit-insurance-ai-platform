import os
import glob
import json
import time
import google.generativeai as genai
from pypdf import PdfReader
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Service role key recommended
PDF_FOLDER = os.path.join("data", "pdfs")

# Initialize Clients
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

def analyze_financial_data(text, filename):
    """
    Uses Gemini to extract financial info from text.
    """
    prompt = f"""
You are a financial information extraction system.

Analyze the provided financial report text and return ONLY valid JSON (no markdown, no explanations).

========================================
OUTPUT FORMAT
========================================
{{{{
  "company_name": string,
  "net_result": number | null,
  "revenue": number | null,
  "margin": number | null,
  "status": "win" | "loss"
}}}}

All numbers must be float (e.g., 1234.0, -5678.0)

========================================
EXTRACTION RULES
========================================

1. COMPANY NAME
   Extract exact company name from the document.

2. REVENUE
   Look for (most recent period only):
   - "Chiffre d'affaires"
   - "Revenus" or "Total des revenus"
   - "Total produits d'exploitation"
   
   Units: KDT or MD → multiply by 1,000
          DT → keep as is

3. MARGIN
   Extract only if explicitly stated as percentage.
   Return number without % symbol.
   If not found → null

4. NET_RESULT
   Priority 1 - Direct extraction:
   - "Résultat net"
   - "Résultat net de l'exercice"
   - "Perte nette"
   - "Perte de l'exercice"
   - "Résultat de l'exercice"
   
   Priority 2 - Calculate only if components exist in same statement:
   - net_result = "Résultat avant impôt" - "Impôt"
   OR
   - net_result = "Total des produits" - "Total des charges"
   
   If not found → null

5. NEGATIVE VALUES
   Value is NEGATIVE if:
   - In parentheses: (1234) or ( 1234 )
   - Has minus: -1234 or −1234 or ‐1234
   - Keywords: "Perte", "Déficit", "Résultat déficitaire", "Résultat négatif"

========================================
STATUS LOGIC (CRITICAL)
========================================

Step 1: If net_result exists
   → net_result > 0  = "win"
   → net_result <= 0 = "loss"

Step 2: If net_result is null, scan ENTIRE document for keywords

   LOSS KEYWORDS (if ANY found → "loss"):
   - Perte
   - Déficit
   - Résultat déficitaire
   - Résultat négatif
   - Capitaux propres négatifs
   - Fonds de roulement négatif
   - Situation financière difficile
   - Difficulté de paiement
   - Incertitude significative
   - Continuité d'exploitation (when mentioned with problems)
   - Trésorerie négative
   - Passif supérieur
   - Numbers in parentheses () in result sections

   WIN KEYWORDS (only if NO loss keywords):
   - Bénéfice
   - Profit
   - Résultat positif
   - Dividende
   - Croissance
   - Amélioration
   - Performance positive
   - Hausse
   - Augmentation (of profits/results)

Step 3: Default logic
   → If revenue > 0 AND no loss keywords → "win"
   → If any loss keyword found → "loss"
   → If no data at all → "loss"

========================================
IMPORTANT RULES
========================================
- Use ONLY most recent period
- DO NOT mix periods
- DO NOT guess or estimate
- DO NOT round numbers
- When uncertain → prefer "loss" over "win"
- ANY loss keyword in document → status = "loss"

========================================
EXAMPLES
========================================

Example 1:
Text: "Résultat net: (25 000) KDT"
Output: {{{{ "company_name": "X", "net_result": -25000000.0, "revenue": null, "margin": null, "status": "loss" }}}}

Example 2:
Text: "Chiffre d'affaires: 100 000 DT. La société enregistre une perte de 5 000 DT."
Output: {{{{ "company_name": "X", "net_result": -5000.0, "revenue": 100000.0, "margin": null, "status": "loss" }}}}

Example 3:
Text: "Revenus: 50 000 KDT. Résultat net: 8 000 KDT"
Output: {{{{ "company_name": "X", "net_result": 8000000.0, "revenue": 50000000.0, "margin": null, "status": "win" }}}}

Example 4:
Text: "CA: 200 000 DT. Les capitaux propres sont négatifs."
Output: {{{{ "company_name": "X", "net_result": null, "revenue": 200000.0, "margin": null, "status": "loss" }}}}

Example 5:
Text: "Revenus: 150 000 DT. Performance en amélioration. Croissance de 10%."
Output: {{{{ "company_name": "X", "net_result": null, "revenue": 150000.0, "margin": null, "status": "win" }}}}

    Text:
    {text[:40000]}

    JSON Output:
    """
    
    try:
        response = model.generate_content(prompt)
        # Parse JSON from response
        res_text = response.text.strip()
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        return json.loads(res_text)
    except Exception as e:
        print(f"Gemini analysis error for {filename}: {e}")
        return None

def save_to_supabase(data):
    """
    Inserts data into 'financial_results' table.
    """
    try:
        res = supabase.table("financial_results").insert(data).execute()
        print(f"Successfully saved to Supabase.")
        return res
    except Exception as e:
        print(f"Supabase insertion error: {e}")
        return None

def clear_supabase_table():
    """
    Deletes all rows from 'financial_results'.
    """
    try:
        # Note: anon keys often don't have delete permissions.
        # This requires RLS to allow delete or a service role key.
        print("Attempting to clear 'financial_results' table...")
        supabase.table("financial_results").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("Table cleared.")
    except Exception as e:
        print(f"Warning: Could not clear table (Check permissions): {e}")

def main():
    if not GEMINI_API_KEY or not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing API keys. Please check your .env file.")
        return

    # Clear table before re-running
    clear_supabase_table()

    pdf_files = glob.glob(os.path.join(PDF_FOLDER, "*.pdf"))
    print(f"Found {len(pdf_files)} PDFs to analyze.")

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"Processing {filename}...")
        
        text = extract_text_from_pdf(pdf_path)
        if not text:
            continue
            
        analysis = analyze_financial_data(text, filename)
        if analysis:
            print(f"Analysis for {filename}: {analysis}")
            save_to_supabase(analysis)
        else:
            print(f"Failed to analyze {filename}")
        
        # Avoid rate limits
        time.sleep(2)

if __name__ == "__main__":
    main()
