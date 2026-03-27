import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('gadget_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to decode JWT
  const decodeJwt = (t) => {
    try {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch(e) { return null; }
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem('gadget_token', token);
      const decoded = decodeJwt(token);
      // Fallback object if decoding fails but we have a token
      setUser(decoded ? { id: decoded.sub || decoded.user_id, ...decoded } : { authenticated: true });
    } else {
      localStorage.removeItem('gadget_token');
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const data = await AuthAPI.login(email, password);
      // Data returns: { access_token, token_type }
      setToken(data.access_token);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const register = async (email, password, fullName) => {
    try {
      const data = await AuthAPI.register(email, password, fullName);
      // Data returns: { user_id, access_token, token_type }
      setToken(data.access_token);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
