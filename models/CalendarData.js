const db = require('../database/database');

class CalendarData {
  // Получить последние данные календаря
  static async findLatest() {
    try {
      const sql = `SELECT * FROM calendar_data ORDER BY id DESC LIMIT 1`;
      const rows = await db.query(sql);
      return rows[0] ? this.normalizeData(rows[0]) : null;
    } catch (error) {
      console.error('❌ Error finding calendar data:', error);
      return null;
    }
  }

  // Сохранить данные календаря
  static async create(calendarData) {
    try {
      const sql = `
        INSERT INTO calendar_data (events, vacations, lastModified, version, updatedBy)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [
        JSON.stringify(calendarData.events || {}),
        JSON.stringify(calendarData.vacations || {}),
        calendarData.lastModified || Date.now(),
        calendarData.version || 1,
        calendarData.updatedBy || 'unknown'
      ];

      const result = await db.run(sql, params);
      return result.id;
    } catch (error) {
      console.error('❌ Error creating calendar data:', error);
      throw error;
    }
  }

  // Нормализовать данные из БД
  static normalizeData(row) {
    try {
      return {
        id: row.id,
        events: row.events ? JSON.parse(row.events) : {},
        vacations: row.vacations ? JSON.parse(row.vacations) : {},
        lastModified: row.lastModified,
        version: row.version,
        updatedBy: row.updatedBy,
        createdAt: new Date(row.createdAt)
      };
    } catch (error) {
      console.error('❌ Error normalizing calendar data:', error);
      return {
        events: {},
        vacations: {},
        lastModified: Date.now(),
        version: 1
      };
    }
  }
}

module.exports = CalendarData;