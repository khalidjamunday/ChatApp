import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserList from './UserList';
import MessageArea from './MessageArea';
import { io } from 'socket.io-client';
import { FiLogOut, FiUsers, FiMessageCircle, FiCheckCircle, FiAlertTriangle, FiMoon, FiSun, FiTrash2, FiMenu, FiChevronRight, FiChevronLeft, FiX, FiMoreVertical} from 'react-icons/fi';
import CreateGroup from './CreateGroup';

// Beautiful Toast component
const Toast = ({ message, onClose }) => (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 flex items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl z-50 animate-fade-in-up transition-all max-w-xs sm:max-w-md">
    <FiCheckCircle className="mr-2 sm:mr-3 text-lg sm:text-2xl text-white drop-shadow flex-shrink-0" />
    <span className="font-medium text-sm sm:text-base">{message}</span>
    <button className="ml-3 sm:ml-6 text-white text-lg sm:text-xl hover:text-emerald-200 transition-colors flex-shrink-0" onClick={onClose} aria-label="Close toast">×</button>
  </div>
);

// Beautiful Logout Confirmation Modal
const LogoutConfirmationModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100] animate-fade-in p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md text-center relative">
      <div className="flex justify-center mb-4">
        <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3 flex items-center justify-center">
          <FiAlertTriangle className="text-red-500 text-2xl sm:text-3xl" />
        </div>
      </div>
      <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Confirm Logout</h2>
      <p className="mb-6 text-gray-600 dark:text-gray-300 text-sm sm:text-base">Are you sure you want to logout?</p>
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
        <button
          className="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all text-sm sm:text-base"
          onClick={onConfirm}
        >
          Yes, Logout
        </button>
        <button
          className="px-5 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm sm:text-base"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      <button
        className="absolute top-2 sm:top-3 right-2 sm:right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl sm:text-2xl focus:outline-none"
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
  const [selectedChat, setSelectedChat] = useState(null);
  const [users, setUsers] = useState([]);
  const [messagesMap, setMessagesMap] = useState({}); // Use object as map
  const messages = Object.values(messagesMap).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showUserList, setShowUserList] = useState(false); // Changed default to false for mobile-first
  const messagesEndRef = useRef(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const currentChatUserIdRef = useRef(null);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const pendingMessagesRef = useRef([]);
  const [listeningForRealtime, setListeningForRealtime] = useState(true);
  const listeningForRealtimeRef = useRef(listeningForRealtime);
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Dropdown close on click outside
  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('.dropdown-menu') && !e.target.closest('.dropdown-trigger')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-show sidebar on larger screens
      if (window.innerWidth >= 1024) {
        setShowUserList(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar when selecting a chat on mobile
  const handleSelectChat = (item) => {
    if (selectedChat?._id === item._id) return;

    if (item && item.members) {
      socket?.emit('joinGroup', item._id);
    }
    setSelectedChat(item);
    
    // Close sidebar on mobile after selecting
    if (isMobile) {
      setShowUserList(false);
    }
  };

  useEffect(() => {
    listeningForRealtimeRef.current = listeningForRealtime;
  }, [listeningForRealtime]);

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
      
      const usersArray = Array.isArray(usersData) ? usersData : [];
      setUsers(usersArray);
      
      const onlineUserIds = new Set(usersArray.filter(u => u.isOnline).map(u => u._id));
      setOnlineUsers(onlineUserIds);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

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
    const newSocket = io(`${process.env.REACT_APP_BACKEND_URL}`);
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
      const currentChatId = currentChatUserIdRef.current;
      if (!listeningForRealtimeRef.current || !currentChatId) return;

      const isDirectMessageForCurrentChat =
        !message.group &&
        (message.sender._id === currentChatId || message.recipient._id === currentChatId);

      const isGroupMessageForCurrentChat =
        message.group && message.group._id === currentChatId;

      if (isDirectMessageForCurrentChat || isGroupMessageForCurrentChat) {
        setMessagesMap((prev) => {
          if (prev[message._id]) {
            return prev; // Skip duplicate
          }
          return { ...prev, [message._id]: message };
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

    // Listen for message deletion events
    newSocket.on('messageDeleted', ({ messageId, deletedBy }) => {
      console.log('Message deleted:', messageId, 'by user:', deletedBy);
      setMessagesMap(prev => {
        const newMap = { ...prev };
        delete newMap[messageId];
        return newMap;
      });
    });

    // Listen for conversation deletion events
    newSocket.on('conversationDeleted', ({ deletedBy, messageIds }) => {
      console.log('Conversation deleted by:', deletedBy, 'messageIds:', messageIds);
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

  useEffect(() => {
    if (socket) {
      socket.on('onlineUsersList', (userIds) => {
        setOnlineUsers(new Set(userIds));
      });

      socket.emit('getOnlineUsers');
      
      return () => {
        socket.off('onlineUsersList');
      };
    }
  }, [socket]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when selected user changes
  useEffect(() => {
    if (!selectedChat) return;

    setMessagesMap({});
    const chatItem = selectedChat;

    const load = async () => {
      currentChatUserIdRef.current = chatItem._id;
      setFetchingMessages(true);
      setListeningForRealtime(false);
      try {
        const isGroup = !!chatItem.members;
        const url = isGroup
          ? `/api/messages/conversation/group/${chatItem._id}`
          : `/api/messages/conversation/${chatItem._id}`;
        console.log('[LOAD] Selected chat:', chatItem);
        console.log('[LOAD] Is group:', isGroup);
        console.log('[LOAD] Fetching URL:', url);
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
        if (!response.ok) throw new Error('Failed to fetch messages');
        const fetchedMessages = await response.json();
        console.log('[LOAD] Server response:', fetchedMessages);
        if (currentChatUserIdRef.current === chatItem._id) {
          const newMap = {};
          fetchedMessages.forEach(m => { newMap[m._id] = m; });
          setMessagesMap(newMap);
          console.log('[LOAD] Set messagesMap:', newMap);
        }
      } catch (error) {
        console.error('[LOAD] Error loading messages:', error);
        setMessagesMap({});
      } finally {
        if (currentChatUserIdRef.current === chatItem._id) {
          setListeningForRealtime(true);
          setFetchingMessages(false);
        }
      }
    };
    load();
  }, [selectedChat?._id]);

  // Fetch groups for the user
  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups/my', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      setGroups([]);
    }
  };

  // Load users and groups on mount
  useEffect(() => {
    loadUsers();
    loadGroups();
  }, []);

  // Handle group creation
  const handleCreateGroup = async (groupData) => {
    const response = await fetch('/api/groups/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(groupData)
    });
    if (!response.ok) throw new Error('Failed to create group');
    setShowCreateGroup(false);
    await loadGroups();
  };

  // Send message (user or group)
  const sendMessage = async (content) => {
    if (!selectedChat || !content.trim()) return;
    const isGroup = selectedChat.members;
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(isGroup ? {
          groupId: selectedChat._id,
          content: content.trim()
        } : {
          recipientId: selectedChat._id,
          content: content.trim()
        })
      });
      if (!response.ok) throw new Error('Failed to send message');
    } catch (error) {
      alert('Failed to send message. Please try again.');
    }
  };

  const handleTyping = (isTyping) => {
    if (selectedChat && socket) {
      socket.emit('typing', {
        userId: user._id,
        recipientId: selectedChat._id,
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

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowUserList(prev => !prev);
  };

  return (
    <div className={`h-screen flex ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} relative`}>
      {showToast && (
        <Toast message={`Welcome, ${user.username}!`} onClose={() => setShowToast(false)} />
      )}
      {showLogoutModal && (
        <LogoutConfirmationModal onConfirm={confirmLogout} onCancel={cancelLogout} />
      )}
      
      {/* Mobile Overlay */}
      {isMobile && showUserList && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setShowUserList(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        showUserList 
          ? isMobile 
            ? 'fixed inset-y-0 left-0 w-80 z-50' 
            : 'w-80' 
          : isMobile 
            ? 'fixed inset-y-0 left-0 w-0 z-50 -translate-x-full opacity-0' 
            : 'w-0 lg:w-16'
      } bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 flex flex-col overflow-hidden`}>
        
        {/* Header */}
        <div className={`p-3 sm:p-4 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex-shrink-0`}>
          {showUserList ? (
            <>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`font-semibold text-sm sm:text-base truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.username}</h2>
                  <p className="text-xs sm:text-sm text-green-600">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {isMobile && (
                  <button
                    onClick={() => setShowUserList(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-1 sm:p-2"
                    title="Hide sidebar"
                  >
                    <FiX size={18} />
                  </button>
                )}
                <button
                  onClick={toggleDarkMode}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-yellow-400 transition-colors p-1 sm:p-2"
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 sm:p-2"
                  title="Logout"
                >
                  <FiLogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-2 sm:space-y-4 w-full">
              <button
                onClick={() => setShowUserList(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                title="Show users"
              >
                <FiUsers size={18} />
              </button>
              <button
                onClick={toggleDarkMode}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-yellow-400 transition-colors p-1"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                title="Logout"
              >
                <FiLogOut size={18} />
              </button>
            </div>
          )}
        </div>

        {/* User and Group List */}
        {showUserList && (
          <UserList
            users={users}
            groups={groups}
            selectedChat={selectedChat}
            onSelectItem={handleSelectChat}
            onlineUsers={onlineUsers}
            currentUser={user}
            darkMode={darkMode}
            onCreateGroupClick={() => setShowCreateGroup(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header when sidebar is hidden */}
        {isMobile && !showUserList && (
          <div className={`p-3 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} lg:hidden`}>
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2"
              title="Show sidebar"
            >
              <FiMenu size={20} />
            </button>
            {selectedChat && (
              <div className="flex items-center space-x-2 flex-1 min-w-0 ml-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                  ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}>
                  {selectedChat && (selectedChat.members ? selectedChat.name.charAt(0).toUpperCase() : selectedChat.username.charAt(0).toUpperCase())}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedChat && (selectedChat.members ? selectedChat.name : selectedChat.username)}
                  </h3>
                </div>
              </div>
            )}
            {/* Mobile Delete Button */}
            {selectedChat && !selectedChat.members && (
              <div className="flex items-center gap-2 relative flex-shrink-0">
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-gray-300 dropdown-trigger p-1"
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-label="More options"
                >
                  <FiMoreVertical size={18} />
                </button>
                {dropdownOpen && (
                  <div className={`dropdown-menu absolute right-0 top-8 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-fade-in-up`}>
                    <ul className="py-1">
                      <li>
                        <button
                          className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 text-sm"
                          onClick={() => { setShowDeleteConfirm(true); setDropdownOpen(false); }}
                        >
                          <FiTrash2 /> Delete Chat
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedChat ? (
          <MessageArea
            selectedUser={selectedChat}
            messages={messages}
            onSendMessage={sendMessage}
            onTyping={handleTyping}
            typingUsers={typingUsers}
            currentUser={user}
            messagesEndRef={messagesEndRef}
            darkMode={darkMode}
            isMobile={isMobile}
            onDeleteConversation={async () => {
              if (!selectedChat || selectedChat.members) return;
              try {
                const response = await fetch(`/api/messages/conversation/${selectedChat._id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (!response.ok) throw new Error('Failed to delete conversation');
                setMessagesMap({});
                setShowToast('All messages deleted successfully.');
                setSelectedChat(null);
              } catch (err) {
                setShowToast('Failed to delete messages.');
              }
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <FiMessageCircle size={48} className="mx-auto text-gray-300 mb-4 sm:w-16 sm:h-16" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Welcome to ChatApp
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                {isMobile ? 'Tap the menu to select a chat' : 'Select a user from the sidebar to start chatting'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md text-center relative">
            <FiTrash2 className="mx-auto text-2xl sm:text-3xl text-red-500 mb-3" />
            <h2 className="text-base sm:text-lg font-bold mb-2 text-gray-900 dark:text-white">Delete Conversation?</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              Are you sure you want to delete all messages with <span className="font-semibold">{selectedChat?.username}</span>? This cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                className="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all text-sm sm:text-base"
                onClick={async () => {
                  if (!selectedChat || selectedChat.members) return;
                  try {
                    const response = await fetch(`/api/messages/conversation/${selectedChat._id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${getToken()}` }
                    });
                    if (!response.ok) throw new Error('Failed to delete conversation');
                    setMessagesMap({});
                    setShowToast('All messages deleted successfully.');
                    setSelectedChat(null);
                    setShowDeleteConfirm(false);
                  } catch (err) {
                    setShowToast('Failed to delete messages.');
                    setShowDeleteConfirm(false);
                  }
                }}
              >
                Yes, Delete
              </button>
              <button
                className="px-5 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm sm:text-base"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroup
        users={users}
        onCreate={handleCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        show={showCreateGroup}
        currentUser={user}
        darkMode={darkMode}
      />
    </div>
  );
};

export default Chat;