import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { GadgetAPI, OrdersAPI, CartAPI, WishlistAPI, ReviewsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BadgeCheck, MessageSquare, DollarSign, Tag, ShoppingCart, X, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './GadgetDetail.css';

export default function GadgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [gadget, setGadget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  
  const [addingToCart, setAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    const fetchGadgetAndReviews = async () => {
      try {
        const data = await GadgetAPI.getOne(id);
        setGadget(data);
        
        try {
          const revs = await ReviewsAPI.getGadgetReviews(id);
          setReviews(revs.items || []);
        } catch (e) {
          console.error('Failed to load reviews', e);
        }
        setReviewsLoading(false);

        if (token) {
          try {
            const wishlistItems = await WishlistAPI.get();
            const found = wishlistItems.some(item => item.gadget_id === id);
            setIsWishlisted(found);
          } catch (e) {
            console.error('Failed to check wishlist', e);
          }
        }
      } catch (err) {
        setError('Failed to load gadget details.');
      } finally {
        setLoading(false);
      }
    };
    fetchGadgetAndReviews();
  }, [id, token]);

  if (loading) return <div className="detail-loading">Loading gadget...</div>;
  if (error || !gadget) return <div className="detail-error">{error || 'Gadget not found'}</div>;

  const images = gadget.image_urls?.length > 0 
    ? gadget.image_urls 
    : ['https://via.placeholder.com/800x600?text=No+Image'];

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setPlacingOrder(true);
    setOrderError('');
    try {
      // The API uses the gadget's personal_price automatically if it exists, so we just pass gadget_id
      const payload = {
        items: [{ gadget_id: gadget.id, quantity: 1 }],
      };
      if (shippingAddress) payload.shipping_address = shippingAddress;
      if (phone) payload.phone = phone;

      const order = await OrdersAPI.create(payload);
      setCheckoutModalOpen(false);
      navigate(`/order/${order.id}`);
    } catch (err) {
      setOrderError(err.message || 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      await CartAPI.addItem({ gadget_id: gadget.id, quantity: 1 });
      alert('Added to cart!');
    } catch (err) {
      alert(err.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleWishlist = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await WishlistAPI.remove(gadget.id);
        setIsWishlisted(false);
      } else {
        await WishlistAPI.add(gadget.id);
        setIsWishlisted(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const isSeller = user?.id === gadget.seller_id;

  return (
    <motion.div 
      className="gadget-detail-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="product-layout">
        <div className="product-gallery glass-panel">
          <div className="main-image-wrapper">
            <motion.img 
              key={activeImage}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              src={images[activeImage]} 
              alt={gadget.title} 
              className="main-image"
            />
          </div>
          {images.length > 1 && (
            <div className="thumbnail-list">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`thumbnail ${idx === activeImage ? 'active' : ''}`}
                  onClick={() => setActiveImage(idx)}
                >
                  <img src={img} alt={`Thumbnail ${idx}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="product-info glass-panel">
          <div className="info-header">
            <div className="category-tag">
              <Tag size={14} />
              <span>{gadget.category}</span>
            </div>
            {gadget.is_verified && (
              <div className="verified-badge">
                <BadgeCheck size={16} /> Verified
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 className="product-title" style={{ margin: 0 }}>{gadget.title}</h1>
            <button 
              className={`btn-icon wishlist-btn ${isWishlisted ? 'active text-danger' : ''}`}
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
            >
              <Heart size={28} fill={isWishlisted ? '#ff4757' : 'none'} color={isWishlisted ? '#ff4757' : 'currentColor'} />
            </button>
          </div>
          <div className="product-price" style={{ marginTop: '16px' }}>
            {gadget.personal_price ? (
              <>
                <span className="original-price-strike">{formatPrice(gadget.price)}</span>
                <span className="personal-price ml-2">{formatPrice(gadget.personal_price)}</span>
                <span className="personal-price-badge ml-2">(Your Offer)</span>
              </>
            ) : (
              formatPrice(gadget.price)
            )}
          </div>
          
          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Condition:</span>
              <span className="meta-value capitalize">{gadget.condition.replace('_', ' ')}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Listed:</span>
              <span className="meta-value">{new Date(gadget.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="product-description">
            <h3>Description</h3>
            <p>{gadget.description}</p>
          </div>

          <div className="product-actions">
            {!token ? (
              <div className="auth-prompt">
                <p>Log in to buy, message the seller, or make an offer.</p>
                <Link to="/login" className="btn-primary" style={{ display: 'inline-block' }}>Log In</Link>
              </div>
            ) : (
              <div className="action-buttons">
                {!isSeller && (
                  <>
                    <button 
                      className="btn-primary action-btn buy-btn"
                      onClick={() => setCheckoutModalOpen(true)}
                    >
                      <ShoppingCart size={20} /> Buy Now
                    </button>
                    <button 
                      className="btn-secondary action-btn cart-btn"
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                    >
                      <ShoppingCart size={20} /> {addingToCart ? 'Adding...' : 'Add to Cart'}
                    </button>
                  </>
                )}
                {!isSeller && (
                  <button 
                    className="btn-secondary action-btn bargain-btn"
                    onClick={() => navigate(`/gadget/${gadget.id}/bargain`)}
                  >
                    <DollarSign size={20} /> Make an Offer
                  </button>
                )}
                <button 
                  className="btn-secondary action-btn chat-btn"
                  onClick={() => navigate(`/gadget/${gadget.id}/chat`)}
                >
                  <MessageSquare size={20} /> Message {isSeller ? 'Buyers' : 'Seller'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="reviews-section glass-panel" style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Reviews ({reviews.length})</h2>
        {reviewsLoading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-secondary">No reviews for this gadget yet.</p>
        ) : (
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review.id} className="review-card" style={{ marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold' }}>{review.reviewer_name || review.reviewer_id}</span>
                  <div style={{ display: 'flex', color: '#f1c40f' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < review.rating ? 'currentColor' : 'none'} strokeWidth={i < review.rating ? 0 : 2} />
                    ))}
                  </div>
                </div>
                <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)' }}>{review.comment}</p>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{new Date(review.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {checkoutModalOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content glass-panel"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <button className="modal-close" onClick={() => setCheckoutModalOpen(false)}>
                <X size={20} />
              </button>
              
              <h2>Checkout - Cash on Delivery</h2>
              <p className="mb-4 text-secondary">Please confirm your delivery details for this order.</p>
              
              <div className="checkout-summary mb-4">
                <div className="flex justify-between font-bold">
                  <span>{gadget.title}</span>
                  <span>{formatPrice(gadget.personal_price || gadget.price)}</span>
                </div>
              </div>

              <form onSubmit={handlePlaceOrder} className="checkout-form">
                {orderError && <div className="form-alert error mb-3">{orderError}</div>}
                
                <div className="form-group mb-3">
                  <label>Shipping Address (Optional if saved in profile)</label>
                  <textarea 
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="123 Main St, City, State..."
                    rows="2"
                    className="form-control w-full p-2 border rounded"
                  />
                </div>
                
                <div className="form-group mb-4">
                  <label>Phone Number (Optional if saved in profile)</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="form-control w-full p-2 border rounded"
                  />
                </div>

                <div className="modal-actions flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setCheckoutModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1 flex justify-center items-center gap-2" disabled={placingOrder}>
                    {placingOrder ? 'Processing...' : <><ShoppingCart size={18} /> Confirm Order</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
