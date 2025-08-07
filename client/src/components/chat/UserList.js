import React, { useState } from 'react';
import { FiSearch, FiCircle, FiUserPlus, FiUsers, FiMessageSquare } from 'react-icons/fi';

const UserList = ({ 
  users, 
  groups,
  selectedChat, 
  onSelectItem, 
  onlineUsers, 
  currentUser, 
  darkMode,
  onCreateGroupClick,
  activeTab,
  setActiveTab,
  isMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const usersArray = Array.isArray(users) ? users : [];
  const groupsArray = Array.isArray(groups) ? groups : [];

  const filteredUsers = usersArray.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
    user._id !== currentUser._id
  );

  const filteredGroups = groupsArray.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className={`flex-1 flex flex-col border-r shadow-md ${darkMode ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-b from-white via-gray-50 to-gray-100 border-gray-200'} min-h-0`}>
      
      {/* Search Bar */}
      <div className={`p-3 sm:p-4 border-b sticky top-0 z-10 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} flex-shrink-0`}> 
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-200 bg-gray-50'}`}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 ${
            activeTab === 'users'
              ? 'border-primary-500 text-primary-500'
              : `border-transparent ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`
          }`}
          title="Show Users"
        >
          <FiUsers className="w-4 h-4" /> 
          <span className="hidden xs:inline">Users</span>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 ${
            activeTab === 'groups'
              ? 'border-primary-500 text-primary-500'
              : `border-transparent ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`
          }`}
          title="Show Groups"
        >
          <FiMessageSquare className="w-4 h-4" /> 
          <span className="hidden xs:inline">Groups</span>
        </button>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-gray-900' : ''} min-h-0`}> 
        {activeTab === 'users' && (
          <>
            {filteredUsers.length === 0 ? (
              <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}> 
                <p className="text-sm">{searchQuery ? 'No users found' : 'No users available'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user) => {
                  const isOnline = onlineUsers && onlineUsers.has(user._id);
                  const isSelected = selectedChat?._id === user._id;
                  return (
                    <div
                      key={user._id}
                      onClick={() => onSelectItem(user)}
                      className={`p-3 sm:p-4 cursor-pointer transition-all duration-150 flex items-center gap-2 sm:gap-3 rounded-xl mx-1 sm:mx-2 my-1
                        ${isSelected ? (darkMode ? 'bg-primary-900 border-r-4 border-primary-400 shadow-md' : 'bg-primary-50 border-r-4 border-primary-600 shadow-md') : ''}
                        ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-primary-50/60'} active:scale-95`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold shadow text-sm sm:text-base
                          ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}> 
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 shadow
                          ${isOnline ? 'bg-green-400 animate-pulse border-white dark:border-gray-900' : (darkMode ? 'bg-gray-700 border-gray-900' : 'bg-gray-300 border-white')}`}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-semibold truncate ${
                            isSelected ? (darkMode ? 'text-primary-200' : 'text-primary-900') : (darkMode ? 'text-white' : 'text-gray-900')
                          }`}>
                            {user.username}
                          </p>
                          {isOnline && !isMobile && (
                            <FiCircle className="h-2 w-2 text-green-400 flex-shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {isOnline ? 'Online' : `Last ${formatLastSeen(user.lastSeen)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        
        {activeTab === 'groups' && (
          <>
            {filteredGroups.length === 0 ? (
              <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-sm">{searchQuery ? 'No groups found' : 'No groups available'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredGroups.map((group) => {
                  const isSelected = selectedChat?._id === group._id;
                  return (
                    <div
                      key={group._id}
                      onClick={() => onSelectItem(group)}
                      className={`p-3 sm:p-4 cursor-pointer transition-all duration-150 flex items-center gap-2 sm:gap-3 rounded-xl mx-1 sm:mx-2 my-1
                        ${isSelected ? (darkMode ? 'bg-primary-900 border-r-4 border-primary-400 shadow-md' : 'bg-primary-50 border-r-4 border-primary-600 shadow-md') : ''}
                        ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-primary-50/60'} active:scale-95`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold shadow text-sm sm:text-base
                          ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}>
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-semibold truncate ${isSelected ? (darkMode ? 'text-primary-200' : 'text-primary-900') : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                            {group.name}
                          </p>
                        </div>
                        <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - only show for users tab */}
      {activeTab === 'users' && (
        <div className={`p-3 sm:p-4 border-t bg-gradient-to-r flex-shrink-0 ${darkMode ? 'border-gray-700 from-gray-900 to-gray-800' : 'border-gray-200 from-gray-50 to-white'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {onlineUsers.size} user{onlineUsers.size !== 1 ? 's' : ''} online
          </p>
        </div>
      )}

      {/* Floating Create Group Button */}
      <button
        onClick={onCreateGroupClick}
        className="fixed right-4 bottom-20 sm:right-6 sm:bottom-24 md:bottom-20 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-full shadow-lg p-3 sm:p-4 flex items-center justify-center z-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
        title="Create Group"
        aria-label="Create Group"
      >
        <FiUserPlus size={isMobile ? 20 : 28} />
      </button>
    </div>
  );
};

export default UserList;