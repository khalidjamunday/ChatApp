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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl p-8 relative animate-fade-in-up ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl focus:outline-none"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create Group</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className={`w-full mb-3 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all ${darkMode ? 'border-gray-700 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
            maxLength={50}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full mb-3 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all ${darkMode ? 'border-gray-700 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
            maxLength={200}
          />
          <div className="mb-4">
            <div className={`mb-2 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Members</div>
            <div className={`max-h-40 overflow-y-auto custom-scrollbar rounded-lg p-2 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              {users.filter(u => u._id !== currentUser._id).map((user) => (
                <label key={user._id} className={`flex items-center py-2 px-2 rounded-lg cursor-pointer transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user._id)}
                    onChange={() => handleUserToggle(user._id)}
                    className="form-checkbox h-4 w-4 text-primary-600 transition-all mr-3 bg-gray-700 border-gray-600"
                  />
                  <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.username}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
          <button
            type="submit"
            className={`w-full py-2 rounded-lg font-semibold shadow transition-all ${darkMode ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup; 