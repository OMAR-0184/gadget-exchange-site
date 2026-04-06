# Gadget Marketplace API - Client Documentation

Welcome to the client-side API documentation! This guide outlines how frontend applications (React, Vue, iOS, Android, etc.) should interact with the Gadget Marketplace backend services.

## Base URL
- **Local Development:** `http://localhost:8000/v1`
- **Production:** `https://labassignment-production.up.railway.app/v1`

## Authentication headers
All protected routes (such as creating gadgets or placing orders) will absolutely require a JSON Web Token (JWT) sent in the HTTP `Authorization` header.

```http
Authorization: Bearer <your_access_token_here>
```

---

## 1. Authentication Endpoints (`/auth`)

The auth module handles user onboarding and issuing tokens. 

> **⚠️ Rate Limiting Warning:** 
> Both the local development and production environments enforce strict rate limits on authentication routes (`5 requests per 60 seconds` per IP) to prevent bot attacks. Exceeding this velocity will return a mathematically strict `429 Too Many Requests` error.

### 1.1 Register User
Creates a new user account and directly returns an active session token so you don't need to force the user to log in again.

- **Endpoint:** `POST /auth/register`
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```

**Success Response (201 Created):**
```json
{
  "user_id": "usr_d8b894dc",
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer"
}
```

**Common Error Responses:**
- `400 Bad Request`: `{"detail": "Email already registered"}`
- `422 Unprocessable Entity`: Built-in validation errors (e.g., missing required fields, completely invalid email string).
- `429 Too Many Requests`: Rate limit exceeded.

---

### 1.2 Login User
Authenticates an existing user and safely issues a fresh JWT.

- **Endpoint:** `POST /auth/login`
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer"
}
```

**Common Error Responses:**
- `401 Unauthorized`: `{"detail": "Incorrect email or password"}`
- `429 Too Many Requests`: Rate limit exceeded.

---

## 2. Gadgets Catalog Endpoints (`/gadgets`)

The gadgets module allows sellers to list products and buyers to browse them using Amazon-style infinite scroll pagination.

### 2.1 List Gadgets (Browse)
Fetches a paginated list of active gadgets. Supports filtering and cursor-based pagination.

- **Endpoint:** `GET /gadgets/`
- **Auth Required:** Optional (Include a valid `Bearer <token>` to receive personalized `personal_price` discounts if you have accepted offer sessions).

**Query Parameters:**
- `cursor` (string, optional): Offset string representing the start index for pagination.
- `limit` (int, default: `20`): Number of items per page (max `100`).
- `search` (string, optional): Full-text smart search by gadget title and description.
- `category` (string, optional): e.g., `smartphones`, `laptops`, `audio`.
- `min_price` (float, optional).
- `max_price` (float, optional).
- `condition` (string, optional): `new`, `like_new`, `good`, `fair`.
- `sort_by` (string, optional, default: `newest`): Sorting method. Options: `relevance`, `price_asc`, `price_desc`, `newest`.

**Success Response (200 OK):**
```json
{
  "items": [
    {
      "id": "gdt_416f0378",
      "seller_id": "usr_d8b894dc",
      "title": "iPhone 15 Pro",
      "description": "Brand new, sealed",
      "category": "smartphones",
      "price": 899.99,
      "personal_price": 750.00, // Present only if user is logged in and has an accepted bargain
      "condition": "new",
      "image_urls": ["https://img.com/iphone15.jpg"],
      "is_verified": true,
      "is_active": true,
      "created_at": "2026-03-20T13:31:53.11Z",
      "updated_at": "2026-03-20T13:31:53.11Z"
    }
  ],
  "next_cursor": "20",
  "total_count": 1
}
```
*(When `next_cursor` is `null`, you have reached the end of the list).*

### 2.2 Get Single Gadget
Fetches the full details of a specific gadget.

- **Endpoint:** `GET /gadgets/{id}`
- **Auth Required:** Optional (Include a valid `Bearer <token>` to receive personalized `personal_price` discounts).

**Success Response (200 OK):**
Returns the same singular object as seen in the `items` list above.

