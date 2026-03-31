import requests
import string
import random
import os

base_url = "https://labassignment-production.up.railway.app/v1"
email = ''.join(random.choices(string.ascii_lowercase, k=10)) + "@test.com"

# 1. Register
requests.post(f"{base_url}/auth/register", json={"email": email, "password": "password123", "full_name": "Test User"})

# 2. Login
resp = requests.post(f"{base_url}/auth/login", json={"email": email, "password": "password123"})
token = resp.json().get("access_token")

if not token:
    print("Failed to login", resp.text)
    exit(1)

# 3. Create a 3MB file
with open("large.jpg", "wb") as f:
    f.write(os.urandom(3 * 1024 * 1024))

# 4. Upload
headers = {"Authorization": f"Bearer {token}"}
files = {"images": ("large.jpg", open("large.jpg", "rb"), "image/jpeg")}
data = {
    "title": "Camera",
    "description": "Good camera",
    "category": "other",
    "price": "989",
    "condition": "like_new"
}

resp = requests.post(f"{base_url}/gadgets/", headers=headers, data=data, files=files)
print(resp.status_code, resp.text)
