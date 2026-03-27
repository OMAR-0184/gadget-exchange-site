import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Smartphone, LogOut, PlusCircle, ShoppingCart, Heart } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar glass-panel">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <Smartphone size={28} className="brand-icon" />
          <span className="brand-text">GadgetMarket</span>
        </Link>
        
        <div className="nav-links">
          {token ? (
            <>
              <Link to="/dashboard" className="btn-secondary nav-btn">
                <span>Dashboard</span>
              </Link>
              <Link to="/orders" className="btn-secondary nav-btn">
                <span>Orders</span>
              </Link>
              <Link to="/profile" className="btn-secondary nav-btn">
                <span>Profile</span>
              </Link>
              <Link to="/wishlist" className="btn-secondary nav-btn">
                <Heart size={18} />
                <span>Wishlist</span>
              </Link>
              <Link to="/cart" className="btn-secondary nav-btn">
                <ShoppingCart size={18} />
                <span>Cart</span>
              </Link>
              <Link to="/create-listing" className="btn-sell nav-btn">
                <PlusCircle size={18} />
                <span>SELL</span>
              </Link>
              <button onClick={handleLogout} className="btn-secondary nav-btn logout-btn">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary nav-btn">Login</Link>
              <Link to="/register" className="btn-primary nav-btn">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
