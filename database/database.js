async initTables() {
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
        events TEXT NOT NULL,
        vacations TEXT NOT NULL,
        lastModified INTEGER NOT NULL,
        version INTEGER DEFAULT 1,
        updatedBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(messagesTable, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      this.db.run(calendarTable, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ All tables ready');
          resolve();
        }
      });
    });
  });
}
