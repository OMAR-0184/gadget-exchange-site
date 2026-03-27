import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GadgetAPI } from '../services/api';
import { UploadCloud, CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import './CreateListing.css';

export default function CreateListing() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'smartphones',
    price: '',
    condition: 'good'
  });
  
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const categories = ['smartphones', 'laptops', 'audio', 'tablets', 'gaming', 'other'];
  const conditions = [
    { value: 'new', label: 'New (Sealed)' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Optional: Validate file size (e.g. max 5MB)
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      setError('Some files were ignored because they exceed the 5MB limit.');
    }

    setImages(prev => [...prev, ...validFiles]);
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('price', parseFloat(formData.price));
      data.append('condition', formData.condition);

      images.forEach(img => {
        data.append('images', img);
      });

      const response = await GadgetAPI.create(data);
      navigate(`/gadget/${response.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-listing-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel form-card"
      >
        <div className="form-header">
          <h1>Sell Your Gadget</h1>
          <p>List your device and start receiving offers today.</p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="listing-form">
          <div className="form-section">
            <h3>Basic Details</h3>
            
            <div className="form-group">
              <label>What are you selling?</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleInputChange}
                required 
                placeholder="e.g. iPhone 14 Pro Max 256GB"
                maxLength={100}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  {categories.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Condition</label>
                <select name="condition" value={formData.condition} onChange={handleInputChange}>
                  {conditions.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Price ($)</label>
              <input 
                type="number" 
                name="price" 
                value={formData.price} 
                onChange={handleInputChange}
                required 
                min="1" 
                step="0.01"
                placeholder="899.99"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                required 
                rows="5"
                placeholder="Describe your gadget's features, specs, and any flaws..."
              ></textarea>
            </div>
          </div>

          <div className="form-section">
            <h3>Photos</h3>
            <p className="section-hints">Upload clear photos showing the screen, sides, and any damage. (Max 5MB each)</p>
            
            <div className="image-upload-area">
              <input 
                type="file" 
                id="images" 
                accept="image/*" 
                multiple 
                onChange={handleImageChange} 
                className="hidden-input"
              />
              <label htmlFor="images" className="upload-label">
                <UploadCloud size={40} className="upload-icon" />
                <span>Click to browse or drag photos here</span>
              </label>
            </div>

            {previews.length > 0 && (
              <div className="image-previews">
                {previews.map((src, idx) => (
                  <div key={idx} className="preview-item">
                    <img src={src} alt="Preview" />
                    <button type="button" className="remove-btn" onClick={() => removeImage(idx)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn-primary form-submit" disabled={loading}>
              {loading ? 'Publishing...' : (
                <>
                  <CheckCircle size={18} />
                  <span>Publish Listing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
