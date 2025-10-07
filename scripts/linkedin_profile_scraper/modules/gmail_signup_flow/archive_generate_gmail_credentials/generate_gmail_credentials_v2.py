from faker import Faker
import random
import json
import os
import csv
from datetime import datetime

fake = Faker()

def generate_gmail_credentials():
    first = fake.first_name()
    last = fake.last_name()
    number = random.randint(1000, 9999)
    username = f"{first.lower()}.{last.lower()}{number}"
    password = f"{fake.password(length=12)}1!"  # Add symbols/digits

    creds = {
        "first_name": first,
        "last_name": last,
        "username": username,
        "password": password
    }

    print(f"[✓] Generated credentials: {creds}")
    return creds

def save_credentials_to_file(creds, path="created_accounts"):
    os.makedirs(path, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{path}/gmail_{creds['username']}_{timestamp}.json"

    with open(filename, "w") as f:
        json.dump(creds, f, indent=2)

    print(f"[✓] Saved JSON: {filename}")

def append_to_master_csv(creds, master_path="created_accounts/master.csv"):
    file_exists = os.path.isfile(master_path)

    with open(master_path, mode="a", newline="") as csvfile:
        fieldnames = ["timestamp", "first_name", "last_name", "username", "password"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        row = {
            "timestamp": datetime.now().isoformat(),
            "first_name": creds["first_name"],
            "last_name": creds["last_name"],
            "username": creds["username"],
            "password": creds["password"]
        }
        writer.writerow(row)

    print(f"[✓] Appended to master log: {master_path}")

# Run this only when the file is executed directly
if __name__ == "__main__":
    print("[*] Generating Gmail credentials...")
    creds = generate_gmail_credentials()

    print("[*] Saving individual file...")
    save_credentials_to_file(creds)

    print("[*] Logging to master CSV...")
    append_to_master_csv(creds)

    print("[✓] Done.")
