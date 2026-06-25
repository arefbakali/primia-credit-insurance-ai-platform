import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OUTPUT_CSV = os.path.join("data", "financial_analysis_results.csv")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing Supabase credentials in .env file.")
        return

    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Fetching data from 'financial_results' table...")
    try:
        # Fetch all records
        response = supabase.table("financial_results").select("*").execute()
        data = response.data

        if not data:
            print("No data found in the table.")
            return

        print(f"Successfully fetched {len(data)} records.")

        # Convert to DataFrame
        df = pd.DataFrame(data)

        # Reorder columns for better readability if they exist
        cols = ['company_name', 'status', 'net_result', 'revenue', 'margin', 'processed_at']
        existing_cols = [c for c in cols if c in df.columns]
        df = df[existing_cols]

        # Save to CSV
        os.makedirs("data", exist_ok=True)
        df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
        print(f"Data successfully exported to: {OUTPUT_CSV}")

    except Exception as e:
        print(f"Error extracting data: {e}")

if __name__ == "__main__":
    main()
