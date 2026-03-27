import React, { useState, useEffect } from 'react';
import { UsersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User, MapPin, Phone, Mail, Loader, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import './Profile.css';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    address: '',
    phone: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await UsersAPI.getProfile();
        setProfile(data);
        setFormData({
          address: data.address || '',
          phone: data.phone || ''
        });
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const updated = await UsersAPI.updateAddress({
        address: formData.address,
        phone: formData.phone
      });
      setProfile(updated);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <Loader className="spinner" size={40} />
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="profile-container animate-fade-in"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account details and delivery address.</p>
      </div>

      <div className="profile-content">
        <div className="profile-card glass-panel">
          <div className="profile-info-section">
            <div className="info-item">
              <User size={24} className="info-icon" />
              <div>
                <label>Full Name</label>
                <p>{profile?.full_name || user?.full_name}</p>
              </div>
            </div>
            <div className="info-item">
              <Mail size={24} className="info-icon" />
              <div>
                <label>Email Address</label>
                <p>{profile?.email || user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-address-section glass-panel">
          <h2>Delivery Details</h2>
          <form className="address-form" onSubmit={handleSubmit}>
            {error && <div className="form-alert error">{error}</div>}
            {success && <div className="form-alert success">{success}</div>}

            <div className="form-group">
              <label htmlFor="address">
                <MapPin size={16} /> Shipping Address
              </label>
              <textarea 
                id="address"
                name="address" 
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St, City, State 12345"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={16} /> Phone Number
              </label>
              <input 
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1234567890"
                required
              />
            </div>

            <button type="submit" className="btn-primary submit-btn" disabled={saving}>
              {saving ? <Loader className="spinner" size={18} /> : <Save size={18} />}
              <span>{saving ? 'Saving...' : 'Save Details'}</span>
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
