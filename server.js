const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  console.log('❤️ Health check');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Message Scheduler Server',
    version: '1.0.0'
  });
});

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Message Scheduler Server is running!',
    endpoints: [
      'GET  /api/health',
      'GET  /api/calendar',
      'POST /api/calendar', 
      'GET  /api/messages/:userId',
      'POST /api/messages',
      'DELETE /api/messages/:messageId',
      'GET  /api/debug/messages'
    ]
  });
});

// ===== CALENDAR ENDPOINTS =====
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
  console.log('📅 POST /api/calendar - Данные:', Object.keys(req.body));
  res.json({
    success: true,
    message: 'Calendar data saved',
    lastModified: Date.now(),
    version: 1
  });
});

// ===== MESSAGES ENDPOINTS =====
app.get('/api/messages/:userId', (req, res) => {
  console.log('📨 GET /api/messages/', req.params.userId);
  
  // Временные тестовые данные
  const testMessages = [
    {
      id: 'test_1',
      userId: req.params.userId,
      message: '🧪 Тестовое сообщение 1',
      scheduledFor: new Date(Date.now() + 300000).toISOString(), // +5 минут
      status: 'scheduled',
      eventData: { type: 'test' },
      createdAt: new Date().toISOString()
    },
    {
      id: 'test_2', 
      userId: req.params.userId,
      message: '🧪 Тестовое сообщение 2',
      scheduledFor: new Date(Date.now() + 600000).toISOString(), // +10 минут
      status: 'scheduled',
      eventData: { type: 'test' },
      createdAt: new Date().toISOString()
    }
  ];
  
  res.json({
    success: true,
    messages: testMessages
  });
});

app.post('/api/messages', (req, res) => {
  console.log('📨 POST /api/messages - Новое сообщение:', {
    userId: req.body.userId,
    message: req.body.message?.substring(0, 100),
    scheduledFor: new Date(req.body.scheduledFor).toLocaleString('ru-RU'),
    eventType: req.body.eventData?.type
  });
  
  // Создаем ID сообщения
  const messageId = 'msg_' + Date.now();
  
  console.log('✅ Сообщение сохранено с ID:', messageId);
  
  res.json({
    success: true,
    message: { 
      id: messageId,
      ...req.body,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    }
  });
});

app.delete('/api/messages/:messageId', (req, res) => {
  console.log('🗑️ DELETE /api/messages/', req.params.messageId);
  res.json({ 
    success: true,
    message: 'Message deleted'
  });
});

// ===== DEBUG ENDPOINTS =====
app.get('/api/debug/messages', (req, res) => {
  console.log('🔍 GET /api/debug/messages');
  
  const debugMessages = [
    {
      id: 'debug_1',
      userId: 'telegram_user',
      message: '🎂 Поздравляем @drmw1kr с днем рождения! 🎂',
      scheduledFor: new Date(Date.now() + 120000).toISOString(), // +2 минуты
      status: 'scheduled',
      eventData: { type: 'birthday', birthdayName: 'Васильев Иван' },
      attempts: 0,
      error: null,
      createdAt: new Date().toISOString()
    }
  ];
  
  res.json({
    success: true,
    total: debugMessages.length,
    messages: debugMessages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      message: msg.message,
      scheduledFor: new Date(msg.scheduledFor).toLocaleString('ru-RU'),
      status: msg.status,
      eventType: msg.eventData?.type || 'unknown',
      birthdayName: msg.eventData?.birthdayName,
      attempts: msg.attempts,
      error: msg.error,
      createdAt: new Date(msg.createdAt).toLocaleString('ru-RU')
    }))
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`📨 Messages: http://localhost:${PORT}/api/messages/telegram_user`);
  console.log(`🔍 Debug: http://localhost:${PORT}/api/debug/messages`);
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});