import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import Header from './Header';
import Sidebar from './Sidebar';
import { NavLink } from 'react-router-dom';

import './Layout.css';

const Layout = () => {
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {  // Example for Sidebar component
  // ...existing code...
  <NavLink to="/mailbox" className="sidebar-link">
    <span role="img" aria-label="mailbox">📬</span> Mailbox
  </NavLink>
  // ...existing code...
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        // If no session, redirect to login
        if (!data.session) {
          navigate('/login');
          return;
        }
        
        setUserEmail(data.session.user.email);
      } catch (error) {
        console.error('Error fetching user session:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, [navigate]);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Header userEmail={userEmail} />
      <Sidebar onToggle={handleSidebarToggle} />
      <main className="app-content">
        <Outlet context={{ userEmail }} />
      </main>
 
    </div>
  );
  
};

export default Layout;