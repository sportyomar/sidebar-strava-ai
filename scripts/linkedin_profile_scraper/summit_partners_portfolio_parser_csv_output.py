from bs4 import BeautifulSoup
from tabulate import tabulate

# Load the HTML file from your path
with open("input/summit_partners/portfolio.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

# Extract investment items
data = []
for item in soup.select('.investment-list-item.w-dyn-item'):
    name = item.select_one('[fs-cmsfilter-field="name"]')
    sector = item.select_one('[fs-cmsfilter-field="sector"]')
    status = item.select_one('[fs-cmsfilter-field="status"]')
    founders = item.select_one('[fs-cmsfilter-field="founders"]')
    date = item.select_one('[fs-cmssort-field="date"]')
    description = item.select_one('[fs-cmsfilter-field="description"]')
    link = item.select_one('a')
    img = item.select_one('.investment-list-logo-wrap img')

    data.append({
        "Name": name.text.strip() if name else "",
        "URL": link['href'] if link and link.has_attr('href') else "",
        "Sector": sector.text.strip() if sector else "",
        "Status": status.text.strip() if status else "",
        "Founders": founders.text.strip() if founders else "",
        "Date": date.text.strip() if date else "",
        "Description": description.text.strip() if description else "",
        "Image": img['src'] if img and img.has_attr('src') else ""
    })

# Print as a table
print(tabulate(data, headers="keys", tablefmt="grid"))

# (Optional) write to CSV
import csv

with open("output/portfolio_companies/summit_partners.csv", "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)

print("✅ Done! Data also saved to output.csv")
