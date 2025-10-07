from faker import Faker
import random
import json
from datetime import datetime
import os

fake = Faker()

def generate_gmail_credentials():
    first = fake.first_name()
    last = fake.last_name()
    number = random.randint(1000, 9999)
    username = f"{first.lower()}.{last.lower()}{number}"
    password = f"{fake.password(length=12)}1!"  # Add symbols/digits

    return {
        "first_name": first,
        "last_name": last,
        "username": username,
        "password": password
    }

def save_credentials_to_file(creds, path="created_accounts"):
    os.makedirs(path, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{path}/gmail_{creds['username']}_{timestamp}.json"

    with open(filename, "w") as f:
        json.dump(creds, f, indent=2)

    print(f"[+] Credentials saved to {filename}")

# Example
creds = generate_gmail_credentials()
save_credentials_to_file(creds)
print(creds)
