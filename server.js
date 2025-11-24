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

app.post('/api/messages', (req, res) => {
  console.log('📨 POST /api/messages - Новое сообщение:', {
    userId: req.body.userId,
    message: req.body.message?.substring(0, 100),
    scheduledFor: new Date(req.body.scheduledFor).toLocaleString('ru-RU'),
    eventType: req.body.eventData?.type,
    chatId: req.body.chatId
  });
  
  const messageId = 'msg_' + Date.now();
  
  // Сохраняем сообщение
  const message = {
    id: messageId,
    ...req.body,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  
  messageStore.set(messageId, message);
  
  console.log('✅ Сообщение сохранено с ID:', messageId);
  console.log(`📊 Всего сообщений: ${messageStore.size}`);
  
  // Немедленно проверяем, не пора ли отправить
  setTimeout(() => {
    const now = new Date();
    const message = messageStore.get(messageId);
    if (message && message.status === 'scheduled' && new Date(message.scheduledFor) <= now) {
      console.log('🚀 Немедленная отправка сообщения...');
      TelegramService.sendMessage(message.chatId, message.message);
    }
  }, 2000);
  
  res.json({
    success: true,
    message: message
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
const axios = require('axios');
app.get('/api/debug/all-messages', (req, res) => {
  const messages = Array.from(messageStore.values());
  
  console.log(`🔍 Просмотр всех сообщений: ${messages.length}`);
  
  res.json({
    success: true,
    total: messages.length,
    messages: messages.map(msg => ({
      id: msg.id,
      message: msg.message,
      scheduledFor: new Date(msg.scheduledFor).toLocaleString('ru-RU'),
      status: msg.status,
      chatId: msg.chatId,
      eventType: msg.eventData?.type,
      createdAt: new Date(msg.createdAt).toLocaleString('ru-RU'),
      sentAt: msg.sentAt ? new Date(msg.sentAt).toLocaleString('ru-RU') : null,
      error: msg.error
    }))
  });
});
app.get('/api/debug/time', (req, res) => {
    const now = new Date();
    res.json({
        serverTime: {
            utc: now.toUTCString(),
            iso: now.toISOString(),
            local: now.toLocaleString('ru-RU'),
            timestamp: now.getTime(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    });
});
// Telegram service
const TelegramService = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  
  async sendMessage(chatId, message) {
    if (!this.botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
      return { success: false, error: 'Bot token not configured' };
    }
    
    try {
      console.log(`🤖 Отправка в чат ${chatId}: ${message.substring(0, 50)}...`);
      
      const response = await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }, {
        timeout: 10000
      });
      
      console.log('✅ Сообщение отправлено');
      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      console.error('❌ Ошибка отправки:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }
};

// Хранилище сообщений (временно, вместо БД)
const messageStore = new Map();
const TelegramService = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  
  async sendMessage(chatId, message) {
    console.log(`🤖 Попытка отправки в чат ${chatId}: ${message.substring(0, 50)}...`);
    
    if (!this.botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN не настроен!');
      console.log('💡 Добавь в Environment Variables на Render.com:');
      console.log('   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...');
      return { success: false, error: 'Bot token not configured' };
    }
    
    if (!chatId) {
      console.error('❌ Chat ID не указан!');
      return { success: false, error: 'Chat ID not provided' };
    }
    
    try {
      console.log(`📡 Отправка запроса к Telegram API...`);
      
      const response = await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }, {
        timeout: 10000
      });
      
      console.log('✅ Сообщение отправлено успешно!');
      console.log('📨 Message ID:', response.data.result.message_id);
      return { success: true, messageId: response.data.result.message_id };
      
    } catch (error) {
      console.error('❌ Ошибка отправки в Telegram:');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data?.description || error.message);
      console.error('   Chat ID:', chatId);
      
      return { 
        success: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }
};
// Проверка сообщений каждую минуту
// В функции проверки сообщений добавь коррекцию времени
setInterval(async () => {
  console.log('🔍 Проверка сообщений для отправки...');
  const now = new Date();
  
  // Коррекция для MSK времени (+3 часа)
  const nowMSK = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  
  console.log('⏰ Текущее время UTC:', now.toLocaleString('ru-RU'));
  console.log('⏰ Текущее время MSK:', nowMSK.toLocaleString('ru-RU'));
  
  for (const [id, message] of messageStore) {
    const scheduledTime = new Date(message.scheduledFor);
    
    if (message.status === 'scheduled' && scheduledTime <= nowMSK) {
      console.log(`📤 Отправка сообщения ${id}...`);
      // ... отправка
    }
  }
}, 60000);
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