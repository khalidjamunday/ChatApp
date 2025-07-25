import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserList from './UserList';
import MessageArea from './MessageArea';
import { io } from 'socket.io-client';
import { FiLogOut, FiUsers, FiMessageCircle, FiCheckCircle, FiAlertTriangle, FiMoon, FiSun, FiTrash2, FiMenu, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import CreateGroup from './CreateGroup';

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
  const [selectedChat, setSelectedChat] = useState(null);
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
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  // Remove: const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Remove: const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

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

  // Handle user/group selection
  const handleSelect = (item) => {
    if (selectedChat?._id === item._id) return;

    if (item && item.members) {
      socket?.emit('joinGroup', item._id);
    }
    setSelectedChat(item);
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

  // Function to delete all chats with the selected user
  // Remove: handleDeleteConversation function

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
                {/* Sidebar close button, only on mobile and when sidebar is open */}
                {showUserList && (
                  <button
                    onClick={() => setShowUserList(false)}
                    className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2"
                    title="Hide sidebar"
                  >
                    <FiChevronLeft size={22} />
                  </button>
                )}
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
                {/* Expand sidebar button, only when sidebar is closed and on mobile */}
                {!showUserList && (
                  <button
                    onClick={() => setShowUserList(true)}
                    className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2"
                    title="Show sidebar"
                  >
                    <FiChevronRight size={22} />
                  </button>
                )}
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
        {/* User and Group List */}
        {showUserList && (
          <UserList
            users={users}
            groups={groups}
            selectedChat={selectedChat}
            onSelectItem={handleSelect}
            onlineUsers={onlineUsers}
            currentUser={user}
            darkMode={darkMode}
            onCreateGroupClick={() => setShowCreateGroup(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onToggleSidebar={() => setShowUserList((v) => !v)}
          />
        )}
      </div>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
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
            loadMessages={() => selectedChat && handleSelect(selectedChat)}
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
                setSelectedChat(null); // Clear chat view after deletion
              } catch (err) {
                setShowToast('Failed to delete messages.');
              }
            }}
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