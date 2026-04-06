import React, { useEffect, useState } from 'react';
import { AuthAPI } from '../services/api';
import { AuthContext } from './auth-context';

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('gadget_token'));
  const decodedUser = token ? decodeJwt(token) : null;
  const user = token
    ? decodedUser
      ? { id: decodedUser.sub || decodedUser.user_id, ...decodedUser }
      : { authenticated: true }
    : null;

  useEffect(() => {
    if (token) {
      localStorage.setItem('gadget_token', token);
    } else {
      localStorage.removeItem('gadget_token');
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await AuthAPI.login(email, password);
    setToken(data.access_token);
    return data;
  };

  const register = async (email, password, fullName) => {
    const data = await AuthAPI.register(email, password, fullName);
    setToken(data.access_token);
    return data;
  };

  const logout = () => {
    setToken(null);
  };

  const value = {
    token,
    user,
    loading: false,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
