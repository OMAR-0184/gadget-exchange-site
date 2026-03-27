import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrdersAPI, ReviewsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Package, Truck, CheckCircle, Clock, XCircle, FileText, ChevronLeft, RefreshCcw, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import './OrderDetail.css';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const [selectedItemToReview, setSelectedItemToReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedItems, setReviewedItems] = useState([]);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await OrdersAPI.getOne(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  };

  const isBuyer = order?.buyer_id === user?.id;
  const isSeller = order?.items?.some(item => item.seller_id === user?.id);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCanceling(true);
    try {
      await OrdersAPI.cancel(id);
      await fetchOrder();
    } catch (err) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCanceling(false);
    }
  };

  const handleVerifyDelivery = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await OrdersAPI.verifyDelivery(id, verificationCode);
      await fetchOrder();
    } catch (err) {
      alert(err.message || 'Invalid verification code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    setUpdateStatusLoading(true);
    try {
      await OrdersAPI.updateStatus(id, status);
      await fetchOrder();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  const getBill = async () => {
    try {
      const bill = await OrdersAPI.getBill(id);
      // For simplicity, display as alert. In production, could be a modal or PDF download
      alert(`Order Bill:\n\nTotal: $${bill.total_amount}\nStatus: Delivery Verified\nDate: ${new Date(bill.order_date).toLocaleDateString()}`);
    } catch (err) {
      alert(err.message || 'Failed to get bill.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItemToReview) return;
    setSubmittingReview(true);
    try {
      await ReviewsAPI.create({
        gadget_id: selectedItemToReview,
        order_id: id,
        rating: reviewRating,
        comment: reviewComment
      });
      alert('Review submitted successfully!');
      setReviewedItems([...reviewedItems, selectedItemToReview]);
      setSelectedItemToReview(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="order-detail-loading">
        <RefreshCcw className="spinner" size={40} />
        <p>Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-container">
        <div className="form-alert error">{error || 'Order not found'}</div>
        <button className="btn-secondary mt-4" onClick={() => navigate('/orders')}>Back to Orders</button>
      </div>
    );
  }

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  return (
    <motion.div 
      className="order-detail-container animate-fade-in"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button className="btn-icon back-btn" onClick={() => navigate('/orders')}>
        <ChevronLeft size={20} /> Back to Orders
      </button>

      <div className="order-detail-header glass-panel">
        <div className="header-info">
          <h1>Order #{order.id.split('_')[1] || order.id}</h1>
          <span className={`status-badge detail-status-${order.status}`}>
            <span className="capitalize">{order.status}</span>
          </span>
        </div>
        <div className="header-actions">
          {order.status === 'delivered' && (
            <button className="btn-secondary" onClick={getBill}>
              <FileText size={18} /> Get Bill
            </button>
          )}
          {order.status === 'pending' && isBuyer && (
            <button className="btn-danger" onClick={handleCancel} disabled={canceling}>
              <XCircle size={18} /> {canceling ? 'Canceling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      <div className="order-grid">
        <div className="order-items-section glass-panel">
          <h2>Items Summary</h2>
          <div className="order-items-list">
            {order.items?.map((item, idx) => (
              <div key={idx} className="item-row">
                <div className="item-icon"><Package size={24} /></div>
                <div className="item-details">
                  <div className="item-title">{item.title}</div>
                  <div className="item-seller">Seller ID: {item.seller_id}</div>
                  {isBuyer && order.status === 'delivered' && !reviewedItems.includes(item.gadget_id) && (
                    <button 
                      className="btn-secondary mt-2"
                      onClick={() => setSelectedItemToReview(item.gadget_id)}
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      Write a Review
                    </button>
                  )}
                  {reviewedItems.includes(item.gadget_id) && (
                    <div style={{ color: '#2ecc71', fontSize: '0.85rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Review Submitted
                    </div>
                  )}
                </div>
                <div className="item-price">
                  <div>{item.quantity} x {formatPrice(item.unit_price)}</div>
                  <div className="item-subtotal highlight">{formatPrice(item.quantity * item.unit_price)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="order-total-row">
            <span>Total Amount</span>
            <span className="total-highlight">{formatPrice(order.total_amount)}</span>
          </div>

          {selectedItemToReview && (
            <div className="glass-panel" style={{ marginTop: '24px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Write a Review</h3>
                <button className="btn-icon" onClick={() => setSelectedItemToReview(null)}><XCircle size={20} /></button>
              </div>
              <form onSubmit={handleReviewSubmit}>
                <div className="form-group mb-3">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Rating</label>
                  <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        size={28} 
                        fill={star <= reviewRating ? '#f1c40f' : 'none'} 
                        color={star <= reviewRating ? '#f1c40f' : 'currentColor'}
                        onClick={() => setReviewRating(star)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="form-group mb-4">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Comment</label>
                  <textarea 
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    rows="3" 
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Tell us what you think..."
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn-primary" disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="order-sidebar">
          <div className="info-card glass-panel">
            <h3>Shipping Details</h3>
            <p className="shipping-address">{order.shipping_address}</p>
            <p className="shipping-phone">Phone: {order.phone}</p>
            <p className="payment-method capitalize mt-4">
              <strong>Payment:</strong> {order.payment_method.replace(/_/g, ' ')}
            </p>
          </div>

          <div className="action-card glass-panel">
            <h3>Delivery actions</h3>

            {isBuyer && order.status !== 'cancelled' && order.status !== 'delivered' && (
              <div className="verification-code-display mb-4">
                <p className="help-text">Share this code with the delivery person when your order arrives:</p>
                <div className="code-box">{order.delivery_verification_code || 'Hidden'}</div>
              </div>
            )}

            {isSeller && order.status !== 'cancelled' && order.status !== 'delivered' && (
              <div className="seller-status-actions mb-4">
                <p className="help-text mb-2">Update Order Status:</p>
                <div className="status-buttons">
                  <button 
                    disabled={updateStatusLoading || order.status !== 'pending'} 
                    onClick={() => handleStatusUpdate('confirmed')}
                    className="btn-status"
                  >Confirm</button>
                  <button 
                    disabled={updateStatusLoading || order.status !== 'confirmed'} 
                    onClick={() => handleStatusUpdate('shipped')}
                    className="btn-status"
                  >Ship</button>
                </div>
              </div>
            )}

            {order.status === 'shipped' && (
              <form className="verify-form" onSubmit={handleVerifyDelivery}>
                <p className="help-text mb-2">Verify upon delivery:</p>
                <div className="flex-row">
                  <input 
                    type="text" 
                    placeholder="6-digit code" 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    className="code-input flex-1"
                    maxLength={6}
                  />
                  <button type="submit" className="btn-primary" disabled={verifying}>
                    Verify
                  </button>
                </div>
              </form>
            )}

            {order.status === 'delivered' && (
              <div className="delivered-success-msg">
                <CheckCircle size={32} className="success-icon mb-2" />
                <p>Order safely delivered!</p>
                <p className="help-text text-sm">Verified at {new Date(order.verified_at).toLocaleString()}</p>
              </div>
            )}
            
            {order.status === 'cancelled' && (
              <div className="delivered-success-msg text-danger">
                <XCircle size={32} className="danger-icon mb-2" />
                <p>Order was cancelled.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
