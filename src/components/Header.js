import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import './Header.css';
import logo from '../assests/logo.png';
import { HiMenu, HiX } from 'react-icons/hi';

const Header = ({ userEmail, onMenuToggle, isMenuOpen }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [isVoiceLoaded, setIsVoiceLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoiceLoading, setIsVoiceLoading] = useState(true);
  const chatIframeRef = useRef(null);
  const voiceIframeRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Preload the chat iframe after login
    if (userEmail && !isChatLoaded) {
      const iframe = document.createElement('iframe');
      iframe.src = "https://app.relevanceai.com/agents/f1db6c/40f9760672f4-47b5-89f9-e3cdb99d658d/3c8b5767-e8d6-44d9-a08a-d4b3c4993330/embed-chat?hide_tool_steps=true&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%2300002B&bubble_icon=pd%2Fchat&input_placeholder_text=Say+Hii+Here....&hide_logo=true";
      iframe.style.display = 'none';
      
      iframe.onload = () => {
        setIsChatLoaded(true);
        setIsLoading(false);
      };

      iframe.onerror = () => {
        console.error('Failed to load chat iframe');
        setIsLoading(false);
      };

      document.body.appendChild(iframe);
    }

    // Preload the voice assistant iframe after login
    if (userEmail && !isVoiceLoaded) {
      const iframe = document.createElement('iframe');
      iframe.src = "https://krishna2323777.github.io/agent/";
      iframe.style.display = 'none';
      
      iframe.onload = () => {
        setIsVoiceLoaded(true);
        setIsVoiceLoading(false);
      };
      iframe.onerror = () => {
        console.error('Failed to load voice assistant iframe');
        setIsVoiceLoading(false);
      };

      document.body.appendChild(iframe);
    }

    let kycChannel;
    let invoiceChannel;

    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found for subscriptions');
        return;
      }
      console.log('Setting up subscriptions for user:', user.id);

      // Subscribe to KYC document status changes
      kycChannel = supabase
        .channel('kyc-status-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'kyc_documents',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('KYC status change received:', payload);
            if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
              if (payload.new.status !== payload.old.status) {
                const message = getKycStatusMessage(payload.new.doc_type, payload.new.status);
                console.log('Adding KYC notification:', message);
                addNotification(message, 'kyc');
              }
            }
          }
        )
        .subscribe();

      // Subscribe to invoice visibility changes
      invoiceChannel = supabase
        .channel('invoice-visibility')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'private',  // Changed to private schema
            table: 'invoices',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Invoice change received:', payload);
            if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
              // Check if visible_to_client changed from false to true
              if (!payload.old.visible_to_client && payload.new.visible_to_client) {
                const message = `New invoice #${payload.new.invoice_number || 'N/A'} is available for viewing`;
                console.log('Adding invoice notification:', message);
                addNotification(message, 'invoice');
              }
            }
          }
        )
        .subscribe();

      return () => {
        if (kycChannel) kycChannel.unsubscribe();
        if (invoiceChannel) invoiceChannel.unsubscribe();
      };
    };

    // Function to format invoice notification message
    const getInvoiceMessage = (invoice) => {
      return `New invoice #${invoice.invoice_number || 'N/A'} is available for viewing`;
    };

    setupSubscriptions();
    fetchExistingNotifications();

    return () => {
      if (kycChannel) kycChannel.unsubscribe();
      if (invoiceChannel) invoiceChannel.unsubscribe();
    };
  }, [userEmail, isChatLoaded, isVoiceLoaded]);

  const fetchExistingNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user found for fetching notifications');
      return;
    }
    console.log('Fetching notifications for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log('Fetched notifications:', data);
      if (data && data.length > 0) {
        setNotifications(data);
        const unreadCount = data.filter(n => !n.read).length;
        setUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error('Error in fetchExistingNotifications:', error);
    }
  };

  const getKycStatusMessage = (docType, status) => {
    const docName = docType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    switch (status?.toLowerCase()) {
      case 'approved':
        return `Your ${docName} has been approved`;
      case 'rejected':
        return `Your ${docName} has been rejected. Please upload a new document`;
      case 'pending':
        return `Your ${docName} is under review`;
      default:
        return `Status update for ${docName}: ${status}`;
    }
  };

  const addNotification = async (message, type) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found for adding notification');
      return;
    }

    console.log('Adding notification:', {
      message,
      type,
      user_id: user.id,
      timestamp: new Date().toISOString()
    });

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          message,
          type,
          read: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding notification:', error);
        throw error;
      }

      console.log('Notification added successfully:', data);
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
      return data;
    } catch (error) {
      console.error('Error in addNotification:', error);
      throw error;
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const renderNotification = (notification) => {
    const isUnread = !notification.read;
    return (
      <div 
        key={notification.id} 
        className={`notification-item ${isUnread ? 'unread' : ''}`}
        onClick={() => markNotificationAsRead(notification.id)}
      >
        <div className="notification-icon">
          {notification.type === 'kyc' ? '📄' : '📋'}
        </div>
        <div className="notification-content">
          <p>{notification.message}</p>
          <span className="notification-time">
            {new Date(notification.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  const renderNotificationsDropdown = () => {
    return (
      <div className="notifications-dropdown">
        <div className="notifications-header">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={markAllNotificationsAsRead}>
              Mark all as read
            </button>
          )}
        </div>
        <div className="notifications-list">
          {notifications.length > 0 ? (
            notifications.map(notification => renderNotification(notification))
          ) : (
            <div className="no-notifications">
              No notifications
            </div>
          )}
        </div>
      </div>
    );
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', (await supabase.auth.getUser()).data.user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const toggleSupportChat = () => {
    if (!showSupportChat && !isChatLoaded) {
      setIsLoading(true);
    }
    setShowSupportChat(!showSupportChat);
  };

  const toggleVoiceAssistant = () => {
    if (!showVoiceAssistant && !isVoiceLoaded) {
      setIsVoiceLoading(true);
    }
    setShowVoiceAssistant(!showVoiceAssistant);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        {isMobile && (
          <div className="menu-btn" onClick={onMenuToggle}>
            {isMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
          </div>
        )}
        <div className="header-logo">
          <img src={logo} alt="Company Logo" />
        </div>
      </div>

      {/* Header spacer to replace search bar and maintain layout */}
      <div className="header-spacer"></div>
      
      <div className="header-actions">
        {/* Voice Assistant with improved icon */}
        <div className="voice-assistant">
          <button 
            className="icon-button" 
            title="Voice Assistant"
            onClick={toggleVoiceAssistant}
          >
            <span className="assistant-icon">🎙️</span>
          </button>
          {showVoiceAssistant && (
            <div className="support-chat-popup voice-popup" style={{
              width: '400px',  // Increased from default
              height: '500px', // Increased from default
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}>
              <div className="support-chat-header">
                <span>Voice Assistant</span>
                <button className="close-chat" onClick={toggleVoiceAssistant}>×</button>
              </div>
              <div className="support-chat-content" style={{ height: 'calc(100% - 40px)' }}>
                {isVoiceLoading && (
                  <div className="chat-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading voice assistant...</span>
                  </div>
                )}
                <iframe
                  ref={voiceIframeRef}
                  src="https://krishna2323777.github.io/agent/"
                  title="Voice Assistant"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ 
                    display: isVoiceLoading ? 'none' : 'block',
                    width: '100%',
                    height: '100%',
                    borderRadius: '0 0 10px 10px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Client Support with bot image */}
        <div className="client-support">
          <button 
            className="icon-button" 
            title="Client Support" 
            onClick={toggleSupportChat}
          >
            <span className="support-icon">🤖</span>
          </button>
          {showSupportChat && (
            <div className="support-chat-popup">
              <div className="support-chat-header">
                <span>Client Support</span>
                <button className="close-chat" onClick={toggleSupportChat}>×</button>
              </div>
              <div className="support-chat-content">
                {isLoading && (
                  <div className="chat-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading chat...</span>
                  </div>
                )}
                <iframe
                  ref={chatIframeRef}
                  src="https://app.relevanceai.com/agents/f1db6c/40f9760672f4-47b5-89f9-e3cdb99d658d/3c8b5767-e8d6-44d9-a08a-d4b3c4993330/embed-chat?hide_tool_steps=true&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%2300002B&bubble_icon=pd%2Fchat&input_placeholder_text=Say+Hii+Here....&hide_logo=true"
                  title="Client Support Chat"
                  width="300px"
                  height="400px"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ display: isLoading ? 'none' : 'block' }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Notifications - empty but kept for layout consistency */}
        <div className="notifications-container">
          <button 
            className="notifications-button"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {unreadCount > 0 && (
              <span className="notifications-badge">{unreadCount}</span>
            )}
          </button>
          {showNotifications && renderNotificationsDropdown()}
        </div>
        
        {/* User Profile */}
        <div className="user-profile">
          <div className="user-avatar" onClick={toggleUserMenu}>
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>
          
          {showUserMenu && (
            <div className="dropdown-menu user-dropdown">
              <div className="user-info">
                <div className="user-avatar-large">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-details">
                  <span className="user-name">{userEmail || 'User'}</span>
                  <span className="user-role">Client</span>
                </div>
              </div>
              
              <ul className="user-menu-list">
                
                <li onClick={() => navigate('/settings')}>
                  <span className="menu-icon">⚙️</span>
                  <span>Settings</span>
                </li>
                <li onClick={handleLogout}>
                  <span className="menu-icon">🚪</span>
                  <span>Logout</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
