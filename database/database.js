const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'data', 'messages.db');
  }

  connect() {
    return new Promise((resolve, reject) => {
      // Создаем директорию для базы данных если не существует
      const fs = require('fs');
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.initTables().then(resolve).catch(reject);
        }
      });
    });
  }

  initTables() {
    return new Promise((resolve, reject) => {
      const messagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          chatId TEXT NOT NULL,
          message TEXT NOT NULL,
          scheduledFor DATETIME NOT NULL,
          status TEXT DEFAULT 'scheduled',
          eventData TEXT,
          attempts INTEGER DEFAULT 0,
          maxAttempts INTEGER DEFAULT 3,
          error TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          sentAt DATETIME
        )
      `;

      const calendarTable = `
        CREATE TABLE IF NOT EXISTS calendar_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          events TEXT NOT NULL DEFAULT '{}',
          vacations TEXT NOT NULL DEFAULT '{}',
          lastModified INTEGER NOT NULL DEFAULT 0,
          version INTEGER DEFAULT 1,
          updatedBy TEXT DEFAULT 'system',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(messagesTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        this.db.run(calendarTable, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ All tables ready');
            resolve();
          }
        });
      });
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
}

module.exports = new Database();