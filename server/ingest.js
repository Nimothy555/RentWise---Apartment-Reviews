/**
 * ingest.js — Pull real rental properties from the Rentcast API and
 * insert them as UNCLAIMED listings (owner_id = NULL).
 *
 * This is the Yelp / Google Maps model:
 *   1. You pre-populate the database with real buildings from open data.
 *   2. Landlords find their building on the platform and click "Claim this listing."
 *   3. After claiming, they own the listing: they can add photos, edit details, reply to reviews.
 *
 * Setup (one-time):
 *   1. Sign up for a free Rentcast API key at https://app.rentcast.io/app/api-keys
 *      (free tier: 50 API calls/month — enough for hundreds of properties per run)
 *   2. Create server/.env and add:  RENTCAST_API_KEY=your_key_here
 *   3. npm install dotenv  (if not already installed)
 *
 * Usage:
 *   node ingest.js                              # defaults to Austin, TX, limit 50
 *   node ingest.js --city "Brooklyn, NY"
 *   node ingest.js --city "Chicago, IL" --limit 100
 *   node ingest.js --city "Seattle, WA" --type Apartment
 *
 * Supported --type values: Apartment, Condo, Townhouse, Single Family, Multi Family
 * Run multiple times with different cities to build up the database.
 * Already-ingested addresses are skipped automatically.
 */

require('dotenv').config()
const https = require('https')
const db = require('./db')

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : null
}

const cityArg    = getArg('city')  || 'Austin, TX'
const limitArg   = parseInt(getArg('limit') || '50', 10)
const typeFilter = getArg('type')  || null   // null = all types

// Parse "Austin, TX" → { city: 'Austin', state: 'TX' }
const commaIdx = cityArg.lastIndexOf(',')
if (commaIdx === -1) {
  console.error('❌  --city must be in "City, ST" format, e.g. "Austin, TX"')
  process.exit(1)
}
const cityName  = cityArg.slice(0, commaIdx).trim()
const stateName = cityArg.slice(commaIdx + 1).trim()

// ─── Rentcast → our schema mapping ──────────────────────────────────────────
const TYPE_MAP = {
  'Single Family': 'House',
  'Multi Family':  'Apartment',
  'Apartment':     'Apartment',
  'Condo':         'Condo',
  'Townhouse':     'Townhouse',
  'Mobile':        'House',
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    const options = new URL(url)
    const req = https.request(
      {
        hostname: options.hostname,
        path:     options.pathname + options.search,
        method:   'GET',
        headers:  {
          'X-Api-Key': process.env.RENTCAST_API_KEY,
          'Accept':    'application/json',
        },
      },
      (res) => {
        if (res.statusCode === 401) {
          reject(new Error('401 Unauthorized — check your RENTCAST_API_KEY in server/.env'))
          return
        }
        if (res.statusCode === 429) {
          reject(new Error('429 Rate limited — you have hit your free-tier monthly limit'))
          return
        }
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch (e) { reject(new Error(`Bad JSON from Rentcast: ${data.slice(0, 200)}`)) }
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Fetch from Rentcast ─────────────────────────────────────────────────────
async function fetchPage(city, state, offset, propertyType) {
  const params = new URLSearchParams({
    city,
    state,
    limit: '100',
    offset: String(offset),
  })
  if (propertyType) params.set('propertyType', propertyType)

  const url = `https://api.rentcast.io/v1/properties?${params}`
  return get(url)
}

async function fetchAllProperties(city, state, maxResults, propertyType) {
  const results = []
  let offset = 0

  console.log(`\n🔍  Fetching ${propertyType || 'all types'} in ${city}, ${state}...`)

  while (results.length < maxResults) {
    const batch = await fetchPage(city, state, offset, propertyType)

    if (!Array.isArray(batch) || batch.length === 0) break

    results.push(...batch)
    console.log(`    Page offset ${offset}: got ${batch.length} properties (total so far: ${results.length})`)

    if (batch.length < 100) break   // last page
    offset += 100
    await sleep(400)               // be polite to the API
  }

  return results.slice(0, maxResults)
}

// ─── DB helpers ──────────────────────────────────────────────────────────────
function waitForDb() {
  // db.js runs async migrations on startup; give it a moment
  return sleep(1200)
}

async function isDuplicate(streetAddress, city, state) {
  const row = await db.getAsync(
    `SELECT id FROM apartments WHERE street_address = ? AND city = ? AND state = ?`,
    [streetAddress, city, state]
  )
  return !!row
}

async function insertListing(p, photoSeed) {
  const street = (p.addressLine1 || '').trim()
  const city   = (p.city  || '').trim()
  const state  = (p.state || '').trim()
  const zip    = (p.zipCode || '').trim()

  // Skip incomplete records
  if (!street || !city || !state || !zip) return 'skip'

  // Skip duplicates
  if (await isDuplicate(street, city, state)) return 'duplicate'

  const type = TYPE_MAP[p.propertyType] || 'Apartment'
  const year = p.yearBuilt || null
  // Use the full address as the listing name — landlords can edit it after claiming
  const name = p.formattedAddress || `${street}, ${city}, ${state}`

  const result = await db.runAsync(
    `INSERT INTO apartments (name, street_address, city, state, zip_code, property_type, year_built, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [name, street, city, state, zip, type, year]
  )

  // Attach a deterministic Picsum photo (same image each time for this address)
  const photoUrl = `https://picsum.photos/seed/ingest-${photoSeed}/600/400`
  await db.runAsync(
    `INSERT INTO apartment_photos (apartment_id, photo_data, display_order) VALUES (?, ?, 0)`,
    [result.lastID, photoUrl]
  )

  return 'inserted'
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.RENTCAST_API_KEY) {
    console.error(`
❌  RENTCAST_API_KEY is not set.

Steps to get one (takes 2 minutes):
  1. Go to https://app.rentcast.io/app/api-keys
  2. Create a free account and generate an API key
  3. Add this line to server/.env:
       RENTCAST_API_KEY=your_key_here
  4. Re-run:  node ingest.js --city "${cityArg}"
`)
    process.exit(1)
  }

  console.log('━'.repeat(60))
  console.log(`  RentWise Ingestion Pipeline`)
  console.log(`  Target city : ${cityName}, ${stateName}`)
  console.log(`  Max records : ${limitArg}`)
  console.log(`  Type filter : ${typeFilter || 'all'}`)
  console.log('━'.repeat(60))

  await waitForDb()

  let properties
  try {
    properties = await fetchAllProperties(cityName, stateName, limitArg, typeFilter)
  } catch (err) {
    console.error(`\n❌  Rentcast API error: ${err.message}`)
    process.exit(1)
  }

  console.log(`\n📦  Processing ${properties.length} properties...\n`)

  let inserted  = 0
  let skipped   = 0
  let duplicate = 0

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i]
    const result = await insertListing(p, i + 1)

    if (result === 'inserted') {
      inserted++
      if (inserted % 10 === 0) console.log(`  ✔  ${inserted} inserted so far...`)
    } else if (result === 'duplicate') {
      duplicate++
    } else {
      skipped++
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Ingestion complete for ${cityName}, ${stateName}

  Inserted  : ${inserted} new listings
  Duplicates: ${duplicate} already in database (skipped)
  Invalid   : ${skipped} missing required fields (skipped)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  • Run again with a different city:
      node ingest.js --city "Brooklyn, NY"

  • Landlords can now search for their building on the platform
    and click "Claim this listing" to take ownership.

  • To ingest multiple cities in one shot, see the examples at
    the top of this file.
`)

  process.exit(0)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
