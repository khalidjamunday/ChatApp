const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');

const router = express.Router();

// Get conversation between two users
router.get('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    })
    .populate('sender', 'username avatar')
    .populate('recipient', 'username avatar')
    .sort({ createdAt: 1 })
    .limit(50);

    res.json(messages);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { recipientId, content, messageType = 'text' } = req.body;
    const senderId = req.user.userId;

    if (!content || !recipientId) {
      return res.status(400).json({ message: 'Content and recipient are required' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content,
      messageType
    });

    await message.save();

    // Populate sender and recipient info
    await message.populate('sender', 'username avatar');
    await message.populate('recipient', 'username avatar');

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark message as read
router.put('/read/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the recipient
    if (message.recipient.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if already read by this user
    const alreadyRead = message.readBy.some(read => 
      read.user.toString() === currentUserId
    );

    if (!alreadyRead) {
      message.readBy.push({
        user: currentUserId,
        readAt: new Date()
      });
      message.isRead = true;
      await message.save();
    }

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread/count', async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const unreadCount = await Message.countDocuments({
      recipient: currentUserId,
      isRead: false
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete message (soft delete)
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Add user to deletedFor array (soft delete)
    if (!message.deletedFor.includes(currentUserId)) {
      message.deletedFor.push(currentUserId);
      await message.save();
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 