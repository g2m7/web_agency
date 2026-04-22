import { Database } from 'bun:sqlite'

const db = new Database('./data/agency.db')

// Backfill priority_tier on existing leads
db.exec(`
  UPDATE leads SET priority_tier = CASE
    WHEN website_url IS NOT NULL AND phone IS NOT NULL THEN 'hot'
    WHEN website_url IS NOT NULL THEN 'warm'
    ELSE 'low'
  END
  WHERE priority_tier IS NULL
`)

const counts = db.query('SELECT priority_tier, COUNT(*) as cnt FROM leads GROUP BY priority_tier').all()
console.log('Priority tier counts:', counts)

const total = db.query('SELECT COUNT(*) as cnt FROM leads').get() as any
console.log('Total leads:', total.cnt)

db.close()
console.log('Done!')
