const mongoose = require('mongoose');
const User = require('./server/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Get all users
  const users = await User.find({}).select('username isOnline lastSeen');
  
  console.log('\n=== User Status ===');
  users.forEach(user => {
    console.log(`${user.username}: ${user.isOnline ? '🟢 Online' : '🔴 Offline'} (Last seen: ${user.lastSeen})`);
  });
  
  mongoose.connection.close();
})
.catch(err => {
  console.error('Error:', err);
}); 