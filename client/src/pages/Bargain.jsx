import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { useBargain } from '../hooks/useBargain';
import { GadgetAPI, BargainAPI } from '../services/api';
import { DollarSign, CheckCircle, XCircle, ArrowRight, User } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import './Bargain.css';

export default function Bargain() {
  const { id } = useParams();
  const { token, user } = useAuth();
  
  const [gadget, setGadget] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [sessions, setSessions] = useState([]);
  const [selectedBargainId, setSelectedBargainId] = useState(null);

  const { messages, status, sendAction } = useBargain(id, token);

  useEffect(() => {
    GadgetAPI.getOne(id)
      .then(data => setGadget(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const isSeller = user?.id === gadget?.seller_id;

  // If seller, fetch available sessions
  useEffect(() => {
    if (isSeller) {
      BargainAPI.getSessions(id).then(data => {
        setSessions(data || []);
        setSelectedBargainId(prev => prev || data?.[0]?.id || null);
      });
    }
  }, [isSeller, id]);

  const handleMakeOffer = (e) => {
    e.preventDefault();
    if (!offerPrice) return;
    
    // If seller, use selected. If buyer, use the one from messages or let backend handle it.
    let targetBargainId = selectedBargainId;
    if (!isSeller) {
      const mySessionMsgs = messages.filter(m => m.type !== 'initial_state');
      targetBargainId = mySessionMsgs.length > 0 ? mySessionMsgs[mySessionMsgs.length-1].bargain_id : undefined;
    }

    sendAction({
      action: 'offer',
      price: parseFloat(offerPrice),
      bargain_id: targetBargainId
    });
    setOfferPrice('');
  };

  const handleAction = (actionType) => {
    let targetBargainId = selectedBargainId;
    if (!isSeller) {
      const mySessionMsgs = messages.filter(m => m.type !== 'initial_state');
      targetBargainId = mySessionMsgs.length > 0 ? mySessionMsgs[mySessionMsgs.length-1].bargain_id : undefined;
    }
    
    if (!targetBargainId) return;
    
    sendAction({
      action: actionType,
      bargain_id: targetBargainId
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!gadget) return <div className="p-8 text-center">Gadget not found</div>;

  // Filter messages to only show the relevant ones for the current context
  // A buyer only cares about their own (or all returned). 
  // A seller must filter by selectedBargainId.
  const displayMessages = isSeller && selectedBargainId
    ? messages.filter(m => m.bargain_id === selectedBargainId)
    : messages;

  return (
    <div className="bargain-container">
      <div className={`bargain-layout ${isSeller ? 'seller-layout' : ''}`}>
        
        {/* Left Sidebar for Seller to choose buyer */}
        {isSeller && (
          <div className="sessions-sidebar glass-panel">
            <h3>Active Offers</h3>
            {sessions.length === 0 ? (
              <p className="text-muted text-sm p-4">No offers yet.</p>
            ) : (
              <div className="session-list">
                {sessions.map(s => (
                  <div 
                    key={s.id} 
                    className={`session-item ${selectedBargainId === s.id ? 'active' : ''}`}
                    onClick={() => setSelectedBargainId(s.id)}
                  >
                    <User size={16} />
                    <span>User...{s.buyer_id.slice(-4)}</span>
                    <strong className="text-primary">${s.current_offer}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Existing Gadget Summary */}
        <div className="gadget-summary glass-panel">
          <img 
            src={gadget.image_urls?.[0] || 'https://via.placeholder.com/300'} 
            alt={gadget.title} 
            className="summary-img"
          />
          <h3>{gadget.title}</h3>
          <p className="original-price">Asking: ${gadget.price}</p>
        </div>

        {/* Messaging Area */}
        <div className="bargain-interaction glass-panel">
          <div className="bargain-header">
            <h2>{isSeller ? 'Reviewing Offer' : 'Live Negotiation'}</h2>
            <div className={`status-indicator ${status}`}>
              <span className="dot"></span>
              {status}
            </div>
          </div>

          <div className="messages-area">
            {displayMessages.length === 0 ? (
              <div className="empty-messages">
                <DollarSign size={40} className="mb-2 opacity-50" />
                <p>No offers yet in this session.</p>
              </div>
            ) : (
              displayMessages.map((msg, i) => (
                <Motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className={`message-bubble ${msg.type}`}
                >
                  {msg.type === 'offer_update' && (
                    <div className="offer-box">
                      <span className="offer-label">
                        {msg.offered_by === 'buyer' 
                          ? (isSeller ? 'Buyer Offered' : 'You Offered') 
                          : (isSeller ? 'You Countered' : 'Seller Countered')}:
                      </span>
                      <span className="offer-amount">${msg.current_offer}</span>
                      <span className="offer-status">({msg.status})</span>
                    </div>
                  )}
                  {msg.type === 'bargain_accepted' && (
                    <div className="offer-box accepted">
                      <CheckCircle size={20} />
                      <span>Deal Accepted at ${msg.final_price}!</span>
                    </div>
                  )}
                </Motion.div>
              ))
            )}
          </div>

          <div className="action-area">
            {displayMessages.length > 0 && displayMessages[displayMessages.length - 1].type !== 'bargain_accepted' && (
              <div className="quick-actions">
                <button className="btn-secondary" onClick={() => handleAction('accept')}>
                  <CheckCircle size={16} /> Accept Last
                </button>
                <button className="btn-secondary danger" onClick={() => handleAction('reject')}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}

            <form onSubmit={handleMakeOffer} className="offer-form">
              <div className="input-with-icon">
                <DollarSign size={18} className="input-icon" />
                <input 
                  type="number" 
                  value={offerPrice} 
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder={isSeller ? "Counter offer..." : "Enter your offer..."}
                  step="0.01"
                  min="1"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={status !== 'connected' || (isSeller && !selectedBargainId)}>
                Send <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
