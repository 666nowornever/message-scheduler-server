const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId, message) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      });

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
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new TelegramService();
