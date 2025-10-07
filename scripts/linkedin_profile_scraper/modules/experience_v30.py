from bs4 import BeautifulSoup


def extract_experience(soup: BeautifulSoup) -> list:
    """Unified extractor that handles both LinkedIn profile structures."""
    experience_data = []

    try:
        # Locate experience section
        exp_section = None
        for h in soup.find_all("h2"):
            if "experience" in h.get_text(strip=True).lower():
                exp_section = h.find_parent("section")
                break

        if not exp_section:
            print("⚠️ Experience section not found.")
            return experience_data

        # Find all top-level experience items
        items = exp_section.find_all("li", class_="artdeco-list__item")

        for item in items:
            # For each item, determine which structure it uses
            sub_components = item.find("div", class_="pvs-entity__sub-components")

            if sub_components:
                # Check if sub-components contain job roles or descriptions/skills
                if has_nested_job_roles(sub_components):
                    # Structure 2: Company container with multiple roles
                    company_name = extract_parent_company_name(item)
                    company_location = extract_parent_company_location(item)

                    nested_roles = sub_components.find_all("li")
                    for role_item in nested_roles:
                        role_data = extract_nested_role_info(role_item, company_name, company_location)
                        if role_data:
                            experience_data.append(role_data)
                else:
                    # Structure 1: Individual role with descriptions/skills in sub-components
                    role_data = extract_individual_role_info(item)
                    if role_data:
                        experience_data.append(role_data)
            else:
                # No sub-components: simple individual role
                role_data = extract_individual_role_info(item)
                if role_data:
                    experience_data.append(role_data)

    except Exception as e:
        print("❌ Error extracting experience:", e)

    return experience_data


def has_nested_job_roles(sub_components):
    """Determine if sub-components contain job roles (Structure 2) or descriptions/skills (Structure 1)."""
    try:
        # Look for job title indicators in the sub-components
        nested_items = sub_components.find_all("li")

        job_title_count = 0
        description_skill_count = 0

        for item in nested_items:
            text_content = item.get_text(strip=True).lower()

            # Check for job title indicators
            job_indicators = [
                "co-founder", "ceo", "coo", "cmo", "cfo", "founder", "chief", "director",
                "manager", "board member", "advisor", "president", "vice president"
            ]

            # Check for description/skill indicators
            description_indicators = [
                "skills", "see more", "large language models", "data strategy",
                "leading", "managing", "developing", "spearheading"
            ]

            if any(indicator in text_content for indicator in job_indicators):
                job_title_count += 1
            elif any(indicator in text_content for indicator in description_indicators):
                description_skill_count += 1

        # If we found more job titles than descriptions, it's Structure 2
        return job_title_count > description_skill_count

    except Exception as e:
        print(f"⚠️ Error determining sub-component type: {e}")
        return False


def clean_text(text):
    """Remove duplicated text that appears due to aria-hidden elements."""
    if not text:
        return ""

    text = text.strip()

    # Handle cases where text is duplicated (e.g., "TextText" -> "Text")
    if len(text) > 0 and len(text) % 2 == 0:
        half = len(text) // 2
        if text[:half] == text[half:]:
            return text[:half]

    return text


def clean_company_name(company_text):
    """Clean company name by removing employment type and extra formatting."""
    if not company_text:
        return ""

    # Remove common employment type indicators
    for employment_type in [" · Full-time", " · Part-time", " · Contract", " · Freelance"]:
        if employment_type in company_text:
            company_text = company_text.replace(employment_type, "")

    return clean_text(company_text).strip()


def extract_parent_company_name(item):
    """Extract company name from parent company entry (Structure 2)."""
    try:
        # Look for the company name in the main link structure
        company_elements = item.select("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        for element in company_elements:
            text = clean_text(element.get_text(strip=True))
            if text and not any(skip in text.lower() for skip in ["co-founder", "ceo", "board", "officer", "manager"]):
                return text

        # Fallback: look in any bold text that's not a job title
        bold_elements = item.find_all("span", {"aria-hidden": "true"})
        for element in bold_elements:
            text = clean_text(element.get_text(strip=True))
            if text and any(indicator in text.lower() for indicator in ["inc", "university", "llc", "corp", "company"]):
                return text

    except Exception as e:
        print(f"⚠️ Error extracting parent company name: {e}")

    return ""


def extract_parent_company_location(item):
    """Extract location from parent company entry (Structure 2)."""
    try:
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            if text and any(
                    loc in text.lower() for loc in ["new york", "california", "united states", "area", "remote", ", "]):
                return text
    except Exception as e:
        print(f"⚠️ Error extracting parent company location: {e}")

    return ""


def extract_nested_role_info(role_item, company_name, company_location):
    """Extract role information from a nested role item (Structure 2)."""
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


def extract_individual_role_info(item):
    """Extract information from an individual role entry (Structure 1)."""
    try:
        title = ""
        company = ""
        dates = ""
        location = ""
        description = ""

        # Title - look for the main bold hoverable link text
        title_element = item.select_one("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        if title_element:
            title = clean_text(title_element.get_text(strip=True))

        # Company - look for the t-14 t-normal span (usually contains company info)
        company_spans = item.find_all("span", class_="t-14")
        for span in company_spans:
            if "t-normal" in span.get("class", []):
                company_text = span.get_text(strip=True)
                if company_text and not any(skip in company_text.lower() for skip in ["present", "yrs", "mos"]):
                    company = clean_company_name(company_text)
                    break

        # Dates - look for caption wrapper
        dates_element = item.select_one("span.pvs-entity__caption-wrapper[aria-hidden='true']")
        if dates_element:
            dates = clean_text(dates_element.get_text(strip=True))

        # Location - look in t-black--light spans, but avoid dates
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            # Skip if it's the dates (contains "Present", "yrs", "mos")
            if text and not any(date_word in text.lower() for date_word in ["present", "yrs", "mos", "·"]):
                if any(loc in text.lower() for loc in
                       ["ny", "ma", "ca", "new york", "boston", "california", "united states", "area", "remote"]):
                    location = text
                    break

        # Description - look for the collapsible description content
        desc_element = item.select_one("div.inline-show-more-text--is-collapsed span[aria-hidden='true']")
        if desc_element:
            description = desc_element.get_text(separator="\n", strip=True)

        return {
            "title": title,
            "company": company,
            "dates": dates,
            "location": location,
            "description": description
        }

    except Exception as e:
        print(f"⚠️ Error extracting individual role info: {e}")
        return None


# Test the unified function
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
        if exp['description']:
            print(f"   Description: {exp['description'][:100]}...")

    return experience