const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/messages', require('./routes/messages'));
app.use('/api/webhook', require('./routes/webhook'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/message_scheduler', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('🔗 WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 WebSocket message:', data);
    } catch (error) {
      console.error('❌ WebSocket parse error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Start scheduler service
require('./services/schedulerService').start();
