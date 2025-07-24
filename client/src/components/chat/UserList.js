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
  onCreateGroupClick 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');

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

  const TabButton = ({ label, tabName, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all duration-200 border-b-2 ${
        activeTab === tabName
          ? 'border-primary-500 text-primary-500'
          : `border-transparent ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className={`flex-1 flex flex-col border-r shadow-md ${darkMode ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-b from-white via-gray-50 to-gray-100 border-gray-200'}`}
      style={{ position: 'relative', zIndex: 30 }}>
      
      <div className={`p-4 border-b sticky top-0 z-10 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}> 
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`input-field pl-10 text-sm rounded-lg border focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all ${darkMode ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-200 bg-gray-50'}`}
          />
        </div>
      </div>

      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <TabButton label="Users" tabName="users" icon={<FiUsers />} />
        <TabButton label="Groups" tabName="groups" icon={<FiMessageSquare />} />
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-gray-900' : ''}`}> 
        {activeTab === 'users' && (
          <>
            {filteredUsers.length === 0 ? (
              <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}> 
                {searchQuery ? 'No users found' : 'No users available'}
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
                      className={`p-4 cursor-pointer transition-all duration-150 flex items-center gap-3 rounded-xl mx-2 my-1
                        ${isSelected ? (darkMode ? 'bg-primary-900 border-r-4 border-primary-400 shadow-md' : 'bg-primary-50 border-r-4 border-primary-600 shadow-md') : ''}
                        ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-primary-50/60'}`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow
                          ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}> 
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow
                          ${isOnline ? 'bg-green-400 animate-pulse border-white' : (darkMode ? 'bg-gray-700 border-gray-900' : 'bg-gray-300 border-white')}`}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-semibold truncate ${
                            isSelected ? (darkMode ? 'text-primary-200' : 'text-primary-900') : (darkMode ? 'text-white' : 'text-gray-900')
                          }`}>
                            {user.username}
                          </p>
                          {isOnline && (
                            <FiCircle className="h-2 w-2 text-green-400 flex-shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {isOnline ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
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
                {searchQuery ? 'No groups found' : 'No groups available'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredGroups.map((group) => {
                  const isSelected = selectedChat?._id === group._id;
                  return (
                    <div
                      key={group._id}
                      onClick={() => onSelectItem(group)}
                      className={`p-4 cursor-pointer transition-all duration-150 flex items-center gap-3 rounded-xl mx-2 my-1
                        ${isSelected ? (darkMode ? 'bg-primary-900 border-r-4 border-primary-400 shadow-md' : 'bg-primary-50 border-r-4 border-primary-600 shadow-md') : ''}
                        ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-primary-50/60'}`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow
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
                          {group.members.length} members
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

      {activeTab === 'users' && (
        <div className={`p-4 border-t bg-gradient-to-r ${darkMode ? 'border-gray-700 from-gray-900 to-gray-800' : 'border-gray-200 from-gray-50 to-white'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {onlineUsers.size} user{onlineUsers.size !== 1 ? 's' : ''} online
          </p>
        </div>
      )}

      {/* Move the button here, outside the scrollable area */}
      <button
        onClick={e => { console.log('Create Group icon clicked'); onCreateGroupClick(e); }}
        className="absolute right-6 bottom-24 md:bottom-20 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg p-4 flex items-center justify-center z-50 transition-all"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
        title="Create Group"
        aria-label="Create Group"
      >
        <FiUserPlus size={28} />
      </button>
    </div>
  );
};

export default UserList; 