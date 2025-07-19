import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserList from './UserList';
import MessageArea from './MessageArea';
import { io } from 'socket.io-client';
import { FiLogOut, FiUsers, FiMessageCircle, FiCheckCircle, FiAlertTriangle, FiMoon, FiSun } from 'react-icons/fi';

// Beautiful Toast component
const Toast = ({ message, onClose }) => (
  <div className="fixed top-6 left-1/2 transform -translate-x-1/2 flex items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-fade-in-up transition-all">
    <FiCheckCircle className="mr-3 text-2xl text-white drop-shadow" />
    <span className="font-medium text-base">{message}</span>
    <button className="ml-6 text-white text-xl hover:text-emerald-200 transition-colors" onClick={onClose} aria-label="Close toast">×</button>
  </div>
);

// Beautiful Logout Confirmation Modal
const LogoutConfirmationModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 text-center relative">
      <div className="flex justify-center mb-4">
        <div className="bg-red-100 rounded-full p-3 flex items-center justify-center">
          <FiAlertTriangle className="text-red-500 text-3xl" />
        </div>
      </div>
      <h2 className="text-xl font-bold mb-2 text-gray-900">Confirm Logout</h2>
      <p className="mb-6 text-gray-600">Are you sure you want to logout?</p>
      <div className="flex justify-center space-x-4">
        <button
          className="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
          onClick={onConfirm}
        >
          Yes, Logout
        </button>
        <button
          className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      <button
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl focus:outline-none"
        onClick={onCancel}
        aria-label="Close modal"
      >
        ×
      </button>
    </div>
  </div>
);

