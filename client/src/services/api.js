const API_URL = import.meta.env.VITE_API_URL || 'https://labassignment-production.up.railway.app/v1';

/**
 * Enhanced fetch wrapper to inject tokens and handle errors uniformly
 */
export async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('gadget_token');

  const headers = {
    ...options.headers,
  };

  // Only append Context-Type if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 204 No Content
  if (response.status === 204) return null;

  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) throw new Error('Network response was not OK, and no JSON provided.');
    return null; // Empty 200 responses
  }

  if (!response.ok) {
    // Specifically handle 401s globally (could dispatch a logout event, etc.)
    if (response.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        // Optionally redirect or trigger event here
        console.warn('Unauthorized! Invalid or expired token.');
      }
    }
    const errorDetails = data.detail || (typeof data === 'string' ? data : 'An error occurred');
    const errObj = new Error(typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails));
    errObj.status = response.status;
    errObj.data = data;
    throw errObj;
  }

  return data;
}

// ======================================
// API Services
// ======================================

export const AuthAPI = {
  login: (email, password) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  register: (email, password, full_name) =>
    fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name })
    }),
};

export const GadgetAPI = {
  list: (params = {}) => {
    // Compile search params uniformly
    const urlParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) urlParams.append(key, params[key]);
    });
    const qs = urlParams.toString();
    const endpoint = qs ? `/gadgets/?${qs}` : '/gadgets/';
    return fetchApi(endpoint);
  },

  getOne: (id) => fetchApi(`/gadgets/${id}`),

  create: (formData) =>
    fetchApi('/gadgets/', {
      method: 'POST',
      body: formData // Note: Content-Type is auto-omitted in fetchApi
    }),

  update: (id, updates) =>
    fetchApi(`/gadgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  remove: (id) =>
    fetchApi(`/gadgets/${id}`, { method: 'DELETE' }),
};

export const BargainAPI = {
  // Mostly WebSockets, but get sessions is REST
  getSessions: (gadgetId) => fetchApi(`/bargain/${gadgetId}`),
};

export const ChatAPI = {
  getHistory: (gadgetId, otherUserId) =>
    fetchApi(`/chat/${gadgetId}/history?other_user_id=${otherUserId}`),
};

export const UsersAPI = {
  getProfile: () => fetchApi('/users/me'),
  updateAddress: (data) => fetchApi('/users/me/address', { method: 'PATCH', body: JSON.stringify(data) })
};

export const OrdersAPI = {
  create: (data) => fetchApi('/orders/', { method: 'POST', body: JSON.stringify(data) }),
  list: (params = {}) => {
    const urlParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) urlParams.append(key, params[key]);
    });
    const qs = urlParams.toString();
    return fetchApi(qs ? `/orders/?${qs}` : '/orders/');
  },
  getOne: (id) => fetchApi(`/orders/${id}`),
  cancel: (id) => fetchApi(`/orders/${id}/cancel`, { method: 'POST' }),
  updateStatus: (id, status) => fetchApi(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  verifyDelivery: (id, code) => fetchApi(`/orders/${id}/verify-delivery`, { method: 'POST', body: JSON.stringify({ verification_code: code }) }),
  getBill: (id) => fetchApi(`/orders/${id}/bill`)
};

export const ReviewsAPI = {
  create: (data) => fetchApi('/reviews/', { method: 'POST', body: JSON.stringify(data) }),
  getGadgetReviews: (gadgetId, limit = 20, skip = 0) => fetchApi(`/reviews/gadget/${gadgetId}?limit=${limit}&skip=${skip}`),
  getSellerReviews: (sellerId, limit = 20, skip = 0) => fetchApi(`/reviews/seller/${sellerId}?limit=${limit}&skip=${skip}`)
};

export const WishlistAPI = {
  get: () => fetchApi('/wishlist/'),
  add: (gadgetId) => fetchApi(`/wishlist/${gadgetId}`, { method: 'POST' }),
  remove: (gadgetId) => fetchApi(`/wishlist/${gadgetId}`, { method: 'DELETE' })
};

export const CartAPI = {
  get: () => fetchApi('/cart/'),
  addItem: (data) => fetchApi('/cart/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (gadgetId, quantity) => fetchApi(`/cart/items/${gadgetId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  removeItem: (gadgetId) => fetchApi(`/cart/items/${gadgetId}`, { method: 'DELETE' }),
  checkout: (data) => fetchApi('/cart/checkout', { method: 'POST', body: JSON.stringify(data) })
};
