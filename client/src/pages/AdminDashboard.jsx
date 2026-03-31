import React, { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Package, ShoppingCart, Star,
  Search, Loader, Trash2, CheckCircle, XCircle,
  Ban, Crown, BarChart3, DollarSign, Eye, EyeOff,
  AlertTriangle
} from 'lucide-react';
import './AdminDashboard.css';

// ── Confirmation Modal ──
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="admin-confirm-overlay" onClick={onCancel}>
      <div className="admin-confirm-modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="admin-confirm-actions">
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({ stats, loading }) {
  if (loading) return <div className="admin-loading"><Loader className="spinner" size={32} /></div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'blue' },
    { label: 'Total Gadgets', value: stats.total_gadgets, icon: Package, color: 'purple' },
    { label: 'Active Listings', value: stats.active_listings, icon: Eye, color: 'green' },
    { label: 'Total Orders', value: stats.total_orders, icon: ShoppingCart, color: 'amber' },
    { label: 'Revenue', value: `$${stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'indigo' },
    { label: 'Banned Users', value: stats.banned_users, icon: Ban, color: 'red' },
  ];

  return (
    <div className="stats-grid">
      {cards.map(card => (
        <div key={card.label} className={`stat-card ${card.color}`}>
          <div className={`stat-icon ${card.color}`}>
            <card.icon size={20} />
          </div>
          <span className="stat-value">{card.value}</span>
          <span className="stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Users Tab ──
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.getUsers({ search: search || undefined, limit: 100 });
      setUsers(data.users);
      setTotal(data.total_count);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleAdmin = async (userId) => {
    try {
      const updated = await AdminAPI.toggleAdmin(userId);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    } catch (err) { alert(err.message); }
    setConfirm(null);
  };

  const handleToggleBan = async (userId) => {
    try {
      const updated = await AdminAPI.toggleBan(userId);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    } catch (err) { alert(err.message); }
    setConfirm(null);
  };

  return (
    <>
      {confirm && <ConfirmModal {...confirm} />}
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm-muted">{total} users</span>
      </div>

      {loading ? (
        <div className="admin-loading"><Loader className="spinner" size={32} /></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name}</strong>
                    <div className="text-sm-muted">{user.id}</div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.is_admin ? 'admin' : 'user'}`}>
                      {user.is_admin ? '⚡ Admin' : 'User'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_banned ? 'banned' : 'active'}`}>
                      {user.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className={`action-btn ${user.is_admin ? 'warn' : 'promote'}`}
                        onClick={() => setConfirm({
                          title: user.is_admin ? 'Remove Admin' : 'Make Admin',
                          message: `Are you sure you want to ${user.is_admin ? 'remove admin privileges from' : 'grant admin privileges to'} ${user.full_name}?`,
                          onConfirm: () => handleToggleAdmin(user.id),
                          onCancel: () => setConfirm(null)
                        })}
                      >
                        <Crown size={13} />
                        {user.is_admin ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        className={`action-btn ${user.is_banned ? 'unban' : 'warn'}`}
                        onClick={() => setConfirm({
                          title: user.is_banned ? 'Unban User' : 'Ban User',
                          message: user.is_banned
                            ? `Unban ${user.full_name}? They will be able to log in again.`
                            : `Ban ${user.full_name}? All their active listings will be deactivated.`,
                          onConfirm: () => handleToggleBan(user.id),
                          onCancel: () => setConfirm(null)
                        })}
                      >
                        <Ban size={13} />
                        {user.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Gadgets Tab ──
function GadgetsTab() {
  const [gadgets, setGadgets] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const fetchGadgets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.getGadgets({ search: search || undefined, limit: 100 });
      setGadgets(data.gadgets);
      setTotal(data.total_count);
    } catch (err) {
      console.error('Failed to fetch gadgets:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchGadgets(); }, [fetchGadgets]);

  const handleToggleVerify = async (gadgetId) => {
    try {
      const updated = await AdminAPI.toggleVerify(gadgetId);
      setGadgets(prev => prev.map(g => g.id === gadgetId ? updated : g));
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (gadgetId) => {
    try {
      await AdminAPI.deleteGadget(gadgetId);
      setGadgets(prev => prev.map(g => g.id === gadgetId ? { ...g, is_active: false } : g));
    } catch (err) { alert(err.message); }
    setConfirm(null);
  };

  return (
    <>
      {confirm && <ConfirmModal {...confirm} />}
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search gadgets by title or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm-muted">{total} gadgets</span>
      </div>

      {loading ? (
        <div className="admin-loading"><Loader className="spinner" size={32} /></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Gadget</th>
                <th>Seller</th>
                <th>Price</th>
                <th>Category</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {gadgets.map(gadget => (
                <tr key={gadget.id} style={{ opacity: gadget.is_active ? 1 : 0.5 }}>
                  <td>
                    <strong className="text-truncate" style={{ display: 'block' }}>{gadget.title}</strong>
                    <div className="text-sm-muted">{gadget.id}</div>
                  </td>
                  <td className="text-sm-muted">{gadget.seller_email || gadget.seller_id}</td>
                  <td><strong>${gadget.price.toFixed(2)}</strong></td>
                  <td><span className="capitalize">{gadget.category}</span></td>
                  <td>
                    <span className={`badge ${gadget.is_active ? 'active' : 'inactive'}`}>
                      {gadget.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${gadget.is_verified ? 'verified' : 'pending'}`}>
                      {gadget.is_verified ? '✓ Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className={`action-btn ${gadget.is_verified ? 'unverify' : 'verify'}`}
                        onClick={() => handleToggleVerify(gadget.id)}
                      >
                        {gadget.is_verified ? <EyeOff size={13} /> : <CheckCircle size={13} />}
                        {gadget.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                      {gadget.is_active && (
                        <button
                          className="action-btn warn"
                          onClick={() => setConfirm({
                            title: 'Deactivate Listing',
                            message: `Deactivate "${gadget.title}"? It will no longer appear in the catalog.`,
                            onConfirm: () => handleDelete(gadget.id),
                            onCancel: () => setConfirm(null)
                          })}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Orders Tab ──
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.getOrders({ status: statusFilter || undefined, limit: 100 });
      setOrders(data.orders);
      setTotal(data.total_count);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const updated = await AdminAPI.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (err) { alert(err.message); }
  };

  return (
    <>
      <div className="admin-toolbar">
        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-sm-muted">{total} orders</span>
      </div>

      {loading ? (
        <div className="admin-loading"><Loader className="spinner" size={32} /></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                    <div className="text-sm-muted">{order.items.length} item(s)</div>
                  </td>
                  <td>{order.buyer_email || order.buyer_id}</td>
                  <td><strong>${order.total_amount.toFixed(2)}</strong></td>
                  <td>
                    <span className={`badge ${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="text-sm-muted">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="status-select-wrapper">
                      <select
                        defaultValue={order.status}
                        onChange={e => handleStatusUpdate(order.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Reviews Tab ──
function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAPI.getReviews({ limit: 100 });
      setReviews(data.reviews);
      setTotal(data.total_count);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleDelete = async (reviewId) => {
    try {
      await AdminAPI.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setTotal(prev => prev - 1);
    } catch (err) { alert(err.message); }
    setConfirm(null);
  };

  const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

  return (
    <>
      {confirm && <ConfirmModal {...confirm} />}
      <div className="admin-toolbar">
        <span className="text-sm-muted">{total} reviews</span>
      </div>

      {loading ? (
        <div className="admin-loading"><Loader className="spinner" size={32} /></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Gadget</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(review => (
                <tr key={review.id}>
                  <td>
                    <strong>{review.reviewer_name || 'Unknown'}</strong>
                    <div className="text-sm-muted">{review.reviewer_email}</div>
                  </td>
                  <td className="text-truncate">{review.gadget_title || review.gadget_id}</td>
                  <td>
                    <span className="admin-rating">{renderStars(review.rating)}</span>
                  </td>
                  <td>
                    <span className="text-truncate" style={{ display: 'block' }}>
                      {review.comment || '—'}
                    </span>
                  </td>
                  <td className="text-sm-muted">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="action-btn warn"
                        onClick={() => setConfirm({
                          title: 'Delete Review',
                          message: `Delete this ${review.rating}-star review by ${review.reviewer_name || 'unknown'}? This cannot be undone.`,
                          onConfirm: () => handleDelete(review.id),
                          onCancel: () => setConfirm(null)
                        })}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Main Admin Dashboard ──
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await AdminAPI.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, count: null },
    { id: 'users', label: 'Users', icon: Users, count: stats?.total_users },
    { id: 'gadgets', label: 'Listings', icon: Package, count: stats?.total_gadgets },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, count: stats?.total_orders },
    { id: 'reviews', label: 'Reviews', icon: Star, count: null },
  ];

  return (
    <div className="admin-dashboard animate-fade-in">
      <div className="admin-header">
        <h1><Shield size={28} /> Admin Dashboard</h1>
        <p>Manage your platform — users, listings, orders, and reviews.</p>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== null && tab.count !== undefined && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab stats={stats} loading={statsLoading} />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'gadgets' && <GadgetsTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'reviews' && <ReviewsTab />}
    </div>
  );
}
