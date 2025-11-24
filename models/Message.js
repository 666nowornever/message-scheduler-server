const db = require('../database/database');

class Message {
  // Создать сообщение
  static async create(messageData) {
    const sql = `
      INSERT INTO messages (userId, chatId, message, scheduledFor, eventData)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      messageData.userId,
      messageData.chatId,
      messageData.message,
      messageData.scheduledFor.toISOString(),
      JSON.stringify(messageData.eventData || {})
    ];

    const result = await db.run(sql, params);
    return result.id;
  }

  // Найти по ID
  static async findById(id) {
    const sql = `SELECT * FROM messages WHERE id = ?`;
    const rows = await db.query(sql, [id]);
    return rows[0] ? this.normalizeMessage(rows[0]) : null;
  }

  // Найти сообщения пользователя
  static async findByUserId(userId) {
    const sql = `SELECT * FROM messages WHERE userId = ? ORDER BY scheduledFor ASC`;
    const rows = await db.query(sql, [userId]);
    return rows.map(this.normalizeMessage);
  }

  // Найти сообщения для отправки
  static async findDueMessages() {
    const sql = `SELECT * FROM messages WHERE status = 'scheduled' AND scheduledFor <= datetime('now')`;
    const rows = await db.query(sql);
    return rows.map(this.normalizeMessage);
  }

  // Обновить сообщение
  static async update(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const sql = `UPDATE messages SET ${setClause} WHERE id = ?`;
    await db.run(sql, values);
  }

  // Удалить сообщение
  static async delete(id) {
    const sql = `DELETE FROM messages WHERE id = ?`;
    await db.run(sql, [id]);
  }

  // Нормализовать данные из БД
  static normalizeMessage(row) {
    return {
      id: row.id,
      userId: row.userId,
      chatId: row.chatId,
      message: row.message,
      scheduledFor: new Date(row.scheduledFor),
      status: row.status,
      eventData: row.eventData ? JSON.parse(row.eventData) : {},
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      error: row.error,
      createdAt: new Date(row.createdAt),
      sentAt: row.sentAt ? new Date(row.sentAt) : null
    };
  }
}

module.exports = Message;