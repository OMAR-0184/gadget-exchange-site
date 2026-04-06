import React, { useState, useEffect } from 'react';
import { GadgetAPI } from '../services/api';
import { useAuth } from '../contexts/auth-context';
import GadgetCard from '../components/GadgetCard';
import { Loader, PackageOpen, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [myGadgets, setMyGadgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        // Since we don't have a direct /user/me/gadgets, we fetch and filter locally
        // In a real app with thousands of items, the API should handle this filter.
        // Fetching up to 100 to ensure we find local ones (just for this demo)
        const params = { limit: 100 };
        const data = await GadgetAPI.list(params);
        const allItems = data.items || [];
        
        // Filter by our user ID
        const yours = allItems.filter(g => g.seller_id === user?.id);
        setMyGadgets(yours);
      } catch (err) {
        console.error("Failed to fetch dashboard gadgets:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchMyListings();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader className="spinner" size={40} />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <h1>Seller Dashboard</h1>
        <p>Manage your gadgets, view incoming offers, and chat with buyers.</p>
      </div>

      <div className="dashboard-stats glass-panel">
        <div className="stat-card">
          <span className="stat-value">{myGadgets.length}</span>
          <span className="stat-label">Active Listings</span>
        </div>
      </div>

      <div className="dashboard-content">
        <h2>My Gadgets</h2>
        {myGadgets.length === 0 ? (
          <div className="empty-dashboard glass-panel">
            <PackageOpen size={48} className="mb-4 opacity-50" />
            <h3>No listings yet</h3>
            <p>You haven't listed any gadgets for sale.</p>
            <Link to="/create-listing" className="btn-primary mt-4 dashboard-action">
              <Plus size={18} />
              <span>Create a Listing</span>
            </Link>
          </div>
        ) : (
          <div className="gadget-grid">
            {myGadgets.map(gadget => (
              <Motion.div key={gadget.id} className="dashboard-item" layout>
                <GadgetCard gadget={gadget} />
                <div className="dashboard-item-actions">
                  <Link to={`/gadget/${gadget.id}/bargain`} className="btn-secondary flex-1 text-center">
                    Offers
                  </Link>
                  <Link to={`/gadget/${gadget.id}/chat`} className="btn-secondary flex-1 text-center">
                    Chats
                  </Link>
                </div>
              </Motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
