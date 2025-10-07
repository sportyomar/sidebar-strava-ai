# modules/education.py

from bs4 import BeautifulSoup

def extract_education(soup: BeautifulSoup) -> list:
    """Extracts the Education section from a LinkedIn profile HTML."""
    education_data = []

    try:
        # Locate section by heading
        edu_section = None
        headers = soup.find_all("h2")
        for h in headers:
            if "education" in h.get_text(strip=True).lower():
                edu_section = h.find_parent("section")
                break

        if not edu_section:
            print("⚠️ Education section not found.")
            return education_data

        items = edu_section.find_all("li", class_="artdeco-list__item")
        for item in items:
            try:
                # School
                school_div = item.find("div", class_="t-bold")
                school = school_div.find("span", attrs={"aria-hidden": "true"}).get_text(strip=True) if school_div else ""

                # Degree and field
                degree = ""
                field = ""
                t14s = item.find_all("span", class_="t-14")
                if len(t14s) >= 1:
                    degree = t14s[0].get_text(strip=True)
                if len(t14s) >= 2:
                    field = t14s[1].get_text(strip=True)

                # Dates
                date_span = item.find("span", class_="pvs-entity__caption-wrapper")
                dates = date_span.get_text(strip=True) if date_span else ""

                education_data.append({
                    "school": school,
                    "degree": degree,
                    "field": field,
                    "dates": dates
                })
            except Exception as edu_inner:
                print("⚠️ Error parsing one education item:", edu_inner)

    except Exception as e:
        print("❌ Error in extract_education:", e)

    return education_data
