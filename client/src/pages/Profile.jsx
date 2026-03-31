import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UsersAPI, OrdersAPI, WishlistAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User, Package, Heart, ShoppingBag, Settings, LogOut, CheckCircle, Truck, MapPin, Info, Clock, ChevronRight, ShoppingCart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileData, ordersData, wishlistData] = await Promise.allSettled([
          UsersAPI.getProfile(),
          OrdersAPI.list(),
          WishlistAPI.get()
        ]);
        if (profileData.status === 'fulfilled') setProfile(profileData.value);
        if (ordersData.status === 'fulfilled') setOrders(ordersData.value.orders || []);
        if (wishlistData.status === 'fulfilled') setWishlist(wishlistData.value || []);
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  const getStatusStep = (status) => {
    const steps = ['pending', 'confirmed', 'shipped', 'delivered'];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%' }}></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  const latestOrder = orders.length > 0 ? orders[0] : null;

  return (
    <motion.div 
      className="profile-page animate-fade-in"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Profile Header */}
      <div className="profile-banner">
        <div className="profile-avatar-section">
          <div className="profile-avatar-large">
            <User size={32} />
          </div>
          <div className="profile-identity">
            <h1>{profile?.full_name || user?.full_name || 'User'}</h1>
            <p className="profile-email">{profile?.email || user?.email}</p>
            <div className="profile-badges">
              <span className="member-badge">Member</span>
            </div>
          </div>
        </div>
        <Link to="/profile" className="btn-outline edit-profile-btn">
          <Settings size={16} /> Edit Profile
        </Link>
      </div>

      <div className="profile-layout">
        {/* Sidebar */}
        <div className="profile-sidebar">
          <button className={`sidebar-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <Package size={18} /> Order History
          </button>
          <button className={`sidebar-item ${activeTab === 'wishlist' ? 'active' : ''}`} onClick={() => setActiveTab('wishlist')}>
            <Heart size={18} /> Wishlist
          </button>
          <Link to="/dashboard" className="sidebar-item">
            <ShoppingBag size={18} /> My Listings
          </Link>
          <button className="sidebar-item logout-item" onClick={logout}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>

        {/* Main Content */}
        <div className="profile-main">
          {/* Live Order Tracking */}
          {latestOrder && latestOrder.status !== 'cancelled' && latestOrder.status !== 'delivered' && (
            <div className="tracking-card glass-panel">
              <div className="tracking-header">
                <span className="tracking-label">LIVE ORDER TRACKING</span>
                <span className="tracking-date">Expected Delivery<br /><strong>{new Date(Date.now() + 5*86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
              </div>
              <h3 className="tracking-title">{latestOrder.items?.[0]?.title || 'Your Order'}</h3>
              
              <div className="tracking-progress">
                {['Ordered', 'Processed', 'In Transit', 'Arrived'].map((step, idx) => (
                  <div key={step} className={`track-step ${idx <= getStatusStep(latestOrder.status) ? 'completed' : ''}`}>
                    <div className="track-dot">
                      {idx <= getStatusStep(latestOrder.status) ? <CheckCircle size={16} /> : <div className="dot-empty" />}
                    </div>
                    {idx < 3 && <div className={`track-line ${idx < getStatusStep(latestOrder.status) ? 'filled' : ''}`} />}
                    <span className="track-label">{step}</span>
                  </div>
                ))}
              </div>

              <div className="tracking-info">
                <Info size={16} />
                <span>Your package is being processed for delivery.</span>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="tab-content">
              <h2 className="section-title">Past Orders</h2>
              {orders.length === 0 ? (
                <div className="empty-section glass-panel">
                  <Package size={40} className="empty-icon" />
                  <p>No orders yet. <Link to="/" className="text-link">Start shopping</Link></p>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map(order => (
                    <div key={order.id} className="order-row glass-panel">
                      <div className="order-row-left">
                        <div className="order-thumb">
                          <Package size={20} />
                        </div>
                        <div className="order-row-info">
                          <div className="order-row-id">
                            #{order.id.substring(0, 8).toUpperCase()}
                            <span className={`status-pill status-${order.status}`}>{order.status}</span>
                          </div>
                          <div className="order-row-meta">
                            Ordered {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="order-row-summary">
                            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} • {formatPrice(order.total_amount)}
                          </div>
                        </div>
                      </div>
                      <div className="order-row-actions">
                        <Link to={`/order/${order.id}`} className="btn-secondary btn-sm">
                          <Eye size={14} /> View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Saved Gadgets</h2>
                <Link to="/wishlist" className="text-link">See All</Link>
              </div>
              {wishlist.length === 0 ? (
                <div className="empty-section glass-panel">
                  <Heart size={40} className="empty-icon" />
                  <p>No saved gadgets yet. <Link to="/" className="text-link">Browse gadgets</Link></p>
                </div>
              ) : (
                <div className="wishlist-cards">
                  {wishlist.slice(0, 3).map(item => {
                    const gadget = item.gadget || item;
                    const imgUrl = gadget.image_urls?.[0] || 'https://via.placeholder.com/200x200?text=No+Image';
                    return (
                      <div key={item.id || gadget.id} className="wish-card glass-panel">
                        <div className="wish-card-img">
                          <div className="wish-heart"><Heart size={14} fill="#ef4444" color="#ef4444" /></div>
                          <img src={imgUrl} alt={gadget.title} />
                        </div>
                        <div className="wish-card-info">
                          <h4>{gadget.title}</h4>
                          <span className="wish-price">{formatPrice(gadget.price)}</span>
                        </div>
                        <Link to={`/gadget/${gadget.id}`} className="btn-primary wish-cart-btn">
                          <ShoppingCart size={14} /> Move to Cart
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
