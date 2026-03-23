import asyncio
import httpx
import websockets
import json

base_url = "http://localhost:8000/v1"
ws_base_url = "ws://localhost:8000/v1"

async def run_tests():
    # 1. Register seller
    print("Testing Registration...")
    async with httpx.AsyncClient() as client:
        r1 = await client.post(f"{base_url}/auth/register", json={
            "email": "seller99@example.com",
            "password": "password",
            "full_name": "Test Seller"
        })
        seller_data = r1.json()
        if "detail" in seller_data and seller_data["detail"] == "Email already registered":
            r1 = await client.post(f"{base_url}/auth/login", json={
                "email": "seller99@example.com",
                "password": "password"
            })
            seller_data = r1.json()
            # Fetch user ID 
            seller_id_res = await client.get(f"{base_url}/auth/me", headers={"Authorization": f"Bearer {seller_data['access_token']}"})
            seller_data["user_id"] = "test_seller" # placeholder
        
        seller_token = seller_data["access_token"]
        print(f"Seller registered/logged in")

    # 1b Register buyer
    async with httpx.AsyncClient() as client:
        r2 = await client.post(f"{base_url}/auth/register", json={
            "email": "buyer99@example.com",
            "password": "password",
            "full_name": "Test Buyer"
        })
        buyer_data = r2.json()
        if "detail" in buyer_data and buyer_data["detail"] == "Email already registered":
            r2 = await client.post(f"{base_url}/auth/login", json={
                "email": "buyer99@example.com",
                "password": "password"
            })
            buyer_data = r2.json()
        
        buyer_token = buyer_data["access_token"]
        print(f"Buyer registered/logged in")

    # Decode JWT to get user IDs, since /auth/login only returns access_token
    import jwt
    # Decode without verification just to extract sub for testing
    seller_payload = jwt.decode(seller_token, options={"verify_signature": False})
    seller_id_for_chat = seller_payload.get("sub")
    
    buyer_payload = jwt.decode(buyer_token, options={"verify_signature": False})
    buyer_id = buyer_payload.get("sub")


    # 2. Create Gadget
    print("\nTesting Gadget Creation...")
    async with httpx.AsyncClient() as client:
        files = {
            'title': (None, 'Test Gadget'),
            'description': (None, 'A nice test gadget'),
            'category': (None, 'smartphones'),
            'price': (None, '1000.0'),
            'condition': (None, 'good'),
            'images': ('test.jpg', b'', 'image/jpeg') # Fake image to pass validation
        }
        r3 = await client.post(
            f"{base_url}/gadgets/", 
            headers={"Authorization": f"Bearer {seller_token}"},
            files=files
        )
        if r3.status_code != 201:
            print("Failed to create gadget:", r3.status_code, r3.text)
            return

        gadget = r3.json()
        gadget_id = gadget["id"]
        seller_id = gadget["seller_id"]
        print(f"Created Gadget {gadget_id}")


    # 3. Test Chat WebSocket
    print(f"\nTesting Chat WebSocket with gadget_id: {gadget_id}")
    try:
        ws_chat_buyer_url = f"{ws_base_url}/chat/ws/{gadget_id}?token={buyer_token}&receiver_id={seller_id}"
        ws_chat_seller_url = f"{ws_base_url}/chat/ws/{gadget_id}?token={seller_token}&receiver_id={buyer_id}"

        async with websockets.connect(ws_chat_buyer_url) as ws_buyer:
            # Buyer should receive history
            history = await ws_buyer.recv()
            print("Buyer received history:", history)
            
            # Buyer sends a message
            await ws_buyer.send(json.dumps({"message": "Hello seller! I'm interested."}))
            
            # Buyer receives message broadcast
            msg1 = await ws_buyer.recv()
            print("Buyer received their own message:", msg1)

            # Test seller receiving
            async with websockets.connect(ws_chat_seller_url) as ws_seller:
                history_seller = await ws_seller.recv()
                print("Seller received history (should have the last message):", history_seller)

    except Exception as e:
        print("Chat WS error:", e)


    # 4. Test Bargain WebSocket
    print(f"\nTesting Bargain WebSocket with gadget_id: {gadget_id}")
    try:
        ws_bargain_buyer_url = f"{ws_base_url}/bargain/ws/{gadget_id}?token={buyer_token}"
        ws_bargain_seller_url = f"{ws_base_url}/bargain/ws/{gadget_id}?token={seller_token}"

        async with websockets.connect(ws_bargain_buyer_url) as ws_buyer:
            # Buyer receives initial state
            state = await ws_buyer.recv()
            print("Buyer received state:", state)
            state_data = json.loads(state)
            bargain_id = state_data.get("bargain_id")

            # Buyer makes offer
            await ws_buyer.send(json.dumps({"action": "offer", "price": 800.0, "bargain_id": bargain_id}))
            
            # Buyer gets offer update
            update1 = await ws_buyer.recv()
            print("Buyer received offer update:", update1)

            # Seller connects
            async with websockets.connect(ws_bargain_seller_url) as ws_seller:
                # Seller gets list of sessions
                sessions = await ws_seller.recv()
                print("Seller received sessions:", sessions)

                # Seller accepts the offer
                await ws_seller.send(json.dumps({"action": "accept", "bargain_id": bargain_id}))
                
                # Seller gets acceptance
                accept_seller = await ws_seller.recv()
                print("Seller received acceptance:", accept_seller)
            
            # Buyer gets acceptance
            accept_buyer = await ws_buyer.recv()
            print("Buyer received acceptance:", accept_buyer)

    except Exception as e:
        print("Bargain WS error:", e)

    # 5. Check gadget price updated (Personalized)
    async with httpx.AsyncClient() as client:
        # Without auth
        r4 = await client.get(f"{base_url}/gadgets/{gadget_id}")
        gadget_unauth = r4.json()
        print(f"\nGadget Global Price: {gadget_unauth['price']}, Personal Price: {gadget_unauth.get('personal_price')}")
        
        # With buyer auth
        r_buyer = await client.get(
            f"{base_url}/gadgets/{gadget_id}",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        gadget_buyer = r_buyer.json()
        print(f"Buyer View -> Global Price: {gadget_buyer['price']}, Personal Price: {gadget_buyer.get('personal_price')} (Should be 800.0)")

    # 6. Test Delete REST endpoint
    print(f"\nTesting Delete endpoint on {gadget_id}...")
    async with httpx.AsyncClient() as client:
        r5 = await client.delete(
            f"{base_url}/gadgets/{gadget_id}",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        print("Delete Response:", r5.status_code, r5.json())

        # Verify it's gone
        r6 = await client.get(f"{base_url}/gadgets/{gadget_id}")
        print("Get after delete Response:", r6.status_code)

if __name__ == "__main__":
    asyncio.run(run_tests())
