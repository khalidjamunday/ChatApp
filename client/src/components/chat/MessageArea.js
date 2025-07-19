import React, { useState, useEffect, useCallback } from 'react';
import { FiSend, FiMoreVertical, FiTrash2 } from 'react-icons/fi';
import ReactDOM from 'react-dom';

const MessageArea = ({ 
  selectedUser, 
  messages, 
  onSendMessage, 
  onTyping, 
  typingUsers, 
  currentUser, 
  messagesEndRef, 
  darkMode, 
  onDeleteMessage, 
  onDeleteChat, 
  loadMessages 
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = React.useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const isTypingIndicator = typingUsers[selectedUser._id];

  // Handle typing indicator
  useEffect(() => {
    if (isTyping) {
      onTyping(true);
    } else {
      onTyping(false);
    }
  }, [isTyping, onTyping]);

  // Clear typing indicator after delay
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput('');
      setIsTyping(false);
    }
  };

  // Fixed: Use useCallback to prevent recreating functions on every render
  const openDeleteModal = useCallback((target) => {
    console.log('Opening delete modal for:', target); // Debug log
    setDeleteTarget(target);
    setLoadingDelete(false);
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    console.log('Closing delete modal'); // Debug log
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setLoadingDelete(false);
  }, []);

  // Fixed: Improved delete handler with better error handling
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;

    setLoadingDelete(true);
    try {
      console.log('Deleting:', deleteTarget); // Debug log
      
      if (deleteTarget === 'chat') {
        await onDeleteChat();
      } else {
        await onDeleteMessage(deleteTarget);
      }
      
      // Close modal first
      closeDeleteModal();
      
      // Then refresh messages
      if (selectedUser && typeof loadMessages === 'function') {
        await loadMessages(selectedUser._id);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setLoadingDelete(false);
    }
  }, [deleteTarget, onDeleteChat, onDeleteMessage, closeDeleteModal, selectedUser, loadMessages]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Fixed: Improved message delete button with better event handling
  const MessageDeleteButton = ({ messageId }) => {
    const handleClick = useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Message delete button clicked for:', messageId); // Debug log
      openDeleteModal(messageId);
    }, [messageId, openDeleteModal]);

    return (
      <button
        className="ml-2 text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
        title="Delete message"
        onClick={handleClick}
        type="button"
      >
        <FiTrash2 size={14} />
      </button>
    );
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.sender._id === currentUser._id;
    const showDate = index === 0 || 
      formatDate(message.createdAt) !== formatDate(messages[index - 1]?.createdAt);

    return (
      <React.Fragment key={message._id}>
        {showDate && (
          <div className="flex justify-center my-4">
            <span className={`bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full shadow ${darkMode ? 'bg-gray-700 text-gray-300' : ''}`}> 
              {formatDate(message.createdAt)}
            </span>
          </div>
        )}
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 px-2`}> 
          <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}> 
            <div className={`relative message-bubble px-4 py-2 transition-all duration-200
              ${isOwnMessage
                ? (darkMode ? 'bg-gradient-to-br from-primary-700 to-primary-900 text-white rounded-br-2xl rounded-tl-2xl rounded-bl-md shadow-lg animate-fade-in-up' : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-2xl rounded-tl-2xl rounded-bl-md shadow-lg animate-fade-in-up')
                : (darkMode ? 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-2xl rounded-tr-2xl rounded-br-md shadow animate-fade-in-up' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-2xl rounded-tr-2xl rounded-br-md shadow animate-fade-in-up')
            }`}>
              <p className="text-base leading-relaxed break-words">{message.content}</p>
              <div className={`flex items-center justify-end mt-1 space-x-1 ${
                isOwnMessage ? (darkMode ? 'text-blue-200' : 'text-blue-100') : (darkMode ? 'text-gray-400' : 'text-gray-500')
              }`}>
                <span className="text-xs">{formatTime(message.createdAt)}</span>
                {isOwnMessage && (
                  <span className="text-xs">
                    {message.isRead ? '✓✓' : '✓'}
                  </span>
                )}
                {isOwnMessage && (
                  <MessageDeleteButton messageId={message._id} />
                )}
              </div>
            </div>
          </div>
          {!isOwnMessage && (
            <div className="order-2 ml-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shadow
                ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}> 
                {message.sender.username.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </React.Fragment>
    );
  };

  // Fixed: Improved delete modal with better event handling
  const DeleteModal = () => {
    const handleOverlayClick = useCallback((e) => {
      if (e.target === e.currentTarget) {
        closeDeleteModal();
      }
    }, [closeDeleteModal]);

    const handleKeyDown = useCallback((e) => {
      if (e.key === 'Escape') {
        closeDeleteModal();
      }
    }, [closeDeleteModal]);

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return ReactDOM.createPortal(
      <div 
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999] pointer-events-auto"
        onClick={handleOverlayClick}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-80 text-center pointer-events-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {deleteTarget === 'chat' ? 'Delete Entire Chat?' : 'Delete Message?'}
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            {deleteTarget === 'chat' 
              ? 'Are you sure you want to delete the entire conversation? This cannot be undone.' 
              : 'Are you sure you want to delete this message?'
            }
          </p>
          <div className="flex justify-center space-x-4">
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeleteConfirm}
              disabled={loadingDelete}
            >
              {loadingDelete ? 'Deleting...' : 'Delete'}
            </button>
            <button
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={closeDeleteModal}
              disabled={loadingDelete}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Fixed: Improved chat delete button with better event handling
  const ChatDeleteButton = () => {
    const handleClick = useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Chat delete button clicked'); // Debug log
      openDeleteModal('chat');
    }, [openDeleteModal]);

    return (
      <button
        className="text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
        title="Delete entire chat"
        onClick={handleClick}
        type="button"
      >
        <FiTrash2 size={20} />
      </button>
    );
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-gradient-to-br ${darkMode ? 'from-gray-900 via-gray-800 to-gray-900' : 'from-gray-50 via-white to-gray-100'}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 flex-shrink-0 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow
              ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}>
              {selectedUser && selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : ''}
            </div>
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedUser && selectedUser.username ? selectedUser.username : ''}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                {selectedUser && selectedUser.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ChatDeleteButton />
            <button className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-gray-300">
              <FiMoreVertical size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar ${darkMode ? 'bg-gray-900' : ''}`} style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}> 
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation!</p>
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        {/* Typing indicator */}
        {isTypingIndicator && (
          <div className="flex justify-start mb-2">
            <div className={`message-bubble message-received px-4 py-2 animate-pulse
              ${darkMode ? 'bg-gray-800 border border-gray-700 rounded-bl-2xl rounded-tr-2xl rounded-br-md shadow' : 'bg-white border border-gray-200 rounded-bl-2xl rounded-tr-2xl rounded-br-md shadow'}`}> 
              <div className="typing-indicator flex gap-1">
                <div className={`typing-dot ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '0ms' }}></div>
                <div className={`typing-dot ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '150ms' }}></div>
                <div className={`typing-dot ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - fixed at bottom */}
      <div className={`border-t p-4 flex-shrink-0 sticky bottom-0 z-10 shadow-md flex items-center gap-2
        ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <form onSubmit={handleSendMessage} className="flex w-full space-x-3">
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className={`input-field flex-1 rounded-full px-4 py-2 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all shadow-sm
              ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-gray-50 border border-gray-200'}`}
            disabled={!selectedUser}
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || !selectedUser}
            className={`btn-primary rounded-full px-5 py-2 shadow-md flex items-center justify-center text-lg
              ${darkMode ? 'bg-primary-400 hover:bg-primary-500' : ''}`}
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
      
      {/* Render modal only when needed */}
      {showDeleteModal && <DeleteModal />}
    </div>
  );
};

export default MessageArea;