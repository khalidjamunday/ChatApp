# Real-Time Chat Application

A modern, real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO for instant messaging capabilities.

## Features

- 🔐 **User Authentication**: Secure registration and login with JWT tokens
- 💬 **Real-time Messaging**: Instant message delivery using Socket.IO
- 👥 **User Management**: User profiles, online status, and last seen
- 🔍 **User Search**: Find and connect with other users
- ✍️ **Typing Indicators**: See when someone is typing
- ✅ **Read Receipts**: Know when your messages are read
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful interface built with TailwindCSS
- 🔒 **Secure**: Password hashing, JWT authentication, and input validation

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

### Frontend
- **React** - JavaScript library for building user interfaces
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **TailwindCSS** - Utility-first CSS framework
- **React Icons** - Icon library

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ChatApp
   ```

2. **Install server dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chatapp
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   CLIENT_URL=http://localhost:3000
   ```

5. **Start MongoDB**
   
   Make sure MongoDB is running on your system. If you're using MongoDB locally:
   ```bash
   mongod
   ```

## Running the Application

### Development Mode

1. **Start the server**
   ```bash
   npm run server
   ```

2. **Start the client** (in a new terminal)
   ```bash
   npm run client
   ```

3. **Or run both simultaneously**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Mode

1. **Build the client**
   ```bash
   cd client
   npm run build
   cd ..
   ```

2. **Start the server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/search/:query` - Search users
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/online/list` - Get online users

### Messages
- `GET /api/messages/conversation/:userId` - Get conversation
- `POST /api/messages/send` - Send a message
- `PUT /api/messages/read/:messageId` - Mark message as read
- `GET /api/messages/unread/count` - Get unread count
- `DELETE /api/messages/:messageId` - Delete message

## Socket.IO Events

### Client to Server
- `join` - Join with user ID
- `privateMessage` - Send private message
- `typing` - Send typing indicator
- `messageRead` - Send read receipt

### Server to Client
- `userOnline` - User came online
- `userOffline` - User went offline
- `newMessage` - New message received
- `userTyping` - User typing indicator
- `messageRead` - Message read receipt

## Project Structure

```
ChatApp/
├── server/
│   ├── config/
│   │   └── config.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── messages.js
│   │   └── users.js
│   └── index.js
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── Login.js
│   │   │   │   └── Register.js
│   │   │   └── chat/
│   │   │       ├── Chat.js
│   │   │       ├── UserList.js
│   │   │       └── MessageArea.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── package.json
└── README.md
```

## Features in Detail

### Real-time Messaging
- Messages are delivered instantly using Socket.IO
- Messages are stored in MongoDB for persistence
- Support for message read receipts
- Typing indicators show when someone is typing

### User Management
- User registration and authentication
- Online/offline status tracking
- Last seen timestamps
- User search functionality
- Profile management

### Security
- Passwords are hashed using bcryptjs
- JWT tokens for session management
- Input validation and sanitization
- Protected API routes

### UI/UX
- Modern, responsive design with TailwindCSS
- Smooth animations and transitions
- Mobile-friendly interface
- Intuitive user experience
- Real-time status indicators

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Socket.IO](https://socket.io/) for real-time communication
- [TailwindCSS](https://tailwindcss.com/) for the beautiful UI
- [React Icons](https://react-icons.github.io/react-icons/) for the icons
- [MongoDB](https://www.mongodb.com/) for the database

## Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team. 