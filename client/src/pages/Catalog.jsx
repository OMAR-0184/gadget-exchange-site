import React, { useState, useEffect } from 'react';
import { GadgetAPI } from '../services/api';
import GadgetCard from '../components/GadgetCard';
import { Search, Loader } from 'lucide-react';
import './Catalog.css';

export default function Catalog() {
  const [gadgets, setGadgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  
  const categories = ['smartphones', 'laptops', 'audio', 'gaming'];

  const fetchGadgets = async (cursor = null, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = {
        limit: 12,
        search: search || undefined,
        category: category || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        condition: condition.length > 0 ? condition.join(',') : undefined,
        sort_by: sortBy || undefined,
        cursor: cursor || undefined
      };
      
      const data = await GadgetAPI.list(params);
      
      if (isLoadMore) {
        setGadgets(prev => [...prev, ...(data.items || [])]);
      } else {
        setGadgets(data.items || []);
      }
      setNextCursor(data.next_cursor);
    } catch (err) {
      console.error("Failed to fetch gadgets:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGadgets(null, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, category, minPrice, maxPrice, condition, sortBy]);

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchGadgets(nextCursor, true);
    }
  };

  const toggleCondition = (cond) => {
    setCondition(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const handleApplyPrice = () => {
    fetchGadgets(null, false);
  };

  return (
    <div className="catalog-container animate-fade-in">
      {/* Hero Section */}
      <div className="catalog-hero">
        <div className="hero-text">
          <h1>Curated Tech for the<br /><span className="highlight-text">Digital Elite.</span></h1>
          <p>Discover a premium collection of vetted gadgets, from flagship smartphones to artisanal audio gear.</p>
        </div>
        <div className="hero-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Find your next gadget..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Pills + Sort */}
      <div className="catalog-controls">
        <div className="category-pills">
          <button className={`pill ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
          {categories.map(c => (
            <button key={c} className={`pill ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div className="sort-dropdown">
          <span className="text-muted">Sort by:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Filters Row */}
      <div className="catalog-filters">
        <div className="filter-section">
          <span className="filter-label">CONDITION</span>
          <div className="condition-checks">
            {['new', 'like_new', 'good', 'fair'].map(c => (
              <label key={c} className="check-item">
                <input 
                  type="checkbox" 
                  checked={condition.includes(c)} 
                  onChange={() => toggleCondition(c)} 
                />
                <span className="check-text">{c === 'like_new' ? 'Like New' : c.charAt(0).toUpperCase() + c.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="filter-section price-section">
          <span className="filter-label">PRICE RANGE</span>
          <div className="price-inputs">
            <div className="price-field">
              <span className="price-prefix">$</span>
              <input 
                type="number" 
                placeholder="Min" 
                value={minPrice} 
                onChange={(e) => setMinPrice(e.target.value)} 
                min="0" 
              />
            </div>
            <span className="price-dash">—</span>
            <div className="price-field">
              <span className="price-prefix">$</span>
              <input 
                type="number" 
                placeholder="Max" 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(e.target.value)} 
                min="0" 
              />
            </div>
            <button className="btn-primary apply-btn" onClick={handleApplyPrice}>Apply</button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="loading-state">
          <Loader className="spinner" size={40} />
          <p>Loading premium gadgets...</p>
        </div>
      ) : gadgets.length === 0 ? (
        <div className="empty-state glass-panel">
          <h2>No gadgets found</h2>
          <p>Try adjusting your search or filters to find what you're looking for.</p>
          <button className="btn-secondary" onClick={() => { setSearch(''); setCategory(''); setCondition([]); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="gadget-grid">
            {gadgets.map(gadget => (
              <GadgetCard key={gadget.id} gadget={gadget} />
            ))}
          </div>
          
          {nextCursor && (
            <div className="load-more-section">
              <div className="load-dots">
                <span className="dot active"></span>
                <span className="dot active"></span>
                <span className="dot"></span>
              </div>
              <button 
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Loading more premium gadgets...'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}