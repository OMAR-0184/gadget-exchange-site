import React, { useState, useEffect } from 'react';
import { GadgetAPI } from '../services/api';
import GadgetCard from '../components/GadgetCard';
import { Search, Filter, Loader } from 'lucide-react';
import './Catalog.css';

export default function Catalog() {
  const [gadgets, setGadgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  
  const categories = ['smartphones', 'laptops', 'audio', 'tablets', 'gaming', 'other'];

  const fetchGadgets = async (cursor = null, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = {
        limit: 12,
        search: search || undefined,
        category: category || undefined,
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
    // Debounce search slightly to avoid spamming API
    const timer = setTimeout(() => {
      fetchGadgets(null, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, category]);

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchGadgets(nextCursor, true);
    }
  };

  return (
    <div className="catalog-container animate-fade-in">
      <div className="catalog-header">
        <div className="catalog-title">
          <h1>Latest Gadgets</h1>
          <p>Discover premium tech from verified sellers.</p>
        </div>
        
        <div className="catalog-filters glass-panel">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="category-filter">
            <Filter size={18} className="filter-icon" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader className="spinner" size={40} />
          <p>Loading catalog...</p>
        </div>
      ) : gadgets.length === 0 ? (
        <div className="empty-state glass-panel">
          <h2>No gadgets found</h2>
          <p>Try adjusting your search or filters to find what you're looking for.</p>
          <button className="btn-secondary" onClick={() => { setSearch(''); setCategory(''); }}>
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
            <div className="load-more-container">
              <button 
                className="btn-secondary load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
