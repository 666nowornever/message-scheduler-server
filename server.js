const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  CHECK_INTERVAL: 60000, // 1 минута
  MAX_ATTEMPTS: 3
};

// ===== ХРАНИЛИЩЕ СООБЩЕНИЙ =====
const messageStore = new Map();

// ===== TELEGRAM SERVICE =====
class TelegramService {
  constructor() {
    this.botToken = CONFIG.TELEGRAM_BOT_TOKEN;
  }

  async sendMessage(chatId, message) {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 TELEGRAM ОТПРАВКА СООБЩЕНИЯ');
    console.log('='.repeat(60));
    
    // Проверка конфигурации
    if (!this.botToken) {
      const error = '❌ TELEGRAM_BOT_TOKEN не настроен в Environment Variables';
      console.log(error);
      console.log('💡 Добавь на Render.com: TELEGRAM_BOT_TOKEN=123456:ABC-DEF...');
      console.log('='.repeat(60));
      return { success: false, error };
    }

    if (!chatId) {
      const error = '❌ Chat ID не указан';
      console.log(error);
      console.log('='.repeat(60));
      return { success: false, error };
    }

    console.log('📋 Параметры отправки:');
    console.log(`   Chat ID: ${chatId}`);
    console.log(`   Сообщение: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    console.log(`   Bot Token: ${this.botToken.substring(0, 15)}...`);

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      console.log('📡 Выполняем запрос к Telegram API...');
      console.log(`   URL: ${url.replace(this.botToken, 'TOKEN_HIDDEN')}`);

      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ СООБЩЕНИЕ УСПЕШНО ОТПРАВЛЕНО!');
      console.log(`   Message ID: ${response.data.result.message_id}`);
      console.log(`   Chat: ${response.data.result.chat.title || 'Private chat'}`);
      console.log(`   Date: ${new Date(response.data.result.date * 1000).toLocaleString('ru-RU')}`);
      console.log('='.repeat(60));

      return {
        success: true,
        messageId: response.data.result.message_id,
        chat: response.data.result.chat
      };

    } catch (error) {
      console.log('❌ ОШИБКА ОТПРАВКИ В TELEGRAM:');
      
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error Code: ${error.response.data?.error_code}`);
        console.log(`   Description: ${error.response.data?.description}`);
        
        // Детальный анализ ошибок
        const errorCode = error.response.data?.error_code;
        if (errorCode === 400) {
          console.log('💡 Проблема: Неправильный запрос');
          console.log('   - Проверь Chat ID');
          console.log('   - Убедись что бот добавлен в чат');
        } else if (errorCode === 403) {
          console.log('💡 Проблема: Доступ запрещен');
          console.log('   - Бот заблокирован в чате');
          console.log('   - Нет прав на отправку сообщений');
        } else if (errorCode === 401) {
          console.log('💡 Проблема: Неавторизован');
          console.log('   - Неправильный Bot Token');
        } else if (errorCode === 404) {
          console.log('💡 Проблема: Чат не найден');
          console.log('   - Chat ID неправильный');
          console.log('   - Бот не добавлен в чат');
        }
      } else if (error.request) {
        console.log('💡 Проблема: Нет ответа от Telegram API');
        console.log('   - Проверь интернет соединение сервера');
      } else {
        console.log('💡 Проблема:', error.message);
      }
      
      console.log('='.repeat(60));
      
      return {
        success: false,
        error: error.response?.data?.description || error.message,
        code: error.response?.data?.error_code
      };
    }
  }

  async checkBotStatus() {
    if (!this.botToken) {
      return { success: false, error: 'Bot token not configured' };
    }

    try {
      const response = await axios.get(`https://api.telegram.org/bot${this.botToken}/getMe`, {
        timeout: 5000
      });
      return {
        success: true,
        bot: response.data.result
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }
}

const telegramService = new TelegramService();

// ===== SCHEDULER SERVICE =====
class SchedulerService {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;

    console.log('⏰ Запуск планировщика сообщений...');
    
    // Немедленная проверка при запуске
    this.checkScheduledMessages();
    
    // Периодическая проверка
    setInterval(() => {
      this.checkScheduledMessages();
    }, CONFIG.CHECK_INTERVAL);

    this.isRunning = true;
    console.log('✅ Планировщик запущен');
  }

  async checkScheduledMessages() {
    const now = new Date();
    console.log('\n🔍 ПРОВЕРКА СООБЩЕНИЙ ДЛЯ ОТПРАВКИ');
    console.log(`⏰ Текущее время: ${now.toLocaleString('ru-RU')}`);
    console.log(`📊 Всего сообщений в хранилище: ${messageStore.size}`);

    let messagesToSend = 0;
    let sentCount = 0;
    let errorCount = 0;

    for (const [id, message] of messageStore) {
      const scheduledTime = new Date(message.scheduledFor);
      
      if (message.status === 'scheduled' && scheduledTime <= now) {
        messagesToSend++;
        console.log(`\n📤 Найдено сообщение для отправки: ${id}`);
        console.log(`   Запланировано на: ${scheduledTime.toLocaleString('ru-RU')}`);
        console.log(`   Текст: ${message.message.substring(0, 80)}...`);

        const result = await this.sendMessage(message);
        
        if (result.success) {
          sentCount++;
        } else {
          errorCount++;
        }
        
        // Задержка между отправками
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n📊 ИТОГ ПРОВЕРКИ:`);
    console.log(`   Найдено для отправки: ${messagesToSend}`);
    console.log(`   Успешно отправлено: ${sentCount}`);
    console.log(`   С ошибками: ${errorCount}`);
    console.log(`   Осталось в хранилище: ${messageStore.size}`);
    
    if (messagesToSend === 0) {
      console.log('   📭 Нет сообщений для отправки');
    }
  }

  async sendMessage(message) {
    try {
      // Увеличиваем счетчик попыток
      message.attempts = (message.attempts || 0) + 1;
      
      console.log(`   Попытка отправки ${message.attempts}/${CONFIG.MAX_ATTEMPTS}...`);

      const result = await telegramService.sendMessage(message.chatId, message.message);

      if (result.success) {
        message.status = 'sent';
        message.sentAt = new Date().toISOString();
        message.messageId = result.messageId;
        console.log(`   ✅ Сообщение отправлено успешно!`);
        return { success: true };
      } else {
        // Проверяем превышение лимита попыток
        if (message.attempts >= CONFIG.MAX_ATTEMPTS) {
          message.status = 'error';
          message.error = `Превышено количество попыток: ${result.error}`;
          console.log(`   ❌ Превышено количество попыток отправки`);
        } else {
          console.log(`   ⚠️ Ошибка отправки, будет повторена`);
        }
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log(`   ❌ Неожиданная ошибка: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

const schedulerService = new SchedulerService();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
  console.log(`\n🌐 ${req.method} ${req.path}`, req.body || '');
  next();
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Message Scheduler Server',
    version: '2.0.0',
    stats: {
      totalMessages: messageStore.size,
      scheduled: Array.from(messageStore.values()).filter(m => m.status === 'scheduled').length,
      sent: Array.from(messageStore.values()).filter(m => m.status === 'sent').length,
      errors: Array.from(messageStore.values()).filter(m => m.status === 'error').length
    }
  });
});

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Message Scheduler Server v2.0',
    endpoints: [
      'GET  /api/health',
      'GET  /api/calendar',
      'POST /api/calendar',
      'GET  /api/messages/:userId',
      'POST /api/messages',
      'DELETE /api/messages/:messageId',
      'GET  /api/debug/all-messages',
      'GET  /api/debug/telegram-status',
      'POST /api/debug/send-test'
    ]
  });
});

// ===== CALENDAR ENDPOINTS =====
app.get('/api/calendar', (req, res) => {
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
  res.json({
    success: true,
    message: 'Calendar data saved',
    lastModified: Date.now(),
    version: 1
  });
});

// ===== MESSAGES ENDPOINTS =====
app.get('/api/messages/:userId', (req, res) => {
  const userMessages = Array.from(messageStore.values())
    .filter(msg => msg.userId === req.params.userId)
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  
  res.json({
    success: true,
    messages: userMessages
  });
});

app.post('/api/messages', (req, res) => {
  const { userId, chatId, message, scheduledFor, eventData } = req.body;

  // Валидация
  if (!userId || !chatId || !message || !scheduledFor) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId, chatId, message, scheduledFor'
    });
  }

  const messageId = 'msg_' + Date.now();
  
  const newMessage = {
    id: messageId,
    userId,
    chatId,
    message,
    scheduledFor: new Date(scheduledFor).toISOString(),
    eventData: eventData || {},
    status: 'scheduled',
    attempts: 0,
    createdAt: new Date().toISOString()
  };

  messageStore.set(messageId, newMessage);

  console.log(`✅ Сообщение сохранено: ${messageId}`);
  console.log(`   User: ${userId}`);
  console.log(`   Chat: ${chatId}`);
  console.log(`   Text: ${message.substring(0, 80)}...`);
  console.log(`   When: ${new Date(scheduledFor).toLocaleString('ru-RU')}`);
  console.log(`   Type: ${eventData?.type || 'unknown'}`);

  res.json({
    success: true,
    message: newMessage
  });
});

app.delete('/api/messages/:messageId', (req, res) => {
  const deleted = messageStore.delete(req.params.messageId);
  res.json({
    success: deleted,
    message: deleted ? 'Message deleted' : 'Message not found'
  });
});

// ===== DEBUG ENDPOINTS =====
app.get('/api/debug/all-messages', (req, res) => {
  const messages = Array.from(messageStore.values())
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  
  res.json({
    success: true,
    total: messages.length,
    messages: messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      chatId: msg.chatId,
      message: msg.message,
      scheduledFor: new Date(msg.scheduledFor).toLocaleString('ru-RU'),
      status: msg.status,
      eventType: msg.eventData?.type,
      attempts: msg.attempts,
      error: msg.error,
      createdAt: new Date(msg.createdAt).toLocaleString('ru-RU'),
      sentAt: msg.sentAt ? new Date(msg.sentAt).toLocaleString('ru-RU') : null
    }))
  });
});

app.post('/api/debug/check-chat', async (req, res) => {
  const { chatId } = req.body;
  
  if (!chatId) {
    return res.status(400).json({
      success: false,
      error: 'chatId required'
    });
  }

  console.log(`🔍 Проверка чата: ${chatId}`);
  
  try {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/getChat`;
    const response = await axios.post(url, {
      chat_id: chatId
    }, {
      timeout: 5000
    });

    res.json({
      success: true,
      chat: response.data.result
    });
  } catch (error) {
    console.log('❌ Ошибка проверки чата:', error.response?.data);
    res.json({
      success: false,
      error: error.response?.data?.description || error.message,
      code: error.response?.data?.error_code
    });
  }
});

app.get('/api/debug/telegram-status', async (req, res) => {
  const status = await telegramService.checkBotStatus();
  
  res.json({
    botConfigured: !!CONFIG.TELEGRAM_BOT_TOKEN,
    botStatus: status,
    messageStoreSize: messageStore.size
  });
});

app.post('/api/debug/send-test', async (req, res) => {
  const { chatId, message } = req.body;
  
  if (!chatId || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing chatId or message'
    });
  }

  console.log('\n🧪 РУЧНОЙ ТЕСТ ОТПРАВКИ');
  const result = await telegramService.sendMessage(chatId, message);
  
  res.json({
    test: true,
    timestamp: new Date().toLocaleString('ru-RU'),
    ...result
  });
});

app.post('/api/debug/send-message/:id', async (req, res) => {
  const messageId = req.params.id;
  const message = messageStore.get(messageId);
  
  if (!message) {
    return res.json({
      success: false,
      error: 'Message not found'
    });
  }

  console.log(`\n🚀 ПРИНУДИТЕЛЬНАЯ ОТПРАВКА: ${messageId}`);
  const result = await telegramService.sendMessage(message.chatId, message.message);
  
  if (result.success) {
    message.status = 'sent';
    message.sentAt = new Date().toISOString();
  }

  res.json({
    success: true,
    message: message,
    sendResult: result
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 MESSAGE SCHEDULER SERVER v2.0');
  console.log('='.repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🤖 Bot Token: ${CONFIG.TELEGRAM_BOT_TOKEN ? '✅ Настроен' : '❌ Отсутствует'}`);
  console.log('='.repeat(60));
  
  // Запускаем планировщик
  schedulerService.start();
  
  // Проверяем статус бота
  setTimeout(async () => {
    const status = await telegramService.checkBotStatus();
    if (status.success) {
      console.log(`✅ Бот активен: @${status.bot.username}`);
    } else {
      console.log(`❌ Проблема с ботом: ${status.error}`);
    }
  }, 2000);
});

// Обработка ошибок
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
