from bs4 import BeautifulSoup


def extract_experience(soup: BeautifulSoup) -> list:
    """
    Complete structure-based LinkedIn experience extractor.
    Handles all LinkedIn profile variations using DOM structure analysis.
    """
    # Create a container for saving
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
        print(f"🔍 Found {len(items)} experience items")

        for i, item in enumerate(items):
            print(f"\n📝 Processing item {i + 1}...")

            # Check if this item has sub-components
            sub_components = item.find("div", class_="pvs-entity__sub-components")

            if sub_components:
                print("   📂 Found sub-components, analyzing...")
                # Analyze what type of sub-components we have
                sub_component_type = classify_sub_components(sub_components)

                if sub_component_type == "MULTIPLE_ROLES":
                    print("   🎯 Processing as MULTIPLE_ROLES")
                    # Type 1: True nested company structure (KKR, Julie Products, etc.)
                    company_info = extract_company_info(item)
                    nested_roles = extract_nested_roles(sub_components, company_info)
                    experience_data.extend(nested_roles)

                elif sub_component_type == "CONTENT_COMPONENTS":
                    print("   📄 Processing as CONTENT_COMPONENTS")
                    # Type 2: Single role with rich content (descriptions, skills, media)
                    role_data = extract_single_role_with_content(item, sub_components)
                    if role_data:
                        experience_data.append(role_data)

            else:
                print("   📋 Processing as simple role (no sub-components)")
                # Type 3: Simple single role (no sub-components)
                role_data = extract_simple_role(item)
                if role_data:
                    experience_data.append(role_data)

    except Exception as e:
        print(f"❌ Error extracting experience: {e}")

    print(f"\n✅ Total experiences extracted: {len(experience_data)}")
    return experience_data


def classify_sub_components(sub_components):
    """
    Classify sub-components as either multiple job roles or content components.

    Returns:
        "MULTIPLE_ROLES": Contains multiple job positions
        "CONTENT_COMPONENTS": Contains descriptions, skills, media
    """
    try:
        # Look for role indicators vs content indicators
        role_indicators = 0
        content_indicators = 0

        # Check all nested list items
        nested_items = sub_components.find_all("li")

        for item in nested_items:
            # Role indicators: job title (bold) + date pattern
            has_job_title = bool(item.find("div", class_="hoverable-link-text t-bold"))
            has_date_pattern = bool(item.find("span", class_="pvs-entity__caption-wrapper"))

            # Content indicators: descriptions, skills, media
            has_description = bool(item.find("div", class_="inline-show-more-text--is-collapsed"))
            has_skills = bool(item.find("svg", {"data-test-icon": "skills-small"}))
            has_media = bool(item.find("a", {"data-field": "experience_media"}))

            # Debug logging
            print(
                f"   Item analysis: title={has_job_title}, date={has_date_pattern}, desc={has_description}, skills={has_skills}, media={has_media}")

            if has_job_title and has_date_pattern:
                role_indicators += 1
            elif has_description or has_skills or has_media:
                content_indicators += 1

        classification = "MULTIPLE_ROLES" if role_indicators >= 1 and role_indicators > content_indicators else "CONTENT_COMPONENTS"
        print(f"🔍 Classification: {classification} (roles={role_indicators}, content={content_indicators})")

        return classification

    except Exception as e:
        print(f"⚠️ Error classifying sub-components: {e}")
        return "CONTENT_COMPONENTS"  # Default to safer option


