const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация базы данных
const db = require('./database/database');
await db.connect();
console.log('✅ Database initialized');

// Проверяем доступность Telegram бота
const telegramService = require('./services/telegramService');
const botAvailable = await telegramService.checkBotAvailability();
if (!botAvailable) {
  console.warn('⚠️ Telegram bot is not available. Message sending will fail.');
} else {
  console.log('✅ Telegram bot is ready');
}
// Routes
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calendar', require('./routes/calendar'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('🔗 WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 WebSocket message:', data.type);
    } catch (error) {
      console.error('❌ WebSocket parse error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// Инициализация и запуск сервера
async function startServer() {
  try {
    // Инициализируем базу данных
    await db.connect();
    console.log('✅ Database initialized');

    // Запускаем планировщик
    require('./services/schedulerService').start();
    console.log('✅ Scheduler started');

    // Запускаем сервер
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // WebSocket upgrade
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Запуск сервера
startServer();

// Обработка ошибок
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
