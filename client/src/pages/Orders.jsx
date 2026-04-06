import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OrdersAPI } from '../services/api';
import { Package, Loader, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import './Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await OrdersAPI.list();
        setOrders(data.orders || []);
      } catch (err) {
        setError('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <Clock size={18} className="status-icon pending" />;
      case 'confirmed': return <CheckCircle size={18} className="status-icon confirmed" />;
      case 'shipped': return <Truck size={18} className="status-icon shipped" />;
      case 'delivered': return <CheckCircle size={18} className="status-icon delivered" />;
      case 'cancelled': return <XCircle size={18} className="status-icon cancelled" />;
      default: return <Package size={18} className="status-icon" />;
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  const getOrderRole = (order) => {
    const isBuyer = Boolean(order.delivery_verification_code);
    return isBuyer ? 'Purchase' : 'Sale';
  };

  const getDeliveryHint = (order) => {
    const isBuyer = Boolean(order.delivery_verification_code);
    if (order.status === 'pending') {
      return isBuyer ? 'Waiting for seller confirmation.' : 'Review and confirm this order.';
    }
    if (order.status === 'confirmed') {
      return isBuyer ? 'Seller is preparing shipment.' : 'Mark this order as shipped when it is dispatched.';
    }
    if (order.status === 'shipped') {
      return isBuyer
        ? 'Enter the delivery OTP on the order page when it arrives.'
        : 'Buyer will enter the delivery OTP to complete this order.';
    }
    if (order.status === 'delivered') {
      return 'Delivery completed successfully.';
    }
    if (order.status === 'cancelled') {
      return 'This order was cancelled.';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="orders-loading">
        <Loader className="spinner" size={40} />
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="orders-container animate-fade-in"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="orders-header">
        <h1>Order History</h1>
        <p>Track purchases, manage sales, and complete deliveries with OTP verification.</p>
      </div>

      {error && <div className="form-alert error">{error}</div>}

      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="empty-orders glass-panel">
            <Package size={48} className="mb-4 opacity-50" />
            <h3>No orders found</h3>
            <p>You haven't placed or received any orders yet.</p>
            <Link to="/" className="btn-primary mt-4 dashboard-action">Start Shopping</Link>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div 
              key={order.id} 
              className="order-card glass-panel"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="order-card-header">
                <div className="order-id">
                  <span>Order ID:</span>
                  <strong>{order.id}</strong>
                </div>
                <div className={`order-status-badge status-${order.status}`}>
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status}</span>
                </div>
              </div>

              <div className="order-card-body">
                <div className="order-items-summary">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="order-item-line">
                      <Package size={16} />
                      <span className="item-title">{item.title}</span>
                      <span className="item-qty">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="order-meta">
                  <div className="meta-col">
                    <span className="meta-label">Order Type</span>
                    <span className="meta-val">{getOrderRole(order)}</span>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Date Placed</span>
                    <span className="meta-val">{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Total Amount</span>
                    <span className="meta-val highlight">{formatPrice(order.total_amount)}</span>
                  </div>
                </div>
                <div className="order-meta" style={{ marginTop: '12px' }}>
                  <div className="meta-col" style={{ maxWidth: '100%' }}>
                    <span className="meta-label">Delivery Status</span>
                    <span className="meta-val">{getDeliveryHint(order)}</span>
                  </div>
                </div>
              </div>

              <div className="order-card-footer">
                <Link to={`/order/${order.id}`} className="btn-secondary view-details-btn">
                  {order.status === 'shipped' ? 'Open Delivery Page' : 'View Details'}
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
