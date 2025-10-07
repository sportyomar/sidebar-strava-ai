from bs4 import BeautifulSoup


def extract_experience(soup: BeautifulSoup) -> list:
    """Structure-based extractor that relies on DOM hierarchy, not content analysis."""
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
            # Check if this item has sub-components (nested structure)
            sub_components = item.find("div", class_="pvs-entity__sub-components")

            if sub_components and has_multiple_roles(sub_components):
                # This is a company with multiple roles - extract each role separately
                company_name = extract_company_name(item)
                company_location = extract_company_location(item)

                # Extract each nested role
                role_items = sub_components.find_all("li")
                for role_item in role_items:
                    role_data = extract_role_from_nested_item(role_item, company_name, company_location)
                    if role_data:
                        experience_data.append(role_data)
            else:
                # This is a single role item - extract directly
                role_data = extract_role_from_single_item(item)
                if role_data:
                    experience_data.append(role_data)

    except Exception as e:
        print(f"❌ Error extracting experience: {e}")

    return experience_data


def has_multiple_roles(sub_components):
    """
    Determine if sub-components contain multiple job roles based on structure alone.

    Logic: If there are multiple <li> elements in sub-components, and each <li>
    contains what looks like a job title (bold text) and dates, it's multiple roles.
    """
    try:
        role_items = sub_components.find_all("li")

        # Need at least 1 item to be considered multiple roles structure
        if len(role_items) < 1:
            return False

        # Check if items have the structural pattern of job roles
        role_like_count = 0
        for item in role_items:
            # Look for the typical role structure: bold title + date span
            has_title = bool(item.find("div", class_="hoverable-link-text t-bold") or
                             item.find("span", {"aria-hidden": "true"}))
            has_date = bool(item.find("span", class_="pvs-entity__caption-wrapper"))

            if has_title and has_date:
                role_like_count += 1

        # If most items look like roles, treat as multiple roles structure
        return role_like_count >= len(role_items) * 0.5

    except Exception as e:
        print(f"⚠️ Error analyzing sub-component structure: {e}")
        return False


def extract_company_name(item):
    """Extract company name from the parent container."""
    try:
        # Look for company name in the main bold text area
        company_element = item.select_one("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        if company_element:
            company_name = clean_text(company_element.get_text(strip=True))
            if company_name:
                return company_name

        # Fallback: look for any bold text that might be the company
        bold_elements = item.find_all("span", {"aria-hidden": "true"})
        for element in bold_elements:
            text = clean_text(element.get_text(strip=True))
            # Skip if it looks like employment duration
            if text and not any(skip in text.lower() for skip in ["yrs", "mos", "present", "full-time", "part-time"]):
                return text

    except Exception as e:
        print(f"⚠️ Error extracting company name: {e}")

    return ""


def extract_company_location(item):
    """Extract location from the parent container."""
    try:
        # Look for location in light-colored text
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            # Location typically contains geographic indicators
            if text and any(geo in text.lower() for geo in
                            ["new york", "california", "united states", "area", "remote",
                             "ny", "ca", "usa", "uk", "london", "boston", ", "]):
                # Make sure it's not a date
                if not any(date_word in text.lower() for date_word in ["present", "yrs", "mos"]):
                    return text
    except Exception as e:
        print(f"⚠️ Error extracting company location: {e}")

    return ""


def extract_role_from_nested_item(role_item, company_name, company_location):
    """Extract role information from a nested role item."""
    try:
        # Extract title
        title = ""
        title_element = role_item.select_one("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        if not title_element:
            # Fallback: look for any bold/prominent text
            title_element = role_item.find("span", {"aria-hidden": "true"})

        if title_element:
            title = clean_text(title_element.get_text(strip=True))

        # Extract dates
        dates = ""
        dates_element = role_item.find("span", class_="pvs-entity__caption-wrapper")
        if dates_element:
            dates = clean_text(dates_element.get_text(strip=True))

        # Extract location (might be role-specific)
        location = company_location  # Default to company location
        location_elements = role_item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            if text and text != dates:  # Make sure it's not the dates
                if any(geo in text.lower() for geo in
                       ["new york", "california", "united states", "area", "remote", ", "]):
                    location = text
                    break

        return {
            "title": title,
            "company": company_name,
            "dates": dates,
            "location": location,
            "description": ""
        }

    except Exception as e:
        print(f"⚠️ Error extracting nested role: {e}")
        return None


def extract_role_from_single_item(item):
    """Extract role information from a single role item."""
    try:
        # Extract title
        title = ""
        title_element = item.select_one("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        if title_element:
            title = clean_text(title_element.get_text(strip=True))

        # Extract company - look for normal weight text
        company = ""
        company_spans = item.find_all("span", class_="t-14")
        for span in company_spans:
            if "t-normal" in span.get("class", []):
                company_text = span.get_text(strip=True)
                # Skip duration/employment type info
                if company_text and not any(skip in company_text.lower() for skip in
                                            ["present", "yrs", "mos", "·"]):
                    company = clean_company_name(company_text)
                    break

        # Extract dates
        dates = ""
        dates_element = item.find("span", class_="pvs-entity__caption-wrapper")
        if dates_element:
            dates = clean_text(dates_element.get_text(strip=True))

        # Extract location
        location = ""
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            # Skip if it's the dates
            if text and text != dates:
                if any(geo in text.lower() for geo in
                       ["new york", "california", "united states", "area", "remote", ", "]):
                    location = text
                    break

        # Extract description
        description = ""
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
        print(f"⚠️ Error extracting single role: {e}")
        return None


def clean_text(text):
    """Remove duplicated text and clean formatting."""
    if not text:
        return ""

    text = text.strip()

    # Handle duplicated text (e.g., "TextText" -> "Text")
    if len(text) > 0 and len(text) % 2 == 0:
        half = len(text) // 2
        if text[:half] == text[half:]:
            return text[:half]

    return text


def clean_company_name(company_text):
    """Clean company name by removing employment type indicators."""
    if not company_text:
        return ""

    # Remove common employment type indicators
    for employment_type in [" · Full-time", " · Part-time", " · Contract", " · Freelance"]:
        if employment_type in company_text:
            company_text = company_text.replace(employment_type, "")

    return clean_text(company_text).strip()


def test_extraction(html_content):
    """Test function to parse HTML and display results."""
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