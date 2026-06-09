import os
import re
import zipfile
import xml.etree.ElementTree as ET

# Try importing parsing modules with fallbacks
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import docx
except ImportError:
    docx = None

def extract_text_from_pdf(file_path):
    text = ""
    # Try pdfplumber first
    if pdfplumber:
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            if text.strip():
                return text
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}. Trying PyPDF2...")
            
    # Fallback to PyPDF2
    if PyPDF2:
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            if text.strip():
                return text
        except Exception as e:
            print(f"PyPDF2 extraction failed: {e}")
            
    return text

def extract_text_from_docx(file_path):
    text = ""
    # Try python-docx
    if docx:
        try:
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + " "
                    text += "\n"
            if text.strip():
                return text
        except Exception as e:
            print(f"python-docx failed: {e}. Trying raw XML fallback...")
            
    # Fallback to direct zipfile XML parsing (extremely robust!)
    try:
        with zipfile.ZipFile(file_path) as docx_zip:
            xml_content = docx_zip.read('word/document.xml')
            root = ET.fromstring(xml_content)
            # Find namespaces
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = root.findall('.//w:t', ns)
            text = " ".join([p.text for p in paragraphs if p.text])
            return text
    except Exception as e:
        print(f"XML docx extraction fallback failed: {e}")
        
    return text

def parse_resume(file_path):
    _, ext = os.path.splitext(file_path.lower())
    raw_text = ""
    if ext == '.pdf':
        raw_text = extract_text_from_pdf(file_path)
    elif ext in ['.docx', '.doc']:
        raw_text = extract_text_from_docx(file_path)
    else:
        # Try raw reading
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                raw_text = f.read()
        except Exception as e:
            print(f"Raw file reading failed: {e}")
            
    cleaned = clean_text(raw_text)
    contact = extract_contact_info(cleaned)
    return {
        "text": cleaned,
        "email": contact.get("email"),
        "phone": contact.get("phone")
    }

def clean_text(text):
    # Standardize spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_contact_info(text):
    # Basic email regex
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    emails = re.findall(email_pattern, text)
    email = emails[0] if emails else None
    
    # Phone regex (matches standard US/international formats and Indian format)
    phone_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    phones = re.findall(phone_pattern, text)
    phone = phones[0] if phones else None
    
    return {
        "email": email,
        "phone": phone
    }
