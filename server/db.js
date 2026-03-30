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

    db.run(`CREATE TABLE IF NOT EXISTS email_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS apartment_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
      photo_data TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS saved_apartments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, apartment_id)
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS review_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(review_id, user_id)
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS review_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      landlord_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reply_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(review_id)
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS review_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      photo_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS review_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(review_id, user_id)
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS apartment_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

  })
}

function runMigrations() {
  db.all("PRAGMA table_info(users)", (err, cols) => {
    if (err || !cols) return
    if (!cols.find(c => c.name === 'role')) {
      db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'renter'", e => {
        if (!e) console.log("✅ Migrated: users.role added")
      })
    }
  })
  db.all("PRAGMA table_info(apartments)", (err, cols) => {
    if (err || !cols) return
    if (!cols.find(c => c.name === 'owner_id')) {
      db.run("ALTER TABLE apartments ADD COLUMN owner_id INTEGER REFERENCES users(id)", e => {
        if (!e) console.log("✅ Migrated: apartments.owner_id added")
      })
    }
  })
}

// Migrate from old schema if needed (check for old 'leases' or missing 'verifications' table)
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='verifications'", (err, row) => {
  if (row) {
    createTables()
    runMigrations()
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
      runMigrations()
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
