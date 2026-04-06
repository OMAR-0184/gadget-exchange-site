import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { UserPlus, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import './Auth.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, fullName);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="auth-card glass-panel"
      >
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join Vantage Tech today</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              required 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary auth-submit">
            {loading ? 'Creating Account...' : (
              <>
                <UserPlus size={18} />
                <span>Register</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
