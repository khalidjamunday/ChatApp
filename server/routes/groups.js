const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create a new group
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const adminId = req.user.userId;
    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'Name and members are required' });
    }
    // Ensure admin is in the group
    const members = [
      { user: adminId, role: 'admin' },
      ...memberIds.filter(id => id !== adminId).map(id => ({ user: id, role: 'member' }))
    ];
    const group = new Group({
      name,
      description: description || '',
      admin: adminId,
      members
    });
    await group.save();
    await group.populate('members.user', 'username avatar');
    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// List groups for the current user
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const groups = await Group.find({ 'members.user': userId, isActive: true })
      .populate('members.user', 'username avatar')
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group details by ID
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate('members.user', 'username avatar');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 