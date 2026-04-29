-- ============================================================
--  RentWise — Canonical Database Schema
--  Engine  : SQLite 3
--  Updated : 2026-03
-- ============================================================

PRAGMA foreign_keys = ON;

-- ── Core entities ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  first_name     TEXT     NOT NULL,
  last_name      TEXT     NOT NULL,
  email          TEXT     UNIQUE NOT NULL,
  password       TEXT     NOT NULL,
  role           TEXT     NOT NULL DEFAULT 'renter',   -- 'renter' | 'landlord'
  is_verified    INTEGER  DEFAULT 0,                   -- 0 = unverified, 1 = verified
  phone          TEXT     UNIQUE,                      -- E.164 format, e.g. +12345678901
  phone_verified INTEGER  DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apartments (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  name           TEXT     NOT NULL,
  street_address TEXT     NOT NULL,
  city           TEXT     NOT NULL,
  state          TEXT     NOT NULL,
  zip_code       TEXT     NOT NULL,
  property_type  TEXT,                               -- 'Apartment' | 'House' | 'Condo' | 'Townhouse' | 'Studio'
  year_built     INTEGER,
  owner_id       INTEGER  REFERENCES users(id),      -- NULL = unclaimed (Yelp model)
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS amenities (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS apartment_amenities (
  apartment_id  INTEGER  REFERENCES apartments(id) ON DELETE CASCADE,
  amenities_id  INTEGER  REFERENCES amenities(id)  ON DELETE CASCADE,
  PRIMARY KEY (apartment_id, amenities_id)
);

-- ── Tenancy verification (replaces the old leases table) ──────
--    A renter must submit proof of tenancy before writing a review.

CREATE TABLE IF NOT EXISTS verifications (
  id                  INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER  NOT NULL REFERENCES users(id),
  apartment_id        INTEGER  NOT NULL REFERENCES apartments(id),
  doc_type            TEXT     NOT NULL,
  document_url        TEXT,
  verification_status TEXT     DEFAULT 'pending',    -- 'pending' | 'approved' | 'failed'
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Reviews ───────────────────────────────────────────────────
--    Linked to verifications, not directly to users/apartments,
--    to enforce the proof-of-tenancy requirement.

CREATE TABLE IF NOT EXISTS reviews (
  id               INTEGER  PRIMARY KEY AUTOINCREMENT,
  verification_id  INTEGER  NOT NULL REFERENCES verifications(id),
  rating_overall   REAL     NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  rating_safety    REAL              CHECK (rating_safety  BETWEEN 1 AND 5),
  rating_management REAL             CHECK (rating_management BETWEEN 1 AND 5),
  title            TEXT     NOT NULL,
  review_text      TEXT     NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Auth & email ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_tokens (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT     NOT NULL UNIQUE,
  otp         TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT     NOT NULL UNIQUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phone_otps (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  phone       TEXT     NOT NULL,
  otp         TEXT     NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Photos ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apartment_photos (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  apartment_id  INTEGER  NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  photo_data    TEXT     NOT NULL,               -- URL or base64 data URI
  display_order INTEGER  DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_photos (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  review_id   INTEGER  NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  photo_data  TEXT     NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Social / engagement ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_apartments (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER  NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  apartment_id  INTEGER  NOT NULL REFERENCES apartments(id)  ON DELETE CASCADE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, apartment_id)
);

CREATE TABLE IF NOT EXISTS review_votes (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  review_id   INTEGER  NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id     INTEGER  NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (review_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_replies (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  review_id    INTEGER  NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  landlord_id  INTEGER  NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  reply_text   TEXT     NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (review_id)                             -- one reply per review
);

CREATE TABLE IF NOT EXISTS review_flags (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  review_id   INTEGER  NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id     INTEGER  NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  reason      TEXT     NOT NULL,                 -- 'spam' | 'harassment' | 'inaccurate' | 'other'
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (review_id, user_id)
);

-- ── Analytics ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apartment_views (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  apartment_id  INTEGER  NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  user_id       INTEGER  REFERENCES users(id) ON DELETE SET NULL,  -- NULL = anonymous
  viewed_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
