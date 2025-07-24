import React, { useState, useEffect, useCallback } from 'react';
import { FiSend, FiMoreVertical } from 'react-icons/fi';
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
  loadMessages 
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = React.useRef(null);

  const isGroup = selectedUser && selectedUser.members;
  const isTypingIndicator = !isGroup && typingUsers[selectedUser._id];

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

  return (
    <div className={`flex-1 flex flex-col h-full bg-gradient-to-br ${darkMode ? 'from-gray-900 via-gray-800 to-gray-900' : 'from-gray-50 via-white to-gray-100'}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 flex-shrink-0 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow
              ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}>
              {selectedUser && (isGroup ? selectedUser.name.charAt(0).toUpperCase() : selectedUser.username.charAt(0).toUpperCase())}
            </div>
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedUser && (isGroup ? selectedUser.name : selectedUser.username)}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                {isGroup ? `${selectedUser.members.length} members` : (selectedUser.isOnline ? 'Online' : 'Offline')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
    </div>
  );
};

export default MessageArea;