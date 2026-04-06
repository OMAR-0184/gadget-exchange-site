import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BadgeCheck, ShoppingCart, Star } from 'lucide-react';
import './GadgetCard.css';

export default function GadgetCard({ gadget }) {
  const imageUrl = gadget.image_urls?.[0] || 'https://via.placeholder.com/400x400?text=No+Image';

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const conditionLabel = gadget.condition?.replace('_', ' ').toUpperCase();
  const displayRating = gadget.average_rating || '4.8';

  return (
    <Motion.div
      className="vantage-card glass-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link to={`/gadget/${gadget.id}`} className="vantage-link">
        <div className="vantage-img-wrapper">
          {gadget.is_verified && (
            <div className="vantage-badge verified">
              <BadgeCheck size={12} /> VERIFIED
            </div>
          )}
          {!gadget.is_verified && gadget.condition && (
            <div className="vantage-badge condition">
              {conditionLabel}
            </div>
          )}
          <img src={imageUrl} alt={gadget.title} loading="lazy" />
        </div>

        <div className="vantage-content">
          <div className="vantage-meta">
            <span className="vantage-category">{gadget.category}</span>
            <div className="vantage-rating">
              <Star size={12} fill="#eab308" color="#eab308" />
              <span>{displayRating}</span>
            </div>
          </div>

          <h3 className="vantage-title">{gadget.title}</h3>
          {gadget.description && (
            <p className="vantage-desc">{gadget.description.substring(0, 60)}...</p>
          )}

          <div className="vantage-footer">
            <span className="vantage-price">{formatPrice(gadget.price)}</span>
            <button className="vantage-cart-btn" onClick={(e) => { e.preventDefault(); }}>
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </Link>
    </Motion.div>
  );
}
