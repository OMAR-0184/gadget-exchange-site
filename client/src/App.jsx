import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Catalog from './pages/Catalog';
import Login from './pages/Login';
import Register from './pages/Register';
import GadgetDetail from './pages/GadgetDetail';
import CreateListing from './pages/CreateListing';
import Bargain from './pages/Bargain';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  return token ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { token, user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!token) return <Navigate to="/login" />;
  if (!user?.is_admin) return <Navigate to="/" />;
  return children;
};

function AppRoutes() {
  return (
    <Router>
      <div className="app-wrapper">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/gadget/:id" element={<GadgetDetail />} />
            <Route 
              path="/create-listing" 
              element={
                <PrivateRoute>
                  <CreateListing />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/gadget/:id/bargain" 
              element={
                <PrivateRoute>
                  <Bargain />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/gadget/:id/chat" 
              element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/orders" 
              element={
                <PrivateRoute>
                  <Orders />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/order/:id" 
              element={
                <PrivateRoute>
                  <OrderDetail />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/cart" 
              element={
                <PrivateRoute>
                  <Cart />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/wishlist" 
              element={
                <PrivateRoute>
                  <Wishlist />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
