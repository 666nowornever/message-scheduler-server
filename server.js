const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Message Scheduler Server'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Message Scheduler Server is running!',
    endpoints: [
      'GET  /health',
      'GET  /api/calendar',
      'POST /api/calendar',
      'GET  /api/messages/:userId',
      'POST /api/messages',
      'DELETE /api/messages/:messageId'
    ]
  });
});

// Mock API routes (временно, пока не настроена БД)
app.get('/api/calendar', (req, res) => {
  console.log('📅 GET /api/calendar');
  res.json({
    success: true,
    data: {
      events: {},
      vacations: {},
      lastModified: Date.now(),
      version: 1
    }
  });
});

app.post('/api/calendar', (req, res) => {
  console.log('📅 POST /api/calendar');
  res.json({
    success: true,
    message: 'Calendar data saved (mock)',
    lastModified: Date.now(),
    version: 1
  });
});

app.get('/api/messages/:userId', (req, res) => {
  console.log('📨 GET /api/messages/', req.params.userId);
  res.json({
    success: true,
    messages: []
  });
});

app.post('/api/messages', (req, res) => {
  console.log('📨 POST /api/messages', {
    message: req.body.message?.substring(0, 50),
    scheduledFor: req.body.scheduledFor
  });
  
  res.json({
    success: true,
    message: { 
      id: 'msg_' + Date.now(),
      ...req.body,
      status: 'scheduled'
    }
  });
});

app.delete('/api/messages/:messageId', (req, res) => {
  console.log('🗑️ DELETE /api/messages/', req.params.messageId);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});