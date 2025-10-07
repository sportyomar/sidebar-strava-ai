import requests
import json
import sys

BASE_URL = "http://localhost:5002"


def get_auth_token(username, password):
    """Get JWT token by logging in"""
    print(f"🔐 Authenticating as {username}...")

    # Try different possible auth endpoints
    auth_endpoints = [
        "/api/auth/login",
        "/api/login",
        "/login",
        "/api/auth/authenticate"
    ]

    login_data = {
        "username": username,
        "password": password
    }

    for endpoint in auth_endpoints:
        try:
            print(f"   Trying {endpoint}...")
            response = requests.post(f"{BASE_URL}{endpoint}", json=login_data)

            if response.status_code == 200:
                data = response.json()

                # Look for token in different possible fields
                token_fields = ['token', 'access_token', 'authToken', 'jwt', 'auth_token']
                for field in token_fields:
                    if field in data:
                        print(f"✅ Got token from {endpoint}")
                        return data[field]

                # If no token field found, print response to see structure
                print(f"⚠️  Got 200 response but no token found. Response: {data}")

            else:
                print(f"   {endpoint}: {response.status_code} - {response.text[:100]}")

        except Exception as e:
            print(f"   {endpoint}: Error - {str(e)}")

    return None


def test_auth_endpoints():
    """Discover what auth endpoints are available"""
    print("🔍 Discovering auth endpoints...")

    # Test common endpoints to see what's available
    test_endpoints = [
        "/api/auth/login",
        "/api/login",
        "/login",
        "/api/auth/authenticate",
        "/api/auth/me",
        "/api/user/profile"
    ]

    for endpoint in test_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            print(f"   {endpoint}: {response.status_code}")
            if response.status_code != 404:
                print(f"      Response: {response.text[:100]}")
        except Exception as e:
            print(f"   {endpoint}: Error - {str(e)}")


def test_database_users():
    """Check what users exist in the database via API"""
    print("👥 Checking available users...")

    # If there's a users endpoint
    try:
        response = requests.get(f"{BASE_URL}/api/users")
        if response.status_code == 200:
            users = response.json()
            print(f"   Found users: {[u.get('username', 'unknown') for u in users]}")
            return users
        else:
            print(f"   No users endpoint available: {response.status_code}")
    except Exception as e:
        print(f"   Error getting users: {e}")

    return []


def test_modules_with_token(token, username):
    """Test module management endpoints with a valid token"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print(f"\n🧪 Testing Module Management API for {username}")
    print("=" * 60)

    # Test 1: Get user modules
    print("\n1️⃣ Getting current modules...")
    try:
        response = requests.get(f"{BASE_URL}/api/user/modules", headers=headers)
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Enabled: {data.get('enabled', [])}")
            print(f"   ⏳ Pending: {data.get('pending', [])}")
            print(f"   📦 Available: {data.get('available', [])}")
            return data
        else:
            print(f"   ❌ Error: {response.text}")
            return None

    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return None


def test_module_operations(token, initial_data):
    """Test module enable/disable/request operations"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    available_modules = initial_data.get('available', [])
    enabled_modules = initial_data.get('enabled', [])

    # Test 2: Enable a self-service module
    if 'metrics' in available_modules:
        print("\n2️⃣ Enabling 'metrics' module (self-service)...")
        try:
            response = requests.post(
                f"{BASE_URL}/api/user/enable-module",
                headers=headers,
                json={"moduleKey": "metrics"}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
        except Exception as e:
            print(f"   Exception: {e}")
    else:
        print("\n2️⃣ Skipping metrics enable (not available)")

    # Test 3: Request approval-required module
    if 'dealIntake' in available_modules:
        print("\n3️⃣ Requesting 'dealIntake' module (requires approval)...")
        try:
            response = requests.post(
                f"{BASE_URL}/api/user/request-module-access",
                headers=headers,
                json={
                    "moduleKey": "dealIntake",
                    "reason": "Testing module request system"
                }
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
        except Exception as e:
            print(f"   Exception: {e}")
    else:
        print("\n3️⃣ Skipping dealIntake request (not available)")

    # Test 4: Check modules again
    print("\n4️⃣ Checking modules after changes...")
    try:
        response = requests.get(f"{BASE_URL}/api/user/modules", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Enabled: {data.get('enabled', [])}")
            print(f"   ⏳ Pending: {data.get('pending', [])}")
            print(f"   📦 Available: {data.get('available', [])}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")


def test_admin_functions(token):
    """Test admin endpoints if user has admin access"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("\n👑 Testing Admin Functions...")

    # Test admin module requests endpoint
    try:
        response = requests.get(f"{BASE_URL}/api/admin/module-requests", headers=headers)
        print(f"   Admin requests status: {response.status_code}")

        if response.status_code == 200:
            requests_data = response.json()
            print(f"   📋 Found {len(requests_data)} pending requests")
            for req in requests_data:
                print(f"      - {req.get('username')} wants {req.get('module_key')}")
        elif response.status_code == 403:
            print("   ⚠️  Not an admin user")
        else:
            print(f"   ❌ Error: {response.text}")

    except Exception as e:
        print(f"   Exception: {e}")


def main():
    print("🚀 Module Management API Complete Test")
    print("=" * 60)

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/clients")  # Known endpoint from your app
        print("✅ Flask server is running")
    except Exception as e:
        print(f"❌ Flask server not responding: {e}")
        print("Make sure your Flask server is running on port 5002")
        return

    # Discover available endpoints
    test_auth_endpoints()

    # Try to find users
    users = test_database_users()

    # Try common username/password combinations
    test_users = [
        ("sarah.chen", "password"),
        ("sarah.chen", "sarah"),
        ("admin", "admin"),
        ("admin", "password"),
        ("test", "test"),
        ("user", "user")
    ]

    # If we found users from API, add them to test list
    for user in users:
        username = user.get('username')
        if username:
            test_users.append((username, "password"))
            test_users.append((username, username))

    print(f"\n🔐 Trying to authenticate...")

    token = None
    authenticated_user = None

    for username, password in test_users:
        token = get_auth_token(username, password)
        if token:
            authenticated_user = username
            break

    if not token:
        print("\n❌ Could not authenticate with any test credentials")
        print("\nTo test manually, you can:")
        print("1. Check your auth_blueprint.py to see the login endpoint")
        print("2. Create a test user in your database")
        print("3. Use the actual credentials")
        print("\nExample manual test:")
        print("curl -X POST http://localhost:5002/api/auth/login \\")
        print('  -H "Content-Type: application/json" \\')
        print('  -d \'{"username": "sarah.chen", "password": "your_password"}\'')
        return

    print(f"✅ Successfully authenticated as {authenticated_user}")
    print(f"🎫 Token (first 50 chars): {token[:50]}...")

    # Test module management
    initial_data = test_modules_with_token(token, authenticated_user)

    if initial_data:
        test_module_operations(token, initial_data)
        test_admin_functions(token)

    print("\n🎉 Testing complete!")


if __name__ == "__main__":
    main()