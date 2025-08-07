import React, { useState } from 'react';

const CreateGroup = ({ users, onCreate, onClose, show, currentUser, darkMode }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const handleUserToggle = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) {
      setError('Group name and at least one member are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onCreate({
        name: groupName.trim(),
        description: description.trim(),
        memberIds: selectedUserIds
      });
      setGroupName('');
      setDescription('');
      setSelectedUserIds([]);
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40 animate-fade-in p-4">
      <div className={`w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 relative animate-fade-in-up max-h-[90vh] flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <button
          className="absolute top-2 sm:top-3 right-2 sm:right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl sm:text-2xl focus:outline-none z-10"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        
        <h2 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 pr-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create Group</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-3 sm:space-y-4 flex-shrink-0">
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all ${darkMode ? 'border-gray-700 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
              maxLength={50}
              required
            />
            
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all resize-none h-20 sm:h-24 ${darkMode ? 'border-gray-700 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
              maxLength={200}
            />
          </div>
          
          <div className="mt-4 sm:mt-6 flex-1 min-h-0 flex flex-col">
            <div className={`mb-2 sm:mb-3 font-semibold text-sm sm:text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Add Members ({selectedUserIds.length} selected)
            </div>
            
            <div className={`flex-1 overflow-y-auto rounded-lg p-2 sm:p-3 min-h-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="space-y-1 sm:space-y-2">
                {users.filter(u => u._id !== currentUser._id).map((user) => (
                  <label key={user._id} className={`flex items-center py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg cursor-pointer transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user._id)}
                      onChange={() => handleUserToggle(user._id)}
                      className="form-checkbox h-4 w-4 text-primary-600 transition-all mr-2 sm:mr-3 rounded border-gray-400 focus:ring-primary-400"
                    />
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0
                        ${darkMode ? 'bg-primary-400 text-gray-900' : 'bg-primary-600 text-white'}`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-medium text-sm sm:text-base truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {user.username}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 mb-3 sm:mb-4 text-xs sm:text-sm bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg font-semibold shadow transition-all ${darkMode ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} focus:outline-none focus:ring-2 focus:ring-gray-400`}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg font-semibold shadow transition-all ${
                loading || !groupName.trim() || selectedUserIds.length === 0
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-400'
              }`}
              disabled={loading || !groupName.trim() || selectedUserIds.length === 0}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;