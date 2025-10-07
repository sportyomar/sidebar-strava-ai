from faker import Faker
import random
import json
import os
import csv
from datetime import datetime
import requests

fake = Faker()

GENDERS = ["Male", "Female"]
VPN_REGIONS = ["NL", "DE", "IN", "FR", "MX", "ID"]  # Adjust to your SMS API country support

def log_vpn_identity():
    ip_info = requests.get("https://ipinfo.io/json").json()
    print(f"🔎 VPN Check:")
    print(f"  IP Address : {ip_info.get('ip')}")
    print(f"  Country    : {ip_info.get('country')}")
    print(f"  Region     : {ip_info.get('region')}")
    print(f"  City       : {ip_info.get('city')}")

def generate_gmail_credentials():
    first = fake.first_name()
    last = fake.last_name()
    number = random.randint(1000, 9999)
    username = f"{first.lower()}.{last.lower()}{number}"
    password = f"{fake.password(length=10)}1!"

    birthday = {
        "day": str(random.randint(1, 28)),
        "month": random.randint(1, 12),
        "year": random.randint(1985, 2003)
    }

    gender = random.choice(GENDERS)
    vpn_region = random.choice(VPN_REGIONS)

    creds = {
        "first_name": first,
        "last_name": last,
        "username": username,
        "password": password,
        "birthday": birthday,
        "gender": gender,
        "vpn_region": vpn_region,
        "phone_number": ""  # Filled later via SMS API
    }

    print(f"[✓] Generated: {creds}")
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
        fieldnames = [
            "timestamp", "first_name", "last_name", "username", "password",
            "birthday_day", "birthday_month", "birthday_year",
            "gender", "vpn_region", "phone_number"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        row = {
            "timestamp": datetime.now().isoformat(),
            "first_name": creds["first_name"],
            "last_name": creds["last_name"],
            "username": creds["username"],
            "password": creds["password"],
            "birthday_day": creds["birthday"]["day"],
            "birthday_month": creds["birthday"]["month"],
            "birthday_year": creds["birthday"]["year"],
            "gender": creds["gender"],
            "vpn_region": creds["vpn_region"],
            "phone_number": creds["phone_number"]
        }
        writer.writerow(row)

    print(f"[✓] Logged to CSV: {master_path}")

# Run
if __name__ == "__main__":
    creds = generate_gmail_credentials()
    save_credentials_to_file(creds)
    append_to_master_csv(creds)
    log_vpn_identity()
    print("[✓] Identity generation complete.")
