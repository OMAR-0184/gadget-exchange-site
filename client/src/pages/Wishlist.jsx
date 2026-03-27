import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WishlistAPI } from '../services/api';
import GadgetCard from '../components/GadgetCard';
import { Heart, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Wishlist.css';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const data = await WishlistAPI.get();
      setWishlist(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load wishlist.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="wishlist-loading">
        <RefreshCcw className="spinner" size={40} />
        <p>Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="wishlist-container animate-fade-in"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="wishlist-header">
        <h1>Your Wishlist</h1>
        <div className="wishlist-count">{wishlist.length} Items</div>
      </div>

      {error && <div className="form-alert error">{error}</div>}

      {wishlist.length === 0 && !error ? (
        <div className="empty-wishlist glass-panel">
          <Heart size={64} className="empty-icon" />
          <h2>Your wishlist is empty</h2>
          <p>You haven't added any gadgets to your wishlist yet.</p>
          <Link to="/" className="btn-primary mt-4 inline-block">Explore Gadgets</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          <AnimatePresence>
            {wishlist.map((item) => {
              // Extract the gadget correctly whether it's nested or flat.
              const gadgetObj = item.gadget ? item.gadget : item;
              return (
                <motion.div
                  key={item.id || item.gadget_id || gadgetObj.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <GadgetCard gadget={gadgetObj} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
