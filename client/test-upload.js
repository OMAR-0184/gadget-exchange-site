import fs from 'node:fs';

async function testUpload() {
  // 1. Register a test user
  const email = "test" + Date.now() + "@example.com";
  const registerResp = await fetch("https://labassignment-production.up.railway.app/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123", full_name: "Test User" })
  });
  if (!registerResp.ok) {
    throw new Error(`Registration failed: ${await registerResp.text()}`);
  }
  
  // 2. Login
  const loginResp = await fetch("https://labassignment-production.up.railway.app/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" })
  });
  const loginData = await loginResp.json();
  const token = loginData.access_token;
  
  // 3. Create dummy file
  fs.writeFileSync('dummy.jpg', 'fake image content');
  
  // 4. Upload
  const formData = new FormData();
  formData.append('title', 'Test Gadget');
  formData.append('description', 'Test desc');
  formData.append('category', 'smartphones');
  formData.append('price', '99.99');
  formData.append('condition', 'new');
  
  const fileBlob = new Blob(['fake image content'], { type: 'image/jpeg' });
  formData.append('images', fileBlob, 'dummy.jpg');
  
  try {
    const uploadResp = await fetch("https://labassignment-production.up.railway.app/v1/gadgets/", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    console.log("Status:", uploadResp.status);
    console.log("Text:", await uploadResp.text());
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testUpload();
