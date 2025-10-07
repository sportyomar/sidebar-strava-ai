# modules/experience.py

from bs4 import BeautifulSoup

# ❓ 1. Why extract_experience(soup) instead of def extract_experience(soup: BeautifulSoup) -> list?
# Both work identically in functionality.
#
# ✅ extract_experience(soup) is just simpler syntax, omitting type hints.
#
# ✅ def extract_experience(soup: BeautifulSoup) -> list: adds clarity and linting help:
#
# Makes function contracts explicit
#
# Helpful for teams, IDE autocompletion, and static analysis tools like mypy
def extract_experience(soup: BeautifulSoup) -> list:
    """Extracts the Experience section from a LinkedIn profile HTML."""
    experience_data = []

    try:
        # Find the experience section header
        exp_section = None
        headers = soup.find_all("h2")
        for h in headers:
            if "experience" in h.get_text(strip=True).lower():
                exp_section = h.find_parent("section")
                break

        if not exp_section:
            print("⚠️ Experience section not found.")
            return experience_data

        items = exp_section.find_all("li", class_="artdeco-list__item")
        for item in items:
            try:
                title = ""
                company = ""
                dates = ""
                location = ""
                description = ""

                # Title
                title_span = item.find("div", class_="t-bold")
                if title_span:
                    title_inner = title_span.find("span", attrs={"aria-hidden": "true"})
                    if title_inner:
                        title = title_inner.get_text(strip=True)

                # Company + type
                company_spans = item.find_all("span", class_="t-14 t-normal")
                if company_spans:
                    company = company_spans[0].get_text(strip=True)
                    mid = len(company) // 2
                    if company[:mid] == company[mid:]:
                        company = company[:mid]

                # Dates
                caption = item.find("span", class_="pvs-entity__caption-wrapper")
                if caption:
                    dates = caption.get_text(strip=True)

                # Location
                if len(company_spans) >= 2:
                    location = company_spans[1].get_text(strip=True)

                # Description
                desc_block = item.find("div", class_="inline-show-more-text--is-collapsed")
                if desc_block:
                    desc_span = desc_block.find("span", attrs={"aria-hidden": "true"})
                    if desc_span:
                        description = desc_span.get_text(separator="\n", strip=True)

                experience_data.append({
                    "title": title,
                    "company": company,
                    "dates": dates,
                    "location": location,
                    "description": description
                })

            except Exception as inner_error:
                print("⚠️ Error parsing experience item:", inner_error)

    except Exception as e:
        print("❌ Error in extract_experience:", e)

    return experience_data