**Error Response:**
- `404 Not Found`: Gadget does not exist.

### 2.3 Create Gadget Listing
Allows a seller to list a new gadget on the marketplace. Images are uploaded directly to **Cloudinary** and the returned CDN URLs are stored. If all required fields and images are provided, the listing is automatically verified.

- **Endpoint:** `POST /gadgets/`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `multipart/form-data`

**Headers:**
```http
Authorization: Bearer <your_access_token_here>
```

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Product title |
| `description` | string | ✅ | Product description |
| `category` | string | ✅ | e.g., `smartphones`, `laptops` |
| `price` | float | ✅ | Must be > 0 |
| `condition` | string | ❌ | Default: `good`. One of: `new`, `like_new`, `good`, `fair` |
| `images` | file(s) | ❌ | One or more image files (max 5MB each) |

**Example (cURL):**
```bash
curl -X POST http://localhost:8000/v1/gadgets/ \
  -H "Authorization: Bearer <token>" \
  -F "title=iPhone 15 Pro" \
  -F "description=Brand new, sealed" \
  -F "category=smartphones" \
  -F "price=899.99" \
  -F "condition=new" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg"
```

**Success Response (201 Created):**
Returns the created gadget object with `image_urls` containing Cloudinary CDN URLs.

**Error Responses:**
- `401 Unauthorized`: Missing or invalid Bearer token.
- `400 Bad Request`: Invalid category, condition, negative price, or non-image file.
- `400 Bad Request`: File exceeds 5MB limit.

### 2.4 Update Gadget Detail
Allows a seller to edit their existing gadget listing (e.g., dropping the price).

- **Endpoint:** `PATCH /gadgets/{id}`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Headers:**
```http
Authorization: Bearer <your_access_token_here>
```

**Request Body:**
Send **ONLY** the fields you wish to update.
```json
{
  "price": 799.00
}
```

**Success Response (200 OK):**
Returns the updated gadget object.

**Error Responses:**
- `403 Forbidden`: You can only edit your own listings.
- `404 Not Found`: Gadget does not exist.

### 2.5 Delete Gadget Listing
Allows a seller to permanently remove (soft-delete) their gadget listing from the marketplace.

- **Endpoint:** `DELETE /gadgets/{id}`
- **Auth Required:** Yes (`Bearer <token>`)

**Headers:**
```http
Authorization: Bearer <your_access_token_here>
```

**Success Response (200 OK):**
```json
{
  "message": "Gadget deleted successfully",
  "gadget_id": "gdt_416f0378"
}
```

**Error Responses:**
- `403 Forbidden`: You can only delete your own listings.
- `404 Not Found`: Gadget does not exist.

---

## 3. Bargain & Negotiation Endpoints (`/bargain`)

Allows buyers and sellers to negotiate the price of a gadget in real-time using WebSockets.

### 3.1 Get Bargain Sessions
Fetches all active bargaining sessions for a specific gadget (primarily useful for the seller to see all incoming offers).

- **Endpoint:** `GET /bargain/{gadget_id}`
- **Auth Required:** Yes (`Bearer <token>`)

**Success Response (200 OK):**
```json
[
  {
    "id": "brg_8a2b3c4d",
    "gadget_id": "gdt_416f0378",
    "buyer_id": "usr_buyer123",
    "seller_id": "usr_d8b894dc",
    "original_price": 899.99,
    "current_offer": 750.00,
    "offered_by": "buyer",
    "status": "countered",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### 3.2 Real-time Bargain (WebSocket)
Connect to the bargain room to send offers, counters, accept, or reject the price.

- **Endpoint:** `ws://<host>/v1/bargain/ws/{gadget_id}?token=<YOUR_JWT_TOKEN>`
- **Auth Required:** Yes (via `token` query parameter)

**Connection Flow:**
1. Both Buyer and Seller connect using their respective JWT tokens.
2. The server responds with the initial state or a list of active sessions (if connecting as Seller).
3. Send JSON actions to negotiate.

