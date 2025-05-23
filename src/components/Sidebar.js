import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiIdentification, HiMenu } from "react-icons/hi";
import { AiOutlineCalendar } from "react-icons/ai";
import { MdSpaceDashboard } from "react-icons/md";
import { FaBuilding, FaChartPie, FaFileInvoiceDollar, FaEnvelope } from "react-icons/fa";
import { FiSettings } from "react-icons/fi";
import { PiCertificate } from "react-icons/pi";
import { Handshake, FileSignature, ClipboardList } from "lucide-react";
import { FaBuildingUser } from "react-icons/fa6";
import SupportButton from './SupportButton';
import Header from './Header'; // Add this import
import { supabase } from './SupabaseClient';
import './Sidebar.css';

const Sidebar = ({ onToggle }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [kvkExpanded, setKvkExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    if (onToggle) {
      onToggle(newCollapsedState);
    }
  };

  // Notify parent component of initial state on mount
  useEffect(() => {
    if (onToggle) {
      onToggle(collapsed);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDocumentsMenu = () => {
    setDocumentsExpanded(!documentsExpanded);
  };

  const toggleKvkMenu = () => {
    setKvkExpanded(!kvkExpanded);
  };

  const handleKVKRegistration = (e) => {
    e.preventDefault();
    navigate('/kvk-registration');
  };

  const toggleMobileMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  return (
    <>
      <Header 
        userEmail={userEmail}
        onMenuToggle={toggleMobileMenu}
        isMenuOpen={isOpen}
      />

      {isMobile && (
        <div className={`sidebar-backdrop ${isOpen ? 'active' : ''}`} onClick={toggleMobileMenu}></div>
      )}
      
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${isMobile ? (isOpen ? 'mobile-open' : 'mobile-closed') : ''}`}>
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          {collapsed ? '>' : '<'}
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon"><MdSpaceDashboard /></span>
                {!collapsed && <span className="label">Dashboard</span>}
              </NavLink>
            </li>
           
            <li>
              <NavLink to="/generate-forms" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon"><FaBuilding /></span>
                {!collapsed && <span className="label">Company profile</span>}
              </NavLink>
            </li>
            
            <li>
              <NavLink to="/registration" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon"><ClipboardList /></span>
                {!collapsed && <span className="label">Applications</span>}
              </NavLink>
            </li>
            
            <li>
              <NavLink to="/calendar" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon"><AiOutlineCalendar /></span>
                {!collapsed && <span className="label">Tasks</span>}
              </NavLink>
            </li>
            
            <li>
              <NavLink to="/financial-overview" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon"><FaChartPie /></span>
                {!collapsed && <span className="label">Finance</span>}
              </NavLink>
            </li>
            
            {/* KVK Registration with submenu */}
            
             
            {/* Documents with submenu */}
            <li className={documentsExpanded ? 'has-submenu expanded' : 'has-submenu'}>
              <div className="menu-item" onClick={toggleDocumentsMenu}>
                <span className="icon"><HiOutlineDocumentText /></span>
                {!collapsed && (
                  <>
                    <span className="label">Documents</span>
                    <span className="submenu-arrow">{documentsExpanded ? '▼' : '▶'}</span>
                  </>
                )}
              </div>
              
              {!collapsed && documentsExpanded && (
                <ul className="submenu">
                  <li>
                    <NavLink to="/documents/kyc" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                      <span className="icon"><HiIdentification/></span>
                      <span className="label">KYC Documents</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/documents/financial" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                      <span className="icon">< FaFileInvoiceDollar /></span>
                      <span className="label">Financial Documents</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/documents/certificate" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                      <span className="icon"><PiCertificate /></span>
                      <span className="label">Generate Certificate</span>
                    </NavLink>
                  </li>
                  
                </ul>
              )}
            </li>
            {/* Mailbox sidebar item */}
            <li>
              <NavLink to="/mailbox" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon"><FaEnvelope /></span>
                {!collapsed && <span className="label">Mailbox</span>}
              </NavLink>
            </li>
            
            <li>
              <NavLink to="/services" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon">< Handshake size={20} /></span>
                {!collapsed && <span className="label">Services</span>}
              </NavLink>
            </li>
            
           
            
            <li>
              <NavLink to="/settings" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                <span className="icon"><FiSettings /></span>
                {!collapsed && <span className="label">Settings</span>}
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="support-item">
          <SupportButton collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
