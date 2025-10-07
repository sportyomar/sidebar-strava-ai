from bs4 import BeautifulSoup
import os

def clean_text(text):
    return text.strip().replace('\n', ' ') if text else ""

def extract_artdeco_list_items(html_file_path):
    username = os.path.basename(os.path.dirname(html_file_path))
    print(f"Processing user: {username}")

    # Read the HTML file
    with open(html_file_path, 'r', encoding='utf-8') as file:
        html_content = file.read()

    # Parse the HTML with BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Step 1: Try to locate the experience section via anchor
    try:
        anchor = soup.find("div", id="experience")
        if not anchor:
            print("⚠️ Experience anchor not found.")
            return

        # Step 2: Find the parent section of the anchor
        exp_section = anchor.find_parent("section")
        if not exp_section:
            print("⚠️ Experience section not found.")
            return

        # Step 3: Find elements with 'artdeco-list__item' class within experience section
        matching_elements = exp_section.find_all(class_='artdeco-list__item')

        # Step 4: Count and print results
        count = len(matching_elements)
        print(f"\nTotal 'artdeco-list__item' elements in experience section: {count}")

        titles = []
        detailed_titles = []
        breakdown = []

        for i, node in enumerate(matching_elements, 1):
            title_tags = node.select(
                "div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden='true']")
            all_titles = [clean_text(t.get_text()) for t in title_tags if t.get_text().strip()]

            # Use the first title as a "label" (often the position or company)
            label = all_titles[0]
            title_count = len(all_titles)
            titles.append(label)
            detailed_titles.append({label: f"1 of {title_count}"})

            if not all_titles:
                continue
            elif title_count == 1:
                breakdown.append([("Title Name", all_titles[0])])
            else:
                # First is company, rest are roles
                item = [("Company Name", all_titles[0])]
                for idx, title in enumerate(all_titles[1:], start=2):
                    item.append((f"Title Name", title))
                breakdown.append(item)

        for node in matching_elements:
            title_tags = node.select(
                "div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden='true']"
            )
            all_titles = [clean_text(t.get_text()) for t in title_tags if t.get_text().strip()]
            title_count = len(all_titles)

            if title_count == 0:
                continue

            # --- Handle multi-role entries (1 of N, where N > 1)
            if title_count > 1:
                # company_tag = all_titles[0]
                company_tag = node.select_one(
                    "div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden='true']")
                company_name = company_tag.get_text()
                item = [("Company Name", company_name)]
                company_a_tag = company_tag.find_parent("a", class_="optional-action-target-wrapper")
                if company_a_tag:
                    all_spans = company_a_tag.find_all("span", recursive=False)
                    for outer_span in all_spans:
                        inner = outer_span.find("span", attrs={"aria-hidden": "true"})
                        if inner:
                            text = clean_text(inner.get_text())
                            if 'yr' in text or 'mo' in text:
                                item.append(('Total Duration', text))

                title_spans = node.select("div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden='true']")[1:]
                # for title in all_titles[1:]:
                #     item.append(("Title Name", title))

                for title_tag in title_spans:
                    title = clean_text(title_tag.get_text())
                    item.append(('Title Name', title))

                    # Get a tag
                    a_tag = title_tag.find_parent("a", class_="optional-action-target-wrapper")
                    if a_tag:
                        black_spans = a_tag.find_all("span", class_="t-14 t-normal t-black--light")

                        # Dates
                        if len(black_spans) >= 1:
                            date_span = black_spans[0].find("span", attrs={"aria-hidden": "true"})
                            date_text = clean_text(date_span.get_text())
                            item.append(("Dates", date_text))

                        # Location (optional)
                        if len(black_spans) >= 2:
                            loc_span = black_spans[1].find("span", attrs={"aria-hidden": "true"})
                            loc_text = clean_text(loc_span.get_text())
                            item.append(("Location", loc_text))

                breakdown.append(item)

            # --- Handle single-role entry (1 of 1)
            else:
                item = []

                # Role Title (we already extracted this)
                item.append(("Title Name", all_titles[0]))

                # Company Name
                company_block = node.select_one("span.t-14.t-normal")
                if company_block:
                    company_span = company_block.select_one("span[aria-hidden='true']")
                    company_name = clean_text(company_span.get_text()) if company_span else ""
                    if company_name:
                        item.insert(0, ("Company Name", company_name))  # Insert before title

                # Dates
                date_block = node.select_one("span.t-14.t-normal.t-black--light")
                if date_block:
                    date_span = date_block.select_one("span[aria-hidden='true']")
                    date_text = clean_text(date_span.get_text()) if date_span else ""
                    if date_text:
                        item.append(("Dates", date_text))

                # Optional Location (look for the second block of t-14 t-normal t-black--light)
                location_blocks = node.find_all("span", class_="t-14 t-normal t-black--light")
                if len(location_blocks) >= 2:
                    location_span = location_blocks[1].find("span", attrs={"aria-hidden": "true"})
                    if location_span:
                        location_text = clean_text(location_span.get_text())
                        if location_text:
                            item.append(("Location", location_text))

                breakdown.append(item)



        # Step 5: Detail Breakdown

        for item in breakdown:
            for label_type, value in item:
                print(f"{label_type}: {value}")
            print("-" * 40)  # Optional separator between entries

    except Exception as e:

        print(f"❌ Error occurred while parsing: {e}")


if __name__ == '__main__':
    # username = 'me'
    # username = 'eliza-wakefield-a0a53b98'
    username = '3ajohnson'
    # username = 'lisadoorly'
    # username = 'davenport-alyssa-s'
    extract_artdeco_list_items(f'/Users/sporty/PycharmProjects/memory_issue/Sidebar/sidebar/scripts/linkedin_profile_scraper/input/{username}/experience.html')
