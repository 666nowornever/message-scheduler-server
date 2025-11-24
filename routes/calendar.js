const express = require('express');
const CalendarData = require('../models/CalendarData');
const router = express.Router();

// Получить данные календаря
router.get('/', async (req, res) => {
  try {
    const calendarData = await CalendarData.findAll();
    
    if (!calendarData) {
      return res.json({ 
        success: true, 
        data: {
          events: {},
          vacations: {},
          lastModified: Date.now(),
          version: 1
        }
      });
    }
    
    res.json({ success: true, data: calendarData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сохранить данные календаря
router.post('/', async (req, res) => {
  try {
    const { events, vacations, lastModified, version, updatedBy } = req.body;

    // Валидация данных
    if (!events || !vacations || !lastModified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    const calendarId = await CalendarData.save({
      events,
      vacations,
      lastModified,
      version: version || 1,
      updatedBy: updatedBy || 'unknown'
    });

    res.json({ 
      success: true, 
      message: 'Calendar data saved',
      lastModified,
      version: version || 1
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;