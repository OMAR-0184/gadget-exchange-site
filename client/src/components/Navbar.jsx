import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { Search, Bell, Heart, ShoppingCart, User, Shield } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { token, user } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-left">
          <Link to="/" className="nav-brand">Vantage Tech</Link>
          <div className="nav-links-text">
            <Link to="/">Browse</Link>
            <Link to="/dashboard">Deals</Link>
            <Link to="/">Categories</Link>
            {user?.is_admin && (
              <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontWeight: 600 }}>
                <Shield size={14} />
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="nav-right">
          <div className="nav-search">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search tech..." />
          </div>

          {token ? (
            <div className="nav-icons">
              <button className="icon-btn"><Bell size={20} /></button>
              <Link to="/wishlist" className="icon-btn"><Heart size={20} /></Link>
              <Link to="/cart" className="icon-btn cart-icon-link">
                <ShoppingCart size={20} />
                <span className="cart-label">Cart</span>
              </Link>
              <Link to="/profile" className="profile-btn">
                <div className="avatar">
                  <User size={18} />
                </div>
              </Link>
            </div>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="btn-secondary">Login</Link>
              <Link to="/register" className="btn-primary">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