def extract_company_info(item):
    """Extract company-level information from nested structure container."""
    try:
        company_info = {
            "name": "",
            "location": "",
            "duration": ""
        }

        # Company name - first bold text in company logo area
        company_element = item.select_one("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        if company_element:
            company_info["name"] = clean_text(company_element.get_text(strip=True))

        # Company duration and location from parent container
        spans = item.find_all("span", class_="t-14")
        for span in spans:
            text = clean_text(span.get_text(strip=True))

            # Duration pattern (contains "yrs", "mos", "Full-time")
            if any(duration_word in text.lower() for duration_word in ["yrs", "mos", "full-time", "part-time"]):
                if "full-time" not in text.lower() and "part-time" not in text.lower():
                    company_info["duration"] = text

        # Location from light-colored spans
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            if text and is_location(text) and not is_date(text):
                company_info["location"] = text
                break

        return company_info

    except Exception as e:
        print(f"⚠️ Error extracting company info: {e}")
        return {"name": "", "location": "", "duration": ""}


def extract_nested_roles(sub_components, company_info):
    """Extract individual roles from nested structure."""
    roles = []

    try:
        print(f"🏢 Extracting roles for company: {company_info['name']}")

        # Find all role items in sub-components
        role_items = sub_components.find_all("li")

        for i, role_item in enumerate(role_items):
            print(f"   Processing role item {i + 1}...")

            # Skip if this looks like content rather than a role
            if role_item.find("div", class_="inline-show-more-text--is-collapsed"):
                print(f"   Skipping item {i + 1}: contains description content")
                continue
            if role_item.find("svg", {"data-test-icon": "skills-small"}):
                print(f"   Skipping item {i + 1}: contains skills")
                continue
            if role_item.find("a", {"data-field": "experience_media"}):
                print(f"   Skipping item {i + 1}: contains media")
                continue

            role_data = extract_individual_nested_role(role_item, company_info)
            if role_data:
                print(f"   ✅ Extracted role: {role_data['title']}")
                roles.append(role_data)
            else:
                print(f"   ❌ Failed to extract role from item {i + 1}")

    except Exception as e:
        print(f"⚠️ Error extracting nested roles: {e}")

    print(f"📋 Total roles extracted: {len(roles)}")
    return roles


def extract_individual_nested_role(role_item, company_info):
    """Extract single role from nested item."""
    try:
        # Job title - look for bold text
        title = ""
        title_element = role_item.select_one("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        if title_element:
            title = clean_text(title_element.get_text(strip=True))

        # Dates - look for caption wrapper
        dates = ""
        dates_element = role_item.find("span", class_="pvs-entity__caption-wrapper")
        if dates_element:
            dates = clean_text(dates_element.get_text(strip=True))

        # Employment type - look for normal text spans
        employment_type = ""
        normal_spans = role_item.find_all("span", class_="t-normal")
        for span in normal_spans:
            text = clean_text(span.get_text(strip=True))
            if any(emp_type in text.lower() for emp_type in ["full-time", "part-time", "contract", "freelance"]):
                employment_type = text
                break

        # Location (role-specific or inherit from company)
        location = company_info["location"]
        location_elements = role_item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            # Skip if it's the dates
            if text and text != dates and is_location(text) and not is_date(text):
                location = text
                break

        # Only return role if we have essential data
        if title and dates:
            return {
                "title": title,
                "company": company_info["name"],
                "dates": dates,
                "location": location,
                "description": "",
                "employment_type": employment_type
            }
        else:
            print(f"   ⚠️ Missing essential data: title='{title}', dates='{dates}'")
            return None

    except Exception as e:
        print(f"⚠️ Error extracting individual nested role: {e}")
        return None


def extract_single_role_with_content(item, sub_components):
    """Extract single role that has rich content in sub-components."""
    try:
        # Extract basic role info from main container
        role_data = extract_basic_role_info(item)

        # Extract description from sub-components
        description = extract_description_from_sub_components(sub_components)
        role_data["description"] = description

        return role_data

    except Exception as e:
        print(f"⚠️ Error extracting single role with content: {e}")
        return None


def extract_simple_role(item):
    """Extract role from simple structure (no sub-components)."""
    try:
        return extract_basic_role_info(item)
    except Exception as e:
        print(f"⚠️ Error extracting simple role: {e}")
        return None


def extract_basic_role_info(item):
    """Extract basic role information from main container."""
    try:
        # Job title
        title = ""
        title_element = item.select_one("div.hoverable-link-text.t-bold span[aria-hidden='true']")
        if title_element:
            title = clean_text(title_element.get_text(strip=True))

        # Company and employment type
        company = ""
        employment_type = ""
        company_spans = item.find_all("span", class_="t-14")
        for span in company_spans:
            if "t-normal" in span.get("class", []):
                text = span.get_text(strip=True)
                if text and not any(skip in text.lower() for skip in ["present", "yrs", "mos"]):
                    # Split company name and employment type
                    company, employment_type = parse_company_and_employment_type(text)
                    break

        # Dates
        dates = ""
        dates_element = item.find("span", class_="pvs-entity__caption-wrapper")
        if dates_element:
            dates = clean_text(dates_element.get_text(strip=True))

        # Location
        location = ""
        location_elements = item.find_all("span", class_="t-black--light")
        for element in location_elements:
            text = clean_text(element.get_text(strip=True))
            if text and is_location(text) and not is_date(text) and text != dates:
                location = text
                break

        return {
            "title": title,
            "company": company,
            "dates": dates,
            "location": location,
            "description": "",
            "employment_type": employment_type
        }

    except Exception as e:
        print(f"⚠️ Error extracting basic role info: {e}")
        return None


def extract_description_from_sub_components(sub_components):
    """Extract job description from sub-components."""
    try:
        # Look for description in collapsible text
        desc_element = sub_components.select_one("div.inline-show-more-text--is-collapsed span[aria-hidden='true']")
        if desc_element:
            # Clean up the description text
            description = desc_element.get_text(separator="\n", strip=True)
            # Remove HTML artifacts and clean up formatting
            description = clean_description(description)
            return description
    except Exception as e:
        print(f"⚠️ Error extracting description: {e}")

    return ""


def parse_company_and_employment_type(text):
    """Parse company name and employment type from combined text."""
    employment_types = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"]

    company = text
    employment_type = ""

    # Check for employment type indicators
    for emp_type in employment_types:
        if f" · {emp_type}" in text:
            parts = text.split(f" · {emp_type}")
            company = parts[0].strip()
            employment_type = emp_type
            break

    return clean_text(company), employment_type


def is_location(text):
    """Check if text appears to be a location."""
    if not text:
        return False

    location_indicators = [
        "new york", "california", "boston", "chicago", "san francisco", "los angeles",
        "london", "paris", "tokyo", "sydney", "toronto", "vancouver",
        "united states", "usa", "uk", "canada", "remote", "area", "metro",
        ", ", "ny", "ca", "ma", "tx", "fl", "il", "wa", "pa"
    ]

    text_lower = text.lower()
    return any(indicator in text_lower for indicator in location_indicators)


def is_date(text):
    """Check if text appears to be a date or duration."""
    if not text:
        return False

    date_indicators = ["present", "yrs", "mos", "months", "years", "·", "-", "to"]
    text_lower = text.lower()
    return any(indicator in text_lower for indicator in date_indicators)


def clean_text(text):
    """Clean and normalize text content."""
    if not text:
        return ""

    text = text.strip()

    # Handle duplicated text (LinkedIn sometimes duplicates content)
    if len(text) > 0 and len(text) % 2 == 0:
        half = len(text) // 2
        if text[:half] == text[half:]:
            return text[:half]

    return text


def clean_description(description):
    """Clean job description text."""
    if not description:
        return ""

    # Remove extra whitespace and normalize line breaks
    lines = description.split('\n')
    cleaned_lines = []

    for line in lines:
        line = line.strip()
        if line:  # Skip empty lines
            cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)


def test_extraction(html_content, profile_name="Profile"):
    """Test function to parse HTML and display results."""
    soup = BeautifulSoup(html_content, 'html.parser')
    experience = extract_experience(soup)

    print(f"\n=== {profile_name} Experience ===")
    for i, exp in enumerate(experience, 1):
        print(f"\n{i}. Title: {exp['title']}")
        print(f"   Company: {exp['company']}")
        print(f"   Dates: {exp['dates']}")
        print(f"   Location: {exp['location']}")
        if exp.get('employment_type'):
            print(f"   Employment Type: {exp['employment_type']}")
        if exp['description']:
            desc_preview = exp['description'][:150] + "..." if len(exp['description']) > 150 else exp['description']
            print(f"   Description: {desc_preview}")

    print(f"\nTotal experiences extracted: {len(experience)}")
    return experience


# Example usage for different profile types
def analyze_profile_patterns():
    """
    Utility function to analyze different LinkedIn profile patterns.
    Call this with different HTML content to test various structures.
    """
    patterns = {
        "NESTED_ROLES": "Profiles like KKR (multiple roles per company)",
        "CONTENT_SUB_COMPONENTS": "Profiles like Lisa Doorly (rich descriptions)",
        "SIMPLE_ROLES": "Profiles with basic role structure"
    }

    print("LinkedIn Profile Structure Patterns:")
    for pattern, description in patterns.items():
        print(f"- {pattern}: {description}")

    return patterns