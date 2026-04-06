import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CartAPI } from '../services/api';
import { useAuth } from '../contexts/auth-context';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, CreditCard, Truck, Phone, Shield, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Cart.css';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [step, setStep] = useState(1);

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
    if (user && !fullName) {
      setFullName(user.full_name || '');
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
      const shippingAddress = `${streetAddress}, ${city}, ${state} ${zip}`;
      const payload = {};
      if (shippingAddress.trim() !== ', ,  ') payload.shipping_address = shippingAddress;
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

  const subtotal = cart?.total_amount || 0;
  const shipping = 15.00;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%' }}></div>
        <p>Loading your cart...</p>
      </div>
    );
  }

  if (error || !cart || !cart.items || cart.items.length === 0) {
    return (
      <motion.div className="checkout-container animate-fade-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="empty-cart glass-panel">
          <ShoppingCart size={56} className="empty-icon" />
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any gadgets yet.</p>
          <Link to="/" className="btn-primary">Start Shopping</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="checkout-container animate-fade-in"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="checkout-header">
        <h1><em>Secure Checkout</em></h1>
        <p>Complete your order with Cash on Delivery (COD).</p>
      </div>

      {/* Steps */}
      <div className="checkout-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-num">1</span>
          <span className="step-label">Shipping</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-num">2</span>
          <span className="step-label">Verification</span>
        </div>
      </div>

      <div className="checkout-layout">
        {/* Left - Form */}
        <form className="checkout-form-section" onSubmit={handleCheckout}>
          {checkoutError && <div className="form-alert error">{checkoutError}</div>}

          {/* Contact */}
          <div className="form-card glass-panel">
            <h3 className="form-card-title"><Phone size={18} /> Contact Information</h3>
            <div className="form-group">
              <label className="field-label">PHONE NUMBER</label>
              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
              <span className="field-hint">Required for delivery verification code.</span>
            </div>
          </div>

          {/* Shipping */}
          <div className="form-card glass-panel">
            <h3 className="form-card-title"><Truck size={18} /> Shipping Address</h3>
            <div className="form-group">
              <label className="field-label">FULL NAME</label>
              <input 
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label className="field-label">STREET ADDRESS</label>
              <input 
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="123 Tech Lane"
              />
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="field-label">CITY</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" />
              </div>
              <div className="form-group">
                <label className="field-label">STATE</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" />
              </div>
              <div className="form-group">
                <label className="field-label">ZIP</label>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="94103" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="form-card glass-panel">
            <div className="payment-header">
              <h3 className="form-card-title"><CreditCard size={18} /> Payment Method</h3>
              <span className="active-badge">ACTIVE</span>
            </div>
            <div className="payment-option active">
              <div className="payment-info">
                <div className="payment-icon">💰</div>
                <div>
                  <strong>Cash on Delivery</strong>
                  <p>Pay when your order arrives</p>
                </div>
              </div>
              <div className="payment-radio checked" />
            </div>
          </div>
        </form>

        {/* Right - Summary */}
        <div className="checkout-sidebar">
          <div className="summary-card glass-panel">
            <h2 className="summary-title"><em>Order Summary</em></h2>
            
            <div className="summary-items">
              {cart.items.map((item) => (
                <div key={item.gadget_id} className="summary-item">
                  <div className="summary-item-img">
                    <ShoppingCart size={16} />
                  </div>
                  <div className="summary-item-info">
                    <strong>{item.title || `Item`}</strong>
                    <span className="text-muted">Qty:{item.quantity}</span>
                    <span className="summary-item-price">{formatPrice(item.unit_price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-lines">
              <div className="summary-line">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="summary-line">
                <span>Shipping</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="summary-line">
                <span>Tax (Estimated)</span>
                <span>{formatPrice(tax)}</span>
              </div>
            </div>

            <div className="summary-total">
              <span className="total-label">TOTAL AMOUNT</span>
              <span className="total-value">{formatPrice(total)}</span>
            </div>

            <button 
              className="btn-primary checkout-btn"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? 'Processing...' : <>Place Order <ArrowRight size={18} /></>}
            </button>
            <p className="terms-text">BY PLACING YOUR ORDER, YOU AGREE TO OUR TERMS OF SERVICE</p>
          </div>

          <div className="trust-badge glass-panel">
            <CheckCircle size={18} className="trust-icon" />
            <div>
              <strong>Vantage Trusted Purchase.</strong> Your transaction is protected with military-grade encryption and a 30-day money-back guarantee.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
