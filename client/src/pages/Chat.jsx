import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { GadgetAPI, BargainAPI } from '../services/api';
import { Send, User } from 'lucide-react';
import { motion } from 'framer-motion';
import './Chat.css';

export default function Chat() {
  const { id } = useParams();
  const { token, user } = useAuth();
  
  const [gadget, setGadget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  
  // For Seller UI
  const [activeBuyers, setActiveBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    GadgetAPI.getOne(id)
      .then(data => setGadget(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const isSeller = user?.id === gadget?.seller_id;

  // We only know about buyers if they made an offer (using Get Sessions).
  // Without a specific "get chat sessions" endpoint, BargainAPI is our best fallback to map users interacting.
  useEffect(() => {
    if (isSeller) {
      BargainAPI.getSessions(id).then(data => {
        if (data) {
          // unique buyers
          const buyers = [...new Set(data.map(s => s.buyer_id))];
          setActiveBuyers(buyers);
          if (buyers.length > 0 && !selectedBuyerId) {
            setSelectedBuyerId(buyers[0]);
          }
        }
      });
    }
  }, [isSeller, id]);

  const receiverId = isSeller ? selectedBuyerId : gadget?.seller_id;
  
  const { messages, status, sendMessage } = useChat(id, token, receiverId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !receiverId) return;
    sendMessage(text);
    setText('');
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!gadget) return <div className="p-8 text-center">Gadget not found</div>;

  return (
    <div className="chat-container">
      <div className={`chat-layout ${isSeller ? 'with-sidebar' : ''}`}>
        
        {isSeller && (
          <div className="chat-sidebar glass-panel">
            <h3>Active Chats</h3>
            {activeBuyers.length === 0 ? (
              <p className="sidebar-empty">No buyers have initiated contact.</p>
            ) : (
              activeBuyers.map(bId => (
                <div 
                  key={bId}
                  className={`chat-user-item ${selectedBuyerId === bId ? 'active' : ''}`}
                  onClick={() => setSelectedBuyerId(bId)}
                >
                  <User size={16} />
                  <span>Buyer...{bId.slice(-4)}</span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="chat-widget glass-panel">
          <div className="chat-header">
            <img src={gadget.image_urls?.[0] || 'https://via.placeholder.com/50'} alt="Gadget" className="chat-avatar" />
            <div className="chat-title-area">
              <h3>{gadget.title} {isSeller && selectedBuyerId && `(w/ Buyer...${selectedBuyerId.slice(-4)})`}</h3>
              <span className={`chat-status ${status}`}>{status}</span>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">Start the conversation...</div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.sender_id === user.id; 
                return (
                  <motion.div 
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}
                  >
                    <p>{msg.message}</p>
                    <span className="chat-time">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </span>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="chat-input-area">
            <input 
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              disabled={status !== 'connected' || (isSeller && !selectedBuyerId)}
            />
            <button type="submit" className="btn-primary" disabled={!text.trim() || status !== 'connected' || (isSeller && !selectedBuyerId)}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