**Client -> Server (Messages you can send):**
```json
// Make an offer (or counter-offer)
{"action": "offer", "price": 750.00, "bargain_id": "brg_8a2b3c4d"} // bargain_id required for seller

// Accept current offer
{"action": "accept", "bargain_id": "brg_8a2b3c4d"}

// Reject current offer
{"action": "reject", "bargain_id": "brg_8a2b3c4d"}
```

**Server -> Client (Messages you receive):**
```json
// Offer update
{
  "type": "offer_update",
  "bargain_id": "brg_8a2b3c4d",
  "current_offer": 750.00,
  "offered_by": "buyer",
  "status": "countered"
}

// Offer accepted (Gadget price is automatically updated in the DB)
{
  "type": "bargain_accepted",
  "bargain_id": "brg_8a2b3c4d",
  "final_price": 750.00,
  "status": "accepted"
}
```

---

## 4. Direct Chat Endpoints (`/chat`)

Allows buyers and sellers to send direct messages to each other regarding a specific gadget.

### 4.1 Get Chat History
Fetches historical messages between you and another user for a specific gadget.

- **Endpoint:** `GET /chat/{gadget_id}/history?other_user_id=<OTHER_USER_ID>&token=<YOUR_JWT_TOKEN>`
- **Auth Required:** Yes (via `token` query parameter)

**Success Response (200 OK):**
```json
{
  "messages": [
    {
      "id": "msg_f3a1b2c",
      "gadget_id": "gdt_416f0378",
      "sender_id": "usr_buyer123",
      "receiver_id": "usr_d8b894dc",
      "message": "Is the price negotiable?",
      "created_at": "2026-03-20T14:00:00Z"
    }
  ]
}
```

### 4.2 Real-time Chat (WebSocket)
Connect to a direct 1-on-1 chat room for a specific gadget.

- **Endpoint:** `ws://<host>/v1/chat/ws/{gadget_id}?token=<YOUR_JWT_TOKEN>&receiver_id=<OTHER_USER_ID>`
- **Auth Required:** Yes (via `token` query parameter)

**Connection Behavior:**
Upon connecting, the server will immediately emit a JSON object of type `history` containing all previous messages in the chat room.

**Client -> Server (Send message):**
```json
{"message": "Yes, I can do $750."}
```

**Server -> Client (Receive message):**
```json
{
  "type": "message",
  "id": "msg_9f8e7d6",
  "sender_id": "usr_d8b894dc",
  "receiver_id": "usr_buyer123",
  "message": "Yes, I can do $750.",
  "created_at": "2026-03-20T14:05:00Z"
}
```

---

## 5. User Profile Endpoints (`/users`)

Manage your profile and delivery address.

### 5.1 Get Profile
- **Endpoint:** `GET /users/me`
- **Auth Required:** Yes (`Bearer <token>`)

**Success Response (200 OK):**
```json
{
  "id": "usr_d8b894dc",
  "email": "user@example.com",
  "full_name": "John Doe",
  "address": "123 Main St, City, State 12345",
  "phone": "+1234567890"
}
```

### 5.2 Update Delivery Address
- **Endpoint:** `PATCH /users/me/address`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "address": "123 Main St, City, State 12345",
  "phone": "+1234567890"
}
```

**Success Response (200 OK):** Returns updated user profile.

---

## 6. Order Endpoints (`/orders`)

Full e-commerce ordering system with Cash on Delivery, delivery verification, and bill generation.

### 6.1 Place Order
Creates a new order (COD). Uses your saved address, or you can override it in the request. If a bargain price was negotiated, the personal price is used.

- **Endpoint:** `POST /orders/`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "items": [
    { "gadget_id": "gdt_416f0378", "quantity": 1 }
  ],
  "shipping_address": "456 Oak Ave, Town, State 67890",
  "phone": "+1987654321"
}
```
> `shipping_address` and `phone` are optional if already set via `/users/me/address`.