const Chat = () => {
  const { user, logout } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [messagesMap, setMessagesMap] = useState({}); // Use object as map
  const messages = Object.values(messagesMap).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showUserList, setShowUserList] = useState(true);
  const messagesEndRef = useRef(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const currentChatUserIdRef = useRef(null); // NEW
  const [fetchingMessages, setFetchingMessages] = useState(false); // NEW
  const pendingMessagesRef = useRef([]); // NEW
  const [listeningForRealtime, setListeningForRealtime] = useState(true); // NEW
  const listeningForRealtimeRef = useRef(listeningForRealtime); // NEW
  useEffect(() => {
    listeningForRealtimeRef.current = listeningForRealtime;
  }, [listeningForRealtime]);
  // REMOVED: const [loadingMessages, setLoadingMessages] = useState(false);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Show toast on login
  useEffect(() => {
    if (user && user.username) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    console.log('Connecting to Socket.IO with user ID:', user._id);

    // Join with user ID
    newSocket.emit('join', user._id);
    console.log('Emitting join event with user ID:', user._id);

    // Listen for online/offline events
    newSocket.on('userOnline', (userId) => {
      console.log('User came online:', userId);
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    newSocket.on('userOffline', (userId) => {
      console.log('User went offline:', userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Listen for new messages
    newSocket.on('newMessage', (message) => {
      console.log('[socket newMessage] Received:', message._id, 'for chat:', currentChatUserIdRef.current, 'msg sender:', message.sender._id, 'msg recipient:', message.recipient._id);
      if (
        listeningForRealtimeRef.current &&
        currentChatUserIdRef.current &&
        (message.sender._id === currentChatUserIdRef.current || message.recipient._id === currentChatUserIdRef.current)
      ) {
        setMessagesMap(prev => {
          if (prev[message._id]) {
            console.log('[socket newMessage] Duplicate detected, skipping:', message._id);
            return prev;
          }
          const updated = { ...prev, [message._id]: message };
          console.log('[socket newMessage] State after add:', Object.keys(updated));
          return updated;
        });
      }
    });
    

    // Listen for typing indicators
    newSocket.on('userTyping', ({ userId, isTyping }) => {
      setTypingUsers(prev => ({
        ...prev,
        [userId]: isTyping
      }));
    });

    // Listen for message read receipts
    newSocket.on('messageRead', ({ messageId, readBy }) => {
      setMessagesMap(prev => 
        Object.fromEntries(Object.entries(prev).map(([id, msg]) => 
          msg._id === messageId 
            ? [id, { ...msg, isRead: true, readBy: [...(msg.readBy || []), readBy] }]
            : [id, msg]
        ))
      );
    });

    // NEW: Listen for message deletion events
    newSocket.on('messageDeleted', ({ messageId, deletedBy }) => {
      console.log('Message deleted:', messageId, 'by user:', deletedBy);
      // Remove the deleted message from the current view
      setMessagesMap(prev => {
        const newMap = { ...prev };
        delete newMap[messageId];
        return newMap;
      });
    });

    // NEW: Listen for conversation deletion events
    newSocket.on('conversationDeleted', ({ deletedBy, messageIds }) => {
      console.log('Conversation deleted by:', deletedBy, 'messageIds:', messageIds);
      // Remove all deleted messages from the current view
      setMessagesMap(prev => {
        const newMap = { ...prev };
        messageIds.forEach(id => delete newMap[id]);
        return newMap;
      });
    });

    return () => {
      newSocket.off('userOnline');
      newSocket.off('userOffline');
      newSocket.off('newMessage');
      newSocket.off('userTyping');
      newSocket.off('messageRead');
      newSocket.off('messageDeleted');
      newSocket.off('conversationDeleted');
      newSocket.close();
    };
  }, [user._id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load users on component mount (no polling for online status)
  useEffect(() => {
    loadUsers();
  }, []);

  // On mount, request current online users from server
  useEffect(() => {
    if (socket) {
      socket.emit('getOnlineUsers');
      socket.on('onlineUsersList', (userIds) => {
        console.log('Received online users list:', userIds);
        setOnlineUsers(new Set(userIds));
      });
    }
    return () => {
      if (socket) {
        socket.off('onlineUsersList');
      }
    };
  }, [socket]);

  // Load messages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      setMessagesMap({}); // Clear messages immediately on chat switch
      setListeningForRealtime(false); // Ignore real-time during fetch
      currentChatUserIdRef.current = selectedUser._id; // Track current chat
      loadMessages(selectedUser._id);
    }
  }, [selectedUser]);

  // Get token from localStorage for authenticated requests
  const getToken = () => localStorage.getItem('token');

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const usersData = await response.json();
      
      // Ensure usersData is an array
      const usersArray = Array.isArray(usersData) ? usersData : [];
      console.log('Loaded users:', usersArray);
      console.log('Users with online status:', usersArray.map(u => ({ username: u.username, isOnline: u.isOnline })));
      setUsers(usersArray);
      
      // Set online users
      const onlineUserIds = new Set(usersArray.filter(u => u.isOnline).map(u => u._id));
      console.log('Online users:', Array.from(onlineUserIds));
      setOnlineUsers(onlineUserIds);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const loadMessages = async (userId) => {
    console.log('[loadMessages] Start fetching for user:', userId);
    setFetchingMessages(true);
    setListeningForRealtime(false);
    try {
      const response = await fetch(`/api/messages/conversation/${userId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const fetchedMessages = await response.json();
      console.log('[loadMessages] Fetched messages:', fetchedMessages.map(m => m._id));
      if (currentChatUserIdRef.current === userId) {
        const newMap = {};
        fetchedMessages.forEach(m => { newMap[m._id] = m; });
        setMessagesMap(newMap);
        setListeningForRealtime(true);
        setTimeout(() => {
          // Log after state update
          console.log('[loadMessages] State after setMessagesMap:', Object.keys(newMap));
        }, 0);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessagesMap({});
      setListeningForRealtime(true);
    } finally {
      setFetchingMessages(false);
    }
  };
  

  const sendMessage = async (content) => {
    if (!selectedUser || !content.trim()) return;

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          recipientId: selectedUser._id,
          content: content.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // No socket.emit here! The backend will emit the newMessage event after saving.
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleTyping = (isTyping) => {
    if (selectedUser && socket) {
      socket.emit('typing', {
        userId: user._id,
        recipientId: selectedUser._id,
        isTyping
      });
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Improved delete handlers
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) {
      console.error('No message ID provided');
      return;
    }

    try {
      console.log('Deleting message:', messageId);
      const token = getToken();
      
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Delete message result:', result);

      // Remove the message from local state immediately
      setMessagesMap(prev => {
        const newMap = { ...prev };
        delete newMap[messageId];
        return newMap;
      });
      
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedUser) {
      console.error('No selected user');
      return;
    }

    try {
      console.log('Deleting chat with user:', selectedUser._id);
      const token = getToken();
      
      const response = await fetch(`/api/messages/conversation/${selectedUser._id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Delete chat result:', result);

      // Clear all messages from local state immediately
      setMessagesMap({});
      
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Diagnostic logging for duplicates
  useEffect(() => {
    console.log('[messagesMap] keys:', Object.keys(messagesMap));
    console.log('[messages] array:', messages.map(m => ({ _id: m._id, content: m.content })));
  }, [messagesMap]);

  return (
    <div className={`h-screen flex ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {showToast && (
        <Toast message={`Welcome, ${user.username}!`} onClose={() => setShowToast(false)} />
      )}
      {showLogoutModal && (
        <LogoutConfirmationModal onConfirm={confirmLogout} onCancel={cancelLogout} />
      )}
      {/* Sidebar */}
      <div className={`${showUserList ? 'w-80' : 'w-16'} bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {showUserList ? (
            <>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.username}</h2>
                  <p className="text-sm text-green-600">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDarkMode}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-yellow-400 transition-colors mr-2"
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <FiLogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setShowUserList(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Show users"
              >
                <FiUsers size={20} />
              </button>
              <button
                onClick={toggleDarkMode}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-yellow-400 transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Logout"
              >
                <FiLogOut size={20} />
              </button>
            </div>
          )}
        </div>
        {/* User List */}
        {showUserList && (
          <UserList
            users={users}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
            onlineUsers={onlineUsers}
            currentUser={user}
            darkMode={darkMode}
          />
        )}
      </div>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <MessageArea
            selectedUser={selectedUser}
            messages={messages}
            onSendMessage={sendMessage}
            onTyping={handleTyping}
            typingUsers={typingUsers}
            currentUser={user}
            messagesEndRef={messagesEndRef}
            darkMode={darkMode}
            onDeleteMessage={handleDeleteMessage}
            onDeleteChat={handleDeleteChat}
            loadMessages={loadMessages}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FiMessageCircle size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to ChatApp
              </h3>
              <p className="text-gray-500">
                Select a user from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setShowUserList(!showUserList)}
        className="lg:hidden fixed bottom-4 right-4 bg-primary-600 text-white p-3 rounded-full shadow-lg z-50"
      >
        <FiUsers size={20} />
      </button>
    </div>
  );
};

export default Chat;