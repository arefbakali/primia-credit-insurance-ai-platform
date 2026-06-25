import os
import pandas as pd
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re

def sanitize_filename(name):
    """
    Sanitizes the enterprise name to be a safe filename.
    """
    # Remove characters that aren't alphanumeric, spaces, underscores, or hyphens
    name = re.sub(r'[^\w\s-]', '', name)
    # Replace spaces with underscores and convert to lowercase
    return name.strip().replace(' ', '_').lower()

def get_pdf_link_from_page(page_url):
    """
    Visits the page_url and looks for a link with class 'pdf-reader-download-link'.
    """
    try:
        print(f"Checking page: {page_url}")
        response = requests.get(page_url, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        # Look for the specific class requested by the user
        download_btn = soup.find(class_='pdf-reader-download-link')
        
        if download_btn and download_btn.get('href'):
            pdf_url = download_btn['href']
            # Resolve relative URLs
            return urljoin(page_url, pdf_url)
        else:
            print(f"Could not find element with class 'pdf-reader-download-link' on {page_url}")
            return None
    except Exception as e:
        print(f"Error accessing {page_url}: {e}")
        return None

def download_file(url, output_folder, custom_name=None):
    """
    Downloads the file from url into the output_folder.
    """
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # Determine filename
        if custom_name:
            filename = f"{custom_name}.pdf"
        else:
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            if not filename or not filename.endswith('.pdf'):
                filename = f"downloaded_{hash(url)}.pdf"
            
        filepath = os.path.join(output_folder, filename)
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Successfully downloaded: {filename}")
        return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

def main():
    csv_path = os.path.join('data', 'cmf.csv')
    output_folder = os.path.join('data', 'pdfs')
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        # Create an empty CSV template if it doesn't exist
        pd.DataFrame(columns=['link']).to_csv(csv_path, index=False)
        print(f"Created a template CSV at {csv_path}. Please add URLs to it.")
        return

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    if df.empty:
        print(f"The CSV at {csv_path} is empty. Please add URLs under a 'link' column.")
        return

    # Look for a column that probably contains links
    link_col = None
    ent_col = None
    
    for col in df.columns:
        if 'link' in col.lower() or 'lien' in col.lower():
            link_col = col
        if 'entreprise' in col.lower() or 'company' in col.lower():
            ent_col = col
    
    if not link_col:
        print("Could not find a 'link' or 'lien' column in the CSV.")
        return

    print(f"Found {len(df)} rows to process.")

    for index, row in df.iterrows():
        page_url = row[link_col]
        if pd.isna(page_url):
            continue
            
        enterprise_name = row[ent_col] if ent_col else None
        sanitized_name = sanitize_filename(enterprise_name) if enterprise_name else None
        
        pdf_url = get_pdf_link_from_page(page_url)
        if pdf_url:
            download_file(pdf_url, output_folder, custom_name=sanitized_name)

if __name__ == "__main__":
    main()