**Success Response (201 Created):**
```json
{
  "id": "ord_a1b2c3d4",
  "buyer_id": "usr_buyer123",
  "status": "pending",
  "payment_method": "cash_on_delivery",
  "shipping_address": "456 Oak Ave, Town, State 67890",
  "phone": "+1987654321",
  "total_amount": 750.00,
  "delivery_verification_code": "482916",
  "verified_at": null,
  "created_at": "2026-03-24T10:00:00Z",
  "updated_at": "2026-03-24T10:00:00Z",
  "items": [
    {
      "id": "oit_e5f6g7h8",
      "gadget_id": "gdt_416f0378",
      "seller_id": "usr_d8b894dc",
      "quantity": 1,
      "unit_price": 750.00,
      "title": "iPhone 15 Pro"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: No address, no items, buying own listing, gadget inactive.
- `409 Conflict`: Insufficient stock (another buyer got there first).

---

### 6.2 Get Order History
Paginated list of your orders, newest first.

- **Endpoint:** `GET /orders/`
- **Auth Required:** Yes (`Bearer <token>`)

**Query Parameters:**
- `cursor` (string, optional): ISO timestamp cursor.
- `limit` (int, default: `20`): Items per page (max `100`).

**Success Response (200 OK):**
```json
{
  "orders": [ ... ],
  "next_cursor": "2026-03-24T10:00:00Z",
  "total_count": 5
}
```

---

### 6.3 Get Order Detail
- **Endpoint:** `GET /orders/{order_id}`
- **Auth Required:** Yes (`Bearer <token>`)

Returns the full order object with items. The `delivery_verification_code` is only visible to the buyer.

**Error Responses:**
- `403 Forbidden`: Not the buyer or a seller of any item.
- `404 Not Found`: Order does not exist.

---

### 6.4 Cancel Order
Cancel a pending or confirmed order. Stock is restored to the gadgets.

- **Endpoint:** `POST /orders/{order_id}/cancel`
- **Auth Required:** Yes (`Bearer <token>`)

**Error Responses:**
- `400 Bad Request`: Cannot cancel shipped/delivered orders.
- `403 Forbidden`: Not the buyer.

---

### 6.5 Update Order Status (Seller)
Allows a seller to advance the order through the fulfillment pipeline until the package is shipped.

- **Endpoint:** `PATCH /orders/{order_id}/status`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{ "status": "confirmed" }
```

**Valid transitions:** `pending` → `confirmed` → `shipped`

The final `delivered` status is set when the buyer enters the delivery OTP on the website.

**Error Responses:**
- `400 Bad Request`: Invalid status transition.
- `403 Forbidden`: Not a seller in this order.

---

### 6.6 Verify Delivery
The buyer shares their 6-digit verification code with the delivery person, then enters that OTP on the website to confirm delivery and complete the order.

