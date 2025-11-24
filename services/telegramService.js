const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId, message) {
    try {
      console.log(`🤖 Sending Telegram message to ${chatId}: ${message.substring(0, 50)}...`);
      
      if (!this.botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN not configured');
      }

      if (!chatId) {
        throw new Error('Chat ID not provided');
      }

      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }, {
        timeout: 10000
      });

      console.log('✅ Telegram message sent successfully');
      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      console.error('❌ Telegram API error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }

  async checkBotAvailability() {
    try {
      if (!this.botToken) {
        console.error('❌ TELEGRAM_BOT_TOKEN not set');
        return false;
      }

      const response = await axios.get(`${this.apiUrl}/getMe`, {
        timeout: 5000
      });
      
      console.log('✅ Bot is available:', response.data.result.username);
      return response.data.ok;
    } catch (error) {
      console.error('❌ Bot availability check failed:', error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = new TelegramService();
