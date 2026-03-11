const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const db = new sqlite3.Database(path.join(__dirname, 'rentwise.db'), (err) => {
  if (err) console.error('Database error:', err)
  else console.log('✅ Connected to SQLite database')
})

function createTables() {
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON')

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS apartments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      street_address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      property_type TEXT,
      year_built INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS amenities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS apartment_amenities (
      apartment_id INTEGER REFERENCES apartments(id),
      amenities_id INTEGER REFERENCES amenities(id),
      PRIMARY KEY (apartment_id, amenities_id)
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      apartment_id INTEGER NOT NULL REFERENCES apartments(id),
      doc_type TEXT NOT NULL,
      document_url TEXT,
      verification_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      verification_id INTEGER NOT NULL REFERENCES verifications(id),
      rating_overall REAL NOT NULL,
      rating_safety REAL,
      rating_management REAL,
      title TEXT NOT NULL,
      review_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

    db.get('SELECT COUNT(*) as count FROM apartments', (err, row) => {
      if (err || (row && row.count > 0)) return

      console.log('📦 Seeding sample data...')

      db.run(`INSERT INTO users (first_name, last_name, email, password, is_verified) VALUES (?, ?, ?, ?, ?)`,
        ['Demo', 'User', 'demo@rentwise.com', '$2b$10$PLACEHOLDER_NOT_FOR_LOGIN', 1])

      const apts = [
        ['Sunny Heights', '412 Park Ave', 'New York', 'NY', '10001', 'Apartment', 1985],
        ['The Greenway', '88 Elm Street', 'Brooklyn', 'NY', '11201', 'Apartment', 1992],
        ['Riverside Lofts', '230 River Rd', 'Hoboken', 'NJ', '07030', 'Loft', 2005],
        ['Maple Court', '15 Maple Dr', 'Stamford', 'CT', '06901', 'Townhouse', 1978],
        ['Urban Nest', '501 5th Ave', 'New York', 'NY', '10017', 'Studio', 2010],
      ]
      apts.forEach(a => {
        db.run('INSERT INTO apartments (name, street_address, city, state, zip_code, property_type, year_built) VALUES (?, ?, ?, ?, ?, ?, ?)', a)
      })

      console.log('✅ Seeded 5 apartments and 1 demo user')
    })
  })
}

// Migrate from old schema if needed (check for old 'leases' or missing 'verifications' table)
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='verifications'", (err, row) => {
  if (row) {
    createTables()
    return
  }

  // Old schema detected — drop and recreate
  console.log('🔄 Migrating to new schema...')
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = OFF')
    db.run('DROP TABLE IF EXISTS reviews')
    db.run('DROP TABLE IF EXISTS leases')
    db.run('DROP TABLE IF EXISTS apartment_amenities')
    db.run('DROP TABLE IF EXISTS amenities')
    db.run('DROP TABLE IF EXISTS apartments')
    db.run('DROP TABLE IF EXISTS users')
    db.run('PRAGMA foreign_keys = ON', () => {
      createTables()
      console.log('✅ Migration complete')
    })
  })
})

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

module.exports = db
