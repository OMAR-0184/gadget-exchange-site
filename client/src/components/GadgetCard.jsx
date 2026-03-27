import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Tag, BadgeCheck } from 'lucide-react';
import './GadgetCard.css';

export default function GadgetCard({ gadget }) {
  // Use first image or a placeholder
  const imageUrl = gadget.image_urls && gadget.image_urls.length > 0 
    ? gadget.image_urls[0] 
    : 'https://via.placeholder.com/400x300?text=No+Image';

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <motion.div 
      className="gadget-card glass-panel"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
    >
      <Link to={`/gadget/${gadget.id}`} className="gadget-link">
        <div className="card-image-wrapper">
          <img src={imageUrl} alt={gadget.title} className="card-image" loading="lazy" />
          <div className="card-badges">
            <span className="badge condition-badge">{gadget.condition.replace('_', ' ')}</span>
            {gadget.is_verified && (
              <span className="badge verified-badge" title="Verified Listing">
                <BadgeCheck size={14} />
              </span>
            )}
          </div>
        </div>
        
        <div className="card-content">
          <div className="card-category">
            <Tag size={12} />
            <span>{gadget.category}</span>
          </div>
          <h3 className="card-title">{gadget.title}</h3>
          <p className="card-price">{formatPrice(gadget.price)}</p>
          <div className="card-footer">
            <p className="card-date">
              Listed {new Date(gadget.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
