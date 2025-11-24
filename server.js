const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = require('./database/database');
db.connect().then(() => {
  console.log('✅ Database initialized');
}).catch(console.error);

// Routes
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calendar', require('./routes/calendar'));

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (ws) => {
  console.log('🔗 WebSocket client connected');
  ws.on('close', () => console.log('🔌 WebSocket client disconnected'));
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

// Start scheduler
require('./services/schedulerService').start();