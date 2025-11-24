const cron = require('node-cron');
const Message = require('../models/Message');
const telegramService = require('./telegramService');

class SchedulerService {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;

    cron.schedule('* * * * *', async () => {
      await this.checkScheduledMessages();
    });

    console.log('⏰ Message scheduler started');
    this.isRunning = true;
  }

  async checkScheduledMessages() {
    try {
      const messages = await Message.findDueMessages();
      console.log(`🔍 Found ${messages.length} messages to send`);

      for (const message of messages) {
        await this.sendMessage(message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('❌ Scheduler error:', error);
    }
  }

  async sendMessage(message) {
    try {
      console.log(`📤 Sending message to chat ${message.chatId}: ${message.message.substring(0, 50)}...`);

      const result = await telegramService.sendMessage(message.chatId, message.message);

      if (result.success) {
        await Message.update(message.id, {
          status: 'sent',
          sentAt: new Date().toISOString()
        });
        console.log(`✅ Message ${message.id} sent successfully`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`❌ Failed to send message ${message.id}:`, error);
      
      const attempts = message.attempts + 1;
      const status = attempts >= message.maxAttempts ? 'error' : 'scheduled';

      await Message.update(message.id, {
        attempts,
        status,
        error: error.message
      });
    }
  }
}

module.exports = new SchedulerService();