const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Get all users (except current user)
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('username avatar isOnline lastSeen')
      .sort({ isOnline: -1, username: 1 });

    // Log for debugging
    console.log('Users found:', users.length);
    users.forEach(user => {
      console.log(`User: ${user.username}, Online: ${user.isOnline}`);
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('username avatar isOnline lastSeen createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users by username
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const currentUserId = req.user.userId;

    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: 'i' }
    })
    .select('username avatar isOnline lastSeen')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { username, avatar } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      currentUserId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get online users
router.get('/online/list', async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    
    const onlineUsers = await User.find({
      _id: { $ne: currentUserId },
      isOnline: true
    })
    .select('username avatar')
    .sort({ username: 1 });

    res.json(onlineUsers);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 