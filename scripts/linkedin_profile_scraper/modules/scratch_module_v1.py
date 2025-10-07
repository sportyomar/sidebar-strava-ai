# modules/scratch_module.py
from bs4 import BeautifulSoup

def clean_text(text):
    return text.strip().replace('\n', ' ') if text else ""

def extract_experience(soup):
    experience = []
    anchor = soup.find("div", id="experience")
    if not anchor:
        print("⚠️ Experience anchor not found.")
        return experience

    exp_section = anchor.find_parent("section")
    if not exp_section:
        print("⚠️ Experience section not found.")
        return experience

    nodes = exp_section.find_all(class_='artdeco-list__item')
    for node in nodes:
        title_tags = node.select(
            "div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden='true']"
        )
        all_titles = [clean_text(t.get_text()) for t in title_tags if t.get_text().strip()]
        title_count = len(all_titles)
        item = []

        if title_count == 0:
            continue
        elif title_count > 1:
            company_tag = title_tags[0]
            company_name = clean_text(company_tag.get_text())
            item.append(("Company Name", company_name))

            company_a_tag = company_tag.find_parent("a", class_="optional-action-target-wrapper")
            if company_a_tag:
                all_spans = company_a_tag.find_all("span", recursive=False)
                for outer_span in all_spans:
                    inner = outer_span.find("span", attrs={"aria-hidden": "true"})
                    if inner:
                        text = clean_text(inner.get_text())
                        if 'yr' in text or 'mo' in text:
                            item.append(('Total Duration', text))

            for title_tag in title_tags[1:]:
                title = clean_text(title_tag.get_text())
                item.append(("Title Name", title))
                a_tag = title_tag.find_parent("a", class_="optional-action-target-wrapper")
                if a_tag:
                    black_spans = a_tag.find_all("span", class_="t-14 t-normal t-black--light")
                    if len(black_spans) >= 1:
                        date_text = clean_text(black_spans[0].get_text())
                        item.append(("Dates", date_text))
                    if len(black_spans) >= 2:
                        loc_text = clean_text(black_spans[1].get_text())
                        item.append(("Location", loc_text))
        else:
            item.append(("Title Name", all_titles[0]))

            company_block = node.select_one("span.t-14.t-normal")
            if company_block:
                company_span = company_block.select_one("span[aria-hidden='true']")
                company_name = clean_text(company_span.get_text()) if company_span else ""
                if company_name:
                    item.insert(0, ("Company Name", company_name))

            date_block = node.select_one("span.t-14.t-normal.t-black--light")
            if date_block:
                date_span = date_block.select_one("span[aria-hidden='true']")
                date_text = clean_text(date_span.get_text()) if date_span else ""
                if date_text:
                    item.append(("Dates", date_text))

            location_blocks = node.find_all("span", class_="t-14 t-normal t-black--light")
            if len(location_blocks) >= 2:
                location_span = location_blocks[1].find("span", attrs={"aria-hidden": "true"})
                if location_span:
                    loc_text = clean_text(location_span.get_text())
                    if loc_text:
                        item.append(("Location", loc_text))

        experience.append(dict(item))

    return experience
