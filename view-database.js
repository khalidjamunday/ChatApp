const mongoose = require('mongoose');
const User = require('./server/models/User');
const Message = require('./server/models/Message');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Get all users
  const users = await User.find({});
  const messages = await Message.find({});
  
  console.log('\n=== DATABASE OVERVIEW ===');
  console.log(`Total Users: ${users.length}`);
  console.log(`Total Messages: ${messages.length}`);
  
  console.log('\n=== USERS ===');
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.email})`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Online: ${user.isOnline ? '🟢 YES' : '🔴 NO'}`);
    console.log(`   Last Seen: ${user.lastSeen}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('');
  });
  
  console.log('\n=== ONLINE USERS ===');
  const onlineUsers = users.filter(user => user.isOnline);
  if (onlineUsers.length === 0) {
    console.log('No users are currently online');
  } else {
    onlineUsers.forEach(user => {
      console.log(`🟢 ${user.username} (${user._id})`);
    });
  }
  
  console.log('\n=== RECENT MESSAGES ===');
  const recentMessages = await Message.find({})
    .populate('sender', 'username')
    .populate('recipient', 'username')
    .sort({ createdAt: -1 })
    .limit(5);
    
  recentMessages.forEach((message, index) => {
    console.log(`${index + 1}. ${message.sender?.username || 'Unknown'} → ${message.recipient?.username || 'Unknown'}`);
    console.log(`   Content: ${message.content}`);
    console.log(`   Time: ${message.createdAt}`);
    console.log(`   Read: ${message.isRead ? '✅' : '❌'}`);
    console.log('');
  });
  
  mongoose.connection.close();
})
.catch(err => {
  console.error('Error:', err);
}); 