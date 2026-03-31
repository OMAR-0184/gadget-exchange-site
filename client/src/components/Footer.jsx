import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Shield, Headphones } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="vt-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 className="footer-logo">Vantage Tech</h3>
            <p className="footer-tagline">
              The precision marketplace for high-end technology and curated digital excellence.
            </p>
            <div className="footer-icons">
              <Globe size={18} />
              <Shield size={18} />
              <Headphones size={18} />
            </div>
          </div>

          <div className="footer-col">
            <h4>Marketplace</h4>
            <Link to="/">Browse</Link>
            <Link to="/">Categories</Link>
            <Link to="/">Deals</Link>
            <Link to="/create-listing">Sell on Vantage</Link>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>

          <div className="footer-newsletter">
            <h4>Newsletter</h4>
            <div className="newsletter-form">
              <input type="email" placeholder="Your email" />
              <button className="btn-primary newsletter-btn">Join</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2024 Vantage Tech. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
