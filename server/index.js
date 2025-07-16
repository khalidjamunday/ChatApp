const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const { authenticateToken } = require('./middleware/auth');
const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Make io available in routes
app.set('socketio', io);

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Socket.IO connection handling
const connectedUsers = new Map();

// Helper to broadcast online users to all clients
function broadcastOnlineUsers() {
  const onlineIds = Array.from(connectedUsers.keys());
  console.log('Broadcasting online users:', onlineIds);
  io.emit('onlineUsersList', onlineIds);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their user ID
  socket.on('join', async (userId) => {
    console.log('Received join event for user:', userId); // Debug log
    try {
      // Update user's online status in database
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      });
      
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.broadcast.emit('userOnline', userId);
      broadcastOnlineUsers(); // Broadcast to all
      console.log(`User ${userId} joined`);
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const recipientSocketId = connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', {
        userId: data.userId,
        isTyping: data.isTyping
      });
    }
  });

  // Handle message read receipts
  socket.on('messageRead', (data) => {
    const recipientSocketId = connectedUsers.get(data.senderId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('messageRead', {
        messageId: data.messageId,
        readBy: data.readBy
      });
    }
  });

  // Handle request for current online users
  socket.on('getOnlineUsers', () => {
    // Send all currently online user IDs
    socket.emit('onlineUsersList', Array.from(connectedUsers.keys()));
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    if (socket.userId) {
      try {
        // Update user's offline status in database
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        });
        
        connectedUsers.delete(socket.userId);
        socket.broadcast.emit('userOffline', socket.userId);
        broadcastOnlineUsers(); // Broadcast to all
        console.log(`User ${socket.userId} disconnected`);
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 