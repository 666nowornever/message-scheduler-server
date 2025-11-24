const express = require('express');
const Message = require('../models/Message');
const router = express.Router();

// Get user's scheduled messages
router.get('/:userId', async (req, res) => {
  try {
    const messages = await Message.findByUserId(req.params.userId);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schedule new message
router.post('/', async (req, res) => {
  try {
    const { userId, chatId, message, scheduledFor, eventData } = req.body;

    console.log('📅 New message scheduled:', {
      userId,
      chatId,
      message: message.substring(0, 50),
      scheduledFor: new Date(scheduledFor).toLocaleString('ru-RU'),
      eventType: eventData?.type
    });

    // Валидация
    if (!userId || !chatId || !message || !scheduledFor) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, chatId, message, scheduledFor' 
      });
    }

    const messageId = await Message.create({
      userId,
      chatId,
      message,
      scheduledFor: new Date(scheduledFor),
      eventData
    });

    const newMessage = await Message.findById(messageId);
    
    console.log('✅ Message scheduled with ID:', messageId);
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('❌ Error scheduling message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel message
router.delete('/:messageId', async (req, res) => {
  try {
    await Message.update(req.params.messageId, { status: 'cancelled' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all scheduled messages (для отладки)
router.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM messages ORDER BY scheduledFor ASC`;
    const messages = await db.query(sql);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