- **Endpoint:** `POST /orders/{order_id}/verify-delivery`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{ "verification_code": "482916" }
```

**Success Response (200 OK):** Returns updated order with `status: "delivered"` and `verified_at` timestamp.

**Error Responses:**
- `400 Bad Request`: Invalid code, already verified, not yet shipped, or cancelled order.
- `403 Forbidden`: Only the buyer can verify delivery.

---

### 6.7 Get Bill
Get a formatted bill/invoice for a completed order.

- **Endpoint:** `GET /orders/{order_id}/bill`
- **Auth Required:** Yes (`Bearer <token>`)

**Success Response (200 OK):**
```json
{
  "order_id": "ord_a1b2c3d4",
  "buyer_name": "John Doe",
  "shipping_address": "456 Oak Ave, Town, State 67890",
  "phone": "+1987654321",
  "payment_method": "cash_on_delivery",
  "items": [
    {
      "title": "iPhone 15 Pro",
      "quantity": 1,
      "unit_price": 750.00,
      "subtotal": 750.00
    }
  ],
  "total_amount": 750.00,
  "order_date": "2026-03-24T10:00:00Z",
  "delivery_verified": true,
  "verified_at": "2026-03-24T15:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Bill not available for `pending` or `cancelled` orders.
- `403 Forbidden`: Not authorized.

---

## 7. Rating & Review Endpoints (`/reviews`)

Allows buyers to leave reviews on gadgets they've purchased, and allows retrieving reviews for a gadget or seller.

### 7.1 Create Review
Leave a 1-5 star rating and an optional comment for a purchased gadget. The order must be marked as `delivered`.

- **Endpoint:** `POST /reviews/`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "gadget_id": "gdt_416f0378",
  "order_id": "ord_a1b2c3d4",
  "rating": 5,
  "comment": "Great phone, fast delivery!"
}
```

**Success Response (201 Created):**
```json
{
  "id": "rev_abc123",
  "reviewer_id": "usr_buyer123",
  "reviewer_name": "John Doe",
  "gadget_id": "gdt_416f0378",
  "order_id": "ord_a1b2c3d4",
  "rating": 5,
  "comment": "Great phone, fast delivery!",
  "created_at": "...",
  "updated_at": "..."
}
```

**Error Responses:**
- `400 Bad Request`: Order is not delivered or review already exists.
- `403 Forbidden`: You can only review your own orders.

### 7.2 Get Gadget Reviews
Fetches all reviews left by buyers for a specific gadget.

- **Endpoint:** `GET /reviews/gadget/{gadget_id}?limit=20&skip=0`
- **Auth Required:** No

**Success Response (200 OK):**
```json
{
  "items": [ ... ],
  "total_count": 1
}
```

### 7.3 Get Seller Reviews
Fetches all reviews for gadgets sold by a specific seller.

- **Endpoint:** `GET /reviews/seller/{seller_id}?limit=20&skip=0`
- **Auth Required:** No

**Success Response (200 OK):**
```json
{
  "items": [ ... ],
  "total_count": 5
}
```

---

## 8. Wishlist Endpoints (`/wishlist`)

Manage a user's favorite gadgets.

### 8.1 Get User Wishlist
- **Endpoint:** `GET /wishlist/`
- **Auth Required:** Yes (`Bearer <token>`)

**Success Response (200 OK):**
Returns a list of wishlist items containing the associated gadget details.

### 8.2 Add to Wishlist
- **Endpoint:** `POST /wishlist/{gadget_id}`
- **Auth Required:** Yes (`Bearer <token>`)

**Success Response (201 Created):** Returns the created wishlist item.

### 8.3 Remove from Wishlist
- **Endpoint:** `DELETE /wishlist/{gadget_id}`
- **Auth Required:** Yes (`Bearer <token>`)

---

## 9. Shopping Cart Endpoints (`/cart`)

Persistent server-side shopping cart with instantaneous checkout.

### 9.1 Get Cart
- **Endpoint:** `GET /cart/`
- **Auth Required:** Yes (`Bearer <token>`)

**Success Response (200 OK):** Returns the Cart ID, an array of cart items, and the dynamically calculated `total_amount`.

### 9.2 Add Item to Cart
- **Endpoint:** `POST /cart/items`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "gadget_id": "gdt_416f0378",
  "quantity": 1
}
```

### 9.3 Update Cart Item
- **Endpoint:** `PATCH /cart/items/{gadget_id}`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "quantity": 2
}
```

### 9.4 Remove Item from Cart
- **Endpoint:** `DELETE /cart/items/{gadget_id}`
- **Auth Required:** Yes (`Bearer <token>`)

### 9.5 Checkout Cart
Converts the cart directly into a pending Order and empties the cart.

- **Endpoint:** `POST /cart/checkout`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "shipping_address": "123 Main St",
  "phone": "+1987654321"
}
```
*(Both properties are optional if user profile already has an address)*

**Success Response (201 Created):**
Returns a complete `OrderResponse` exactly like `POST /orders/`.

---

## 💻 Frontend Implementation Example (Vanilla JS)

Here is a standard example of how to hit the authentication endpoints using JavaScript's native `fetch()` browser API:

```javascript
async function loginUser(email, password) {
  try {
    const response = await fetch('http://localhost:8000/v1/auth/login', {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
          email: email, 
          password: password 
      })
    });

    const data = await response.json();

    // Catch 401s, 400s, and 429s seamlessly
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed due to unexpected error');
    }

    // Success! Save the token securely to client storage
    localStorage.setItem('gadget_token', data.access_token);
    alert('Welcome back!');
    
    return data;

  } catch (error) {
    alert(`Error during authentication: ${error.message}`);
  }
}
```
