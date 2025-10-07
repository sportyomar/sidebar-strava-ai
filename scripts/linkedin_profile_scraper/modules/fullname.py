import re
from bs4 import BeautifulSoup

def extract_fullname(soup: BeautifulSoup) -> list:
    """Extracts the Education section from a LinkedIn profile HTML."""
    fullname_data = []

    try:
        # Locate section by div
        fullname_anchor = soup.find("div", class_='artdeco-entity-lockup__title')
            fullname = clean_text(fullname_anchor.get_text()) if fullname_anchor else "Unknown"
            print(f"Full Name: {fullname}")