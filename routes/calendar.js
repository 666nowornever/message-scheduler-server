const express = require('express');
const CalendarData = require('../models/CalendarData');
const router = express.Router();

// Получить данные календаря
router.get('/', async (req, res) => {
  try {
    console.log('📥 GET /api/calendar - Request received');
    
    const calendarData = await CalendarData.findLatest();
    
    if (!calendarData) {
      // Возвращаем пустые данные если нет в БД
      const defaultData = {
        events: {},
        vacations: {},
        lastModified: Date.now(),
        version: 1
      };
      
      console.log('📤 Sending default calendar data');
      return res.json({ 
        success: true, 
        data: defaultData 
      });
    }
    
    console.log('📤 Sending calendar data from database');
    res.json({ 
      success: true, 
      data: calendarData 
    });
    
  } catch (error) {
    console.error('❌ GET /api/calendar error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Сохранить данные календаря
router.post('/', async (req, res) => {
  try {
    console.log('📥 POST /api/calendar - Saving calendar data');
    
    const { events, vacations, lastModified, version, updatedBy } = req.body;

    // Валидация обязательных полей
    if (events === undefined || vacations === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: events, vacations' 
      });
    }

    // Сохраняем в базу
    const calendarId = await CalendarData.create({
      events: events || {},
      vacations: vacations || {},
      lastModified: lastModified || Date.now(),
      version: version || 1,
      updatedBy: updatedBy || 'unknown'
    });

    console.log('✅ Calendar data saved with ID:', calendarId);
    
    res.json({ 
      success: true, 
      message: 'Calendar data saved successfully',
      lastModified: lastModified || Date.now(),
      version: version || 1
    });
    
  } catch (error) {
    console.error('❌ POST /api/calendar error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;