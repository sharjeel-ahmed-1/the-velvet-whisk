const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bakery.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    // Create Orders Table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        items TEXT NOT NULL,
        total_price REAL NOT NULL,
        order_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Reviews Table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Seed reviews if empty
      db.get("SELECT COUNT(*) as count FROM reviews", [], (err, row) => {
        if (err) return console.error('Error checking reviews count:', err.message);
        
        if (row.count === 0) {
          const stmt = db.prepare("INSERT INTO reviews (name, rating, comment) VALUES (?, ?, ?)");
          stmt.run("Sarah Khan", 5, "The Walnut Brownies were absolutely divine! Rich, gooey, and packed with walnuts. 10/10!");
          stmt.run("M. Bilal", 4, "Loved the Red Velvet Cupcakes. The cream cheese frosting was perfectly balanced. Delivery was fast.");
          stmt.run("Ayesha Siddiqui", 5, "Best ice cream in town! The salted caramel ice cream was incredibly creamy. Will order again.");
          stmt.finalize();
          console.log('Seeded initial reviews database.');
        }
      });
    });
  });
}

// Promise wrappers for db operations
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = {
  db,
  dbQuery
};
