from bs4 import BeautifulSoup


def extract_experience(soup: BeautifulSoup) -> list:
    """Extracts experience entries, including multiple roles at the same company."""
    experience_data = []

    try:
        # Locate experience section
        exp_section = None
        for h in soup.find_all("h2"): # why find all h2 when we can specifically look for id="experience"
            if "experience" in h.get_text(strip=True).lower():
                exp_section = h.find_parent("section") # we can find the section parent for the id="experience"
                break

        if not exp_section:
            print("⚠️ Experience section not found.")
            return experience_data

        # Find all top-level experience items
        items = exp_section.find_all("li", class_="artdeco-list__item") #Why do we care about these?

        for item in items:
            # Check if this item has nested roles (sub-components)
            sub_components = item.find("div", class_="pvs-entity__sub-components") # Why do we care about these?

            if sub_components:
                # This is a company with multiple roles
                company_name = extract_parent_company_name(item) #this is wrong.
                # the company name should be the title selector: display-flex align-items-center mr1 hoverable-link-text t-bold
                # having parent:
                company_location = extract_parent_company_location(item) #this is wrong

                nested_roles = sub_components.find_all("li")
                for role_item in nested_roles:
                    role_data = extract_nested_role_info(role_item, company_name, company_location)
                    if role_data:
                        experience_data.append(role_data)
            else:
                # This is a single role entry
                role_data = extract_single_role_info(item)
                if role_data:
                    experience_data.append(role_data)

    except Exception as e:
        print("❌ Error extracting experience:", e)

    return experience_data


def clean_text(text):
    """Remove duplicated text that appears due to aria-hidden elements."""
    if not text:
        return ""

    # Split by common patterns and take the first occurrence
    text = text.strip()

    # Handle cases where text is duplicated (e.g., "TextText" -> "Text")
    if len(text) > 0 and len(text) % 2 == 0:
        half = len(text) // 2
        if text[:half] == text[half:]:
            return text[:half]

    return text


def extract_parent_company_name(item):
    """Extract company name from parent company entry."""
    try:
        # Look for the company name in the main link structure
        # The company name appears in the hoverable-link-text element
        company_elements = item.select("div.hoverable-link-text.t-bold span[aria-hidden='true']") # this is wrong
        for element in company_elements:
            text = clean_text(element.get_text(strip=True))
            if text and not any(skip in text.lower() for skip in ["co-founder", "ceo", "board", "officer", "manager"]):
                return text

        # Fallback: look in any bold text that's not a job title
        bold_elements = item.find_all("span", {"aria-hidden": "true"})
        for element in bold_elements:
            text = clean_text(element.get_text(strip=True))
            if text and "inc" in text.lower() or "university" in text.lower() or "llc" in text.lower():
                return text

    except Exception as e:
        print(f"⚠️ Error extracting parent company name: {e}")

    return ""


def extract_parent_company_location(item):
    """Extract location from parent company entry."""
    try:
        # Look for location in the parent item - usually in t-black--light spans
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            # Filter for actual locations
            if text and any(
                    loc in text.lower() for loc in ["new york", "california", "united states", "area", "remote", ", "]):
                return text

    except Exception as e:
        print(f"⚠️ Error extracting parent company location: {e}")

    return ""


def extract_nested_role_info(role_item, company_name, company_location):
    """Extract role information from a nested role item."""
    try:
        # Title - first span with aria-hidden in the role item
        title = ""
        title_element = role_item.find("span", {"aria-hidden": "true"})
        if title_element:
            title = clean_text(title_element.get_text(strip=True))

        # Dates - look for caption wrapper
        dates = ""
        dates_element = role_item.find("span", class_="pvs-entity__caption-wrapper")
        if dates_element:
            dates = clean_text(dates_element.get_text(strip=True))

        return {
            "title": title,
            "company": company_name,
            "dates": dates,
            "location": company_location,
            "description": ""
        }

    except Exception as e:
        print(f"⚠️ Error extracting nested role info: {e}")
        return None


def extract_single_role_info(item):
    """Extract information from a single role entry (not nested)."""
    try:
        # For single entries, we need to distinguish between title and company
        all_spans = item.find_all("span", {"aria-hidden": "true"})

        title = ""
        company = ""
        dates = ""
        location = ""

        # Extract title and company from the text content
        text_elements = []
        for span in all_spans:
            text = clean_text(span.get_text(strip=True))
            if text:
                text_elements.append(text)

        # Logic to separate title from company
        if len(text_elements) >= 2:
            # First meaningful text is usually the title or combined title/company
            first_text = text_elements[0]

            # Check if first text contains both title and company (like "Board Member")
            if any(title_word in first_text.lower() for title_word in ["board member", "ceo", "coo", "cmo", "founder"]):
                title = first_text
                # Look for company in subsequent elements
                for text in text_elements[1:]:
                    if any(company_indicator in text.lower() for company_indicator in
                           ["inc", "llc", "university", "corp", "company"]):
                        company = text
                        break
            else:
                # First text might be company name
                if any(company_indicator in first_text.lower() for company_indicator in
                       ["inc", "llc", "university", "corp"]):
                    company = first_text
                    if len(text_elements) > 1:
                        title = text_elements[1]
                else:
                    title = first_text
                    if len(text_elements) > 1:
                        company = text_elements[1]

        # Extract dates
        dates_element = item.find("span", class_="pvs-entity__caption-wrapper")
        if dates_element:
            dates = clean_text(dates_element.get_text(strip=True))

        # Extract location
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            if text and any(
                    loc in text.lower() for loc in ["new york", "california", "united states", "area", "remote", ", "]):
                location = text
                break

        return {
            "title": title,
            "company": company,
            "dates": dates,
            "location": location,
            "description": ""
        }

    except Exception as e:
        print(f"⚠️ Error extracting single role info: {e}")
        return None


# Test the function
def test_extraction(html_content):
    """Test function to parse the provided HTML."""
    soup = BeautifulSoup(html_content, 'html.parser')
    experience = extract_experience(soup)

    print("Extracted Experience:")
    for i, exp in enumerate(experience, 1):
        print(f"\n{i}. Title: {exp['title']}")
        print(f"   Company: {exp['company']}")
        print(f"   Dates: {exp['dates']}")
        print(f"   Location: {exp['location']}")

    return experience