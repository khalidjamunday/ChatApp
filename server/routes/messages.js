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
      ],
      deletedFor: { $ne: currentUserId }
    })
    .populate('sender', 'username avatar')
    .populate('recipient', 'username avatar')
    .sort({ createdAt: -1 }) // <-- FIX: Sort descending to get latest
    .limit(50);

    res.json(messages.reverse()); // <-- FIX: Reverse to show in correct chronological order
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversation for a group
router.get('/conversation/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.userId;
    // Check if user is a member of the group
    const Group = require('../models/Group');
    const group = await Group.findById(groupId);
    if (!group || !group.members.some(m => m.user.toString() === currentUserId)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 }) // <-- FIX: Sort descending to get latest
      .limit(100);
    res.json(messages.reverse()); // <-- FIX: Reverse to show in correct chronological order
  } catch (error) {
    console.error('Get group conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { recipientId, groupId, content, messageType = 'text' } = req.body;
    const senderId = req.user.userId;
    if (!content || (!recipientId && !groupId)) {
      return res.status(400).json({ message: 'Content and recipient or groupId are required' });
    }
    let message;
    if (groupId) {
      // Group message
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      if (!group || !group.members.some(m => m.user.toString() === senderId)) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }
      message = new Message({
        sender: senderId,
        group: groupId,
        content,
        messageType
      });
    } else {
      // Direct message (existing logic)
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      message = new Message({
        sender: senderId,
        recipient: recipientId,
        content,
        messageType
      });
    }
    await message.save();
    await message.populate('sender', 'username avatar');
    const io = req.app.get('socketio');

    if (message.group) {
      await message.populate('group', 'name members');
      io.to(`group_${message.group._id}`).emit('newMessage', message);
    } else {
      await message.populate('recipient', 'username avatar');
      const recipientSocketId = req.connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('newMessage', message);
      }
      // Also send to sender
      const senderSocketId = req.connectedUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('newMessage', message);
      }
    }

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

    // Emit socket event to notify other users
    const io = req.app.get('socketio');
    if (io) {
      // Notify the recipient about the message deletion
      io.to(message.recipient.toString()).emit('messageDeleted', {
        messageId: messageId,
        deletedBy: currentUserId
      });
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all messages in a conversation (soft delete for current user)
router.delete('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    // Find all messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    });

    // Get message IDs that will be deleted
    const messageIds = messages.map(msg => msg._id.toString());

    // Soft delete: add current user to deletedFor array
    for (const msg of messages) {
      if (!msg.deletedFor.includes(currentUserId)) {
        msg.deletedFor.push(currentUserId);
        await msg.save();
      }
    }

    // Emit socket event to notify the other user
    const io = req.app.get('socketio');
    if (io) {
      io.to(userId).emit('conversationDeleted', {
        deletedBy: currentUserId,
        messageIds: messageIds
      });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;