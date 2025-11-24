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

    const messageId = await Message.create({
      userId,
      chatId,
      message,
      scheduledFor: new Date(scheduledFor),
      eventData
    });

    const newMessage = await Message.findById(messageId);
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
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

module.exports = router;