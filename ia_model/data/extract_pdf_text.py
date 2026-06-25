import os
import PyPDF2
from pathlib import Path

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += f"\n--- Page {page_num + 1} ---\n"
                text += page.extract_text()
            return text
    except Exception as e:
        return f"Error reading {pdf_path}: {str(e)}"

def main():
    pdfs_dir = Path("pdfs")
    
    if not pdfs_dir.exists():
        print(f"Error: {pdfs_dir} directory does not exist")
        return
    
    pdf_files = sorted(pdfs_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("No PDF files found in the pdfs directory")
        return
    
    print(f"Found {len(pdf_files)} PDF files\n")
    
    # Extract text from all PDFs
    all_texts = {}
    for pdf_file in pdf_files:
        print(f"Processing: {pdf_file.name}")
        text = extract_text_from_pdf(pdf_file)
        all_texts[pdf_file.name] = text
        print(f"  Extracted {len(text)} characters\n")
    
    # Print summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    for pdf_name, text in all_texts.items():
        char_count = len(text)
        if "Error" in text:
            print(f"{pdf_name}: ERROR - {text.split(': ', 1)[1] if ': ' in text else 'Unknown error'}")
        else:
            print(f"{pdf_name}: {char_count} characters extracted")

if __name__ == "__main__":
    main()

