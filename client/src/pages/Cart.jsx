import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CartAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Cart.css';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [shippingAddress, setShippingAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const fetchCart = async () => {
    try {
      const data = await CartAPI.get();
      setCart(data);
    } catch (err) {
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    // Update local state if user profile is loaded after initial render
    if (user && !shippingAddress) {
      setShippingAddress(user.address || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateQuantity = async (gadgetId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    try {
      await CartAPI.updateItem(gadgetId, newQuantity);
      await fetchCart();
    } catch (err) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const handleRemoveItem = async (gadgetId) => {
    try {
      await CartAPI.removeItem(gadgetId);
      await fetchCart();
    } catch (err) {
      alert(err.message || 'Failed to remove item');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const payload = {};
      if (shippingAddress) payload.shipping_address = shippingAddress;
      if (phone) payload.phone = phone;

      const order = await CartAPI.checkout(payload);
      navigate(`/order/${order.id}`);
    } catch (err) {
      setCheckoutError(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  if (loading) {
    return (
      <div className="cart-loading">
        <ShoppingCart className="spinner" size={40} />
        <p>Loading your cart...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="cart-container animate-fade-in"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="cart-header">
        <h1>Your Shopping Cart</h1>
      </div>

      {error ? (
        <div className="form-alert error">{error}</div>
      ) : !cart || !cart.items || cart.items.length === 0 ? (
        <div className="empty-cart glass-panel">
          <ShoppingCart size={64} className="empty-icon" />
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any gadgets yet.</p>
          <Link to="/" className="btn-primary mt-4 inline-block">Start Shopping</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items-section glass-panel">
            <AnimatePresence>
              {cart.items.map((item) => (
                <motion.div 
                  key={item.gadget_id} 
                  className="cart-item"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                >
                  <div className="item-details">
                    <Link to={`/gadget/${item.gadget_id}`} className="item-title-link">
                      <h3 className="item-title">{item.title || `Gadget ${item.gadget_id}`}</h3>
                    </Link>
                    <div className="item-price highlight">{formatPrice(item.unit_price)}</div>
                  </div>
                  
                  <div className="item-actions">
                    <div className="quantity-controls">
                      <button 
                        className="btn-icon qty-btn" 
                        onClick={() => handleUpdateQuantity(item.gadget_id, item.quantity, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button 
                        className="btn-icon qty-btn" 
                        onClick={() => handleUpdateQuantity(item.gadget_id, item.quantity, 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    <div className="item-subtotal">
                      {formatPrice(item.unit_price * item.quantity)}
                    </div>
                    
                    <button 
                      className="btn-icon btn-danger remove-btn" 
                      onClick={() => handleRemoveItem(item.gadget_id)}
                      title="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="cart-sidebar">
            <div className="checkout-card glass-panel">
              <h2>Order Summary</h2>
              
              <div className="summary-row total-row">
                <span>Total Amount:</span>
                <span className="total-highlight">{formatPrice(cart.total_amount)}</span>
              </div>

              <form onSubmit={handleCheckout} className="checkout-form mt-4">
                {checkoutError && <div className="form-alert error mb-3">{checkoutError}</div>}
                
                <div className="form-group mb-3">
                  <label>Shipping Address (Optional if saved)</label>
                  <textarea 
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="123 Main St..."
                    rows="2"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group mb-4">
                  <label>Phone Number (Optional if saved)</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="form-control"
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary w-full flex justify-center items-center gap-2" 
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Processing...' : (
                    <>
                      Checkout Now <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <p className="help-text mt-3 text-center">Cash on Delivery only.</p>
              </form>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
