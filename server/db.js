const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const db = new sqlite3.Database(path.join(__dirname, 'rentwise.db'), (err) => {
  if (err) console.error('Database error:', err)
  else console.log('✅ Connected to SQLite database')
})

function createTables() {
  // Load schema from the canonical database.sql file at the project root
  const schemaPath = path.join(__dirname, '..', 'database.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema, (err) => {
    if (err) console.error('❌ Schema error:', err)
    else console.log('✅ Schema loaded from database.sql')
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
  db.all("PRAGMA table_info(email_tokens)", (err, cols) => {
    if (err || !cols) return
    if (!cols.find(c => c.name === 'otp')) {
      db.run("ALTER TABLE email_tokens ADD COLUMN otp TEXT", e => {
        if (!e) console.log("✅ Migrated: email_tokens.otp added")
      })
    }
  })
  db.all("PRAGMA table_info(users)", (err, cols) => {
    if (err || !cols) return
    if (!cols.find(c => c.name === 'phone')) {
      db.run("ALTER TABLE users ADD COLUMN phone TEXT UNIQUE", e => {
        if (!e) console.log("✅ Migrated: users.phone added")
      })
    }
    if (!cols.find(c => c.name === 'phone_verified')) {
      db.run("ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0", e => {
        if (!e) console.log("✅ Migrated: users.phone_verified added")
      })
    }
  })
  db.all("PRAGMA table_info(reviews)", (err, cols) => {
    if (err || !cols) return
    if (!cols.find(c => c.name === 'display_name')) {
      db.run("ALTER TABLE reviews ADD COLUMN display_name TEXT", e => {
        if (!e) console.log("✅ Migrated: reviews.display_name added")
      })
    }
    if (!cols.find(c => c.name === 'rating_noise')) {
      db.run("ALTER TABLE reviews ADD COLUMN rating_noise INTEGER", e => {
        if (!e) console.log("✅ Migrated: reviews.rating_noise added")
      })
    }
    if (!cols.find(c => c.name === 'rating_value')) {
      db.run("ALTER TABLE reviews ADD COLUMN rating_value INTEGER", e => {
        if (!e) console.log("✅ Migrated: reviews.rating_value added")
      })
    }
    if (!cols.find(c => c.name === 'rating_responsiveness')) {
      db.run("ALTER TABLE reviews ADD COLUMN rating_responsiveness INTEGER", e => {
        if (!e) console.log("✅ Migrated: reviews.rating_responsiveness added")
      })
    }
    if (!cols.find(c => c.name === 'rating_parking')) {
      db.run("ALTER TABLE reviews ADD COLUMN rating_parking INTEGER", e => {
        if (!e) console.log("✅ Migrated: reviews.rating_parking added")
      })
    }
  })
  db.all("PRAGMA table_info(users)", (err, cols) => {
    if (err || !cols) return
    if (!cols.find(c => c.name === 'default_display_name')) {
      db.run("ALTER TABLE users ADD COLUMN default_display_name TEXT", e => {
        if (!e) console.log("✅ Migrated: users.default_display_name added")
      })
    }
  })
  db.run(`CREATE TABLE IF NOT EXISTS phone_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    otp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, e => { if (!e) console.log("✅ phone_otps table ready") })
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
