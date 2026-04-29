/**
 * US Cities Seed Database
 * Tier 1: Mid-size metros (100k–500k pop) — sweet spot for local services
 * Tier 2: Smaller metros (50k–100k pop) — less competition
 * Tier 3: Large suburbs / growing exurbs
 *
 * Population figures are approximate metro-area estimates for ranking purposes.
 */

export interface CityEntry {
  city: string
  state: string
  population: number
  tier: 1 | 2 | 3
  region: 'northeast' | 'southeast' | 'midwest' | 'southwest' | 'west' | 'northwest'
}

export const US_CITIES: CityEntry[] = [
  // ── Tier 1: Mid-size metros ──────────────────────────────────
  { city: 'Tampa', state: 'FL', population: 400000, tier: 1, region: 'southeast' },
  { city: 'Austin', state: 'TX', population: 980000, tier: 1, region: 'southwest' },
  { city: 'Charlotte', state: 'NC', population: 880000, tier: 1, region: 'southeast' },
  { city: 'Columbus', state: 'OH', population: 900000, tier: 1, region: 'midwest' },
  { city: 'Indianapolis', state: 'IN', population: 880000, tier: 1, region: 'midwest' },
  { city: 'Jacksonville', state: 'FL', population: 950000, tier: 1, region: 'southeast' },
  { city: 'San Antonio', state: 'TX', population: 1500000, tier: 1, region: 'southwest' },
  { city: 'Fort Worth', state: 'TX', population: 960000, tier: 1, region: 'southwest' },
  { city: 'Nashville', state: 'TN', population: 690000, tier: 1, region: 'southeast' },
  { city: 'Oklahoma City', state: 'OK', population: 680000, tier: 1, region: 'southwest' },
  { city: 'Louisville', state: 'KY', population: 630000, tier: 1, region: 'southeast' },
  { city: 'Memphis', state: 'TN', population: 630000, tier: 1, region: 'southeast' },
  { city: 'Richmond', state: 'VA', population: 230000, tier: 1, region: 'southeast' },
  { city: 'Raleigh', state: 'NC', population: 470000, tier: 1, region: 'southeast' },
  { city: 'Tucson', state: 'AZ', population: 545000, tier: 1, region: 'southwest' },
  { city: 'Mesa', state: 'AZ', population: 505000, tier: 1, region: 'southwest' },
  { city: 'Kansas City', state: 'MO', population: 500000, tier: 1, region: 'midwest' },
  { city: 'Omaha', state: 'NE', population: 490000, tier: 1, region: 'midwest' },
  { city: 'Colorado Springs', state: 'CO', population: 480000, tier: 1, region: 'west' },
  { city: 'Tulsa', state: 'OK', population: 410000, tier: 1, region: 'southwest' },
  { city: 'Arlington', state: 'TX', population: 395000, tier: 1, region: 'southwest' },
  { city: 'New Orleans', state: 'LA', population: 390000, tier: 1, region: 'southeast' },
  { city: 'Bakersfield', state: 'CA', population: 400000, tier: 1, region: 'west' },
  { city: 'Wichita', state: 'KS', population: 395000, tier: 1, region: 'midwest' },
  { city: 'Cleveland', state: 'OH', population: 370000, tier: 1, region: 'midwest' },
  { city: 'Aurora', state: 'CO', population: 390000, tier: 1, region: 'west' },
  { city: 'Anaheim', state: 'CA', population: 350000, tier: 1, region: 'west' },
  { city: 'Henderson', state: 'NV', population: 320000, tier: 1, region: 'west' },
  { city: 'Stockton', state: 'CA', population: 320000, tier: 1, region: 'west' },
  { city: 'Lexington', state: 'KY', population: 320000, tier: 1, region: 'southeast' },
  { city: 'Corpus Christi', state: 'TX', population: 320000, tier: 1, region: 'southwest' },
  { city: 'St. Paul', state: 'MN', population: 310000, tier: 1, region: 'midwest' },
  { city: 'Cincinnati', state: 'OH', population: 310000, tier: 1, region: 'midwest' },
  { city: 'Pittsburgh', state: 'PA', population: 305000, tier: 1, region: 'northeast' },
  { city: 'Greensboro', state: 'NC', population: 300000, tier: 1, region: 'southeast' },
  { city: 'St. Louis', state: 'MO', population: 295000, tier: 1, region: 'midwest' },
  { city: 'Lincoln', state: 'NE', population: 290000, tier: 1, region: 'midwest' },
  { city: 'Orlando', state: 'FL', population: 290000, tier: 1, region: 'southeast' },
  { city: 'Plano', state: 'TX', population: 285000, tier: 1, region: 'southwest' },
  { city: 'Irvine', state: 'CA', population: 280000, tier: 1, region: 'west' },
  { city: 'Newark', state: 'NJ', population: 280000, tier: 1, region: 'northeast' },
  { city: 'Durham', state: 'NC', population: 280000, tier: 1, region: 'southeast' },
  { city: 'Chula Vista', state: 'CA', population: 275000, tier: 1, region: 'west' },
  { city: 'Toledo', state: 'OH', population: 270000, tier: 1, region: 'midwest' },
  { city: 'Fort Wayne', state: 'IN', population: 265000, tier: 1, region: 'midwest' },
  { city: 'St. Petersburg', state: 'FL', population: 260000, tier: 1, region: 'southeast' },
  { city: 'Laredo', state: 'TX', population: 260000, tier: 1, region: 'southwest' },
  { city: 'Norfolk', state: 'VA', population: 245000, tier: 1, region: 'southeast' },
  { city: 'Madison', state: 'WI', population: 260000, tier: 1, region: 'midwest' },
  { city: 'Lubbock', state: 'TX', population: 260000, tier: 1, region: 'southwest' },
  { city: 'Chandler', state: 'AZ', population: 260000, tier: 1, region: 'southwest' },
  { city: 'Scottsdale', state: 'AZ', population: 255000, tier: 1, region: 'southwest' },
  { city: 'Reno', state: 'NV', population: 255000, tier: 1, region: 'west' },
  { city: 'Buffalo', state: 'NY', population: 255000, tier: 1, region: 'northeast' },
  { city: 'Gilbert', state: 'AZ', population: 250000, tier: 1, region: 'southwest' },
  { city: 'Glendale', state: 'AZ', population: 250000, tier: 1, region: 'southwest' },
  { city: 'North Las Vegas', state: 'NV', population: 250000, tier: 1, region: 'west' },
  { city: 'Winston-Salem', state: 'NC', population: 250000, tier: 1, region: 'southeast' },
  { city: 'Chesapeake', state: 'VA', population: 245000, tier: 1, region: 'southeast' },
  { city: 'Fremont', state: 'CA', population: 240000, tier: 1, region: 'west' },
  { city: 'Irving', state: 'TX', population: 240000, tier: 1, region: 'southwest' },
  { city: 'Richmond', state: 'VA', population: 230000, tier: 1, region: 'southeast' },
  { city: 'Boise', state: 'ID', population: 230000, tier: 1, region: 'northwest' },
  { city: 'Spokane', state: 'WA', population: 225000, tier: 1, region: 'northwest' },
  { city: 'Baton Rouge', state: 'LA', population: 225000, tier: 1, region: 'southeast' },
  { city: 'Des Moines', state: 'IA', population: 215000, tier: 1, region: 'midwest' },
  { city: 'Tacoma', state: 'WA', population: 215000, tier: 1, region: 'northwest' },
  { city: 'San Bernardino', state: 'CA', population: 215000, tier: 1, region: 'west' },
  { city: 'Modesto', state: 'CA', population: 215000, tier: 1, region: 'west' },
  { city: 'Fontana', state: 'CA', population: 215000, tier: 1, region: 'west' },
  { city: 'Moreno Valley', state: 'CA', population: 210000, tier: 1, region: 'west' },
  { city: 'Birmingham', state: 'AL', population: 200000, tier: 1, region: 'southeast' },
  { city: 'Rochester', state: 'NY', population: 210000, tier: 1, region: 'northeast' },
  { city: 'Fayetteville', state: 'NC', population: 210000, tier: 1, region: 'southeast' },
  { city: 'Oxnard', state: 'CA', population: 205000, tier: 1, region: 'west' },
  { city: 'Knoxville', state: 'TN', population: 190000, tier: 1, region: 'southeast' },
  { city: 'Salt Lake City', state: 'UT', population: 200000, tier: 1, region: 'west' },
  { city: 'Chattanooga', state: 'TN', population: 180000, tier: 1, region: 'southeast' },
  { city: 'Huntsville', state: 'AL', population: 215000, tier: 1, region: 'southeast' },
  { city: 'Tallahassee', state: 'FL', population: 195000, tier: 1, region: 'southeast' },
  { city: 'Augusta', state: 'GA', population: 200000, tier: 1, region: 'southeast' },
  { city: 'Grand Rapids', state: 'MI', population: 200000, tier: 1, region: 'midwest' },
  { city: 'Little Rock', state: 'AR', population: 200000, tier: 1, region: 'southeast' },
  { city: 'Amarillo', state: 'TX', population: 200000, tier: 1, region: 'southwest' },
  { city: 'Brownsville', state: 'TX', population: 190000, tier: 1, region: 'southwest' },
  { city: 'Mobile', state: 'AL', population: 190000, tier: 1, region: 'southeast' },
  { city: 'Tempe', state: 'AZ', population: 185000, tier: 1, region: 'southwest' },
  { city: 'Akron', state: 'OH', population: 190000, tier: 1, region: 'midwest' },
  { city: 'Savannah', state: 'GA', population: 150000, tier: 1, region: 'southeast' },
  { city: 'Knoxville', state: 'TN', population: 190000, tier: 1, region: 'southeast' },
  { city: 'Springfield', state: 'MO', population: 170000, tier: 1, region: 'midwest' },
  { city: 'Clarksville', state: 'TN', population: 165000, tier: 1, region: 'southeast' },
  { city: 'Dayton', state: 'OH', population: 140000, tier: 1, region: 'midwest' },
  { city: 'McKinney', state: 'TX', population: 200000, tier: 1, region: 'southwest' },
  { city: 'Frisco', state: 'TX', population: 200000, tier: 1, region: 'southwest' },
  { city: 'Cape Coral', state: 'FL', population: 195000, tier: 1, region: 'southeast' },
  { city: 'Sioux Falls', state: 'SD', population: 190000, tier: 1, region: 'midwest' },
  { city: 'Peoria', state: 'AZ', population: 190000, tier: 1, region: 'southwest' },

  // ── Tier 2: Smaller metros ───────────────────────────────────
  { city: 'Bend', state: 'OR', population: 100000, tier: 2, region: 'northwest' },
  { city: 'Asheville', state: 'NC', population: 95000, tier: 2, region: 'southeast' },
  { city: 'Pensacola', state: 'FL', population: 55000, tier: 2, region: 'southeast' },
  { city: 'Boulder', state: 'CO', population: 105000, tier: 2, region: 'west' },
  { city: 'Missoula', state: 'MT', population: 75000, tier: 2, region: 'northwest' },
  { city: 'Duluth', state: 'MN', population: 90000, tier: 2, region: 'midwest' },
  { city: 'Wilmington', state: 'NC', population: 120000, tier: 2, region: 'southeast' },
  { city: 'Charleston', state: 'SC', population: 150000, tier: 2, region: 'southeast' },
  { city: 'Greenville', state: 'SC', population: 72000, tier: 2, region: 'southeast' },
  { city: 'Columbia', state: 'SC', population: 135000, tier: 2, region: 'southeast' },
  { city: 'Bozeman', state: 'MT', population: 55000, tier: 2, region: 'northwest' },
  { city: 'Flagstaff', state: 'AZ', population: 75000, tier: 2, region: 'southwest' },
  { city: 'Bellingham', state: 'WA', population: 92000, tier: 2, region: 'northwest' },
  { city: 'Gainesville', state: 'FL', population: 140000, tier: 2, region: 'southeast' },
  { city: 'Tyler', state: 'TX', population: 105000, tier: 2, region: 'southwest' },
  { city: 'Lake Charles', state: 'LA', population: 80000, tier: 2, region: 'southeast' },
  { city: 'Panama City', state: 'FL', population: 37000, tier: 2, region: 'southeast' },
  { city: 'Rapid City', state: 'SD', population: 77000, tier: 2, region: 'midwest' },
  { city: 'Billings', state: 'MT', population: 120000, tier: 2, region: 'northwest' },
  { city: 'Cedar Rapids', state: 'IA', population: 135000, tier: 2, region: 'midwest' },
  { city: 'Topeka', state: 'KS', population: 125000, tier: 2, region: 'midwest' },
  { city: 'Springfield', state: 'IL', population: 115000, tier: 2, region: 'midwest' },
  { city: 'Evansville', state: 'IN', population: 115000, tier: 2, region: 'midwest' },
  { city: 'Fargo', state: 'ND', population: 125000, tier: 2, region: 'midwest' },
  { city: 'Macon', state: 'GA', population: 155000, tier: 2, region: 'southeast' },
  { city: 'Ocala', state: 'FL', population: 65000, tier: 2, region: 'southeast' },
  { city: 'Pueblo', state: 'CO', population: 112000, tier: 2, region: 'west' },
  { city: 'Santa Fe', state: 'NM', population: 88000, tier: 2, region: 'southwest' },
  { city: 'Prescott', state: 'AZ', population: 46000, tier: 2, region: 'southwest' },
  { city: 'Idaho Falls', state: 'ID', population: 65000, tier: 2, region: 'northwest' },
  { city: 'Medford', state: 'OR', population: 85000, tier: 2, region: 'northwest' },
  { city: 'Redding', state: 'CA', population: 92000, tier: 2, region: 'west' },
  { city: 'Meridian', state: 'ID', population: 115000, tier: 2, region: 'northwest' },
  { city: 'Fort Collins', state: 'CO', population: 170000, tier: 2, region: 'west' },
  { city: 'Lakeland', state: 'FL', population: 115000, tier: 2, region: 'southeast' },
  { city: 'Port St. Lucie', state: 'FL', population: 220000, tier: 2, region: 'southeast' },
  { city: 'Palm Bay', state: 'FL', population: 120000, tier: 2, region: 'southeast' },
  { city: 'Daytona Beach', state: 'FL', population: 72000, tier: 2, region: 'southeast' },
  { city: 'Murfreesboro', state: 'TN', population: 150000, tier: 2, region: 'southeast' },
  { city: 'Denton', state: 'TX', population: 140000, tier: 2, region: 'southwest' },
  { city: 'Killeen', state: 'TX', population: 155000, tier: 2, region: 'southwest' },
  { city: 'Midland', state: 'TX', population: 140000, tier: 2, region: 'southwest' },
  { city: 'Beaumont', state: 'TX', population: 115000, tier: 2, region: 'southwest' },
  { city: 'Waco', state: 'TX', population: 140000, tier: 2, region: 'southwest' },
  { city: 'College Station', state: 'TX', population: 120000, tier: 2, region: 'southwest' },
  { city: 'Round Rock', state: 'TX', population: 130000, tier: 2, region: 'southwest' },
  { city: 'Abilene', state: 'TX', population: 125000, tier: 2, region: 'southwest' },
  { city: 'Odessa', state: 'TX', population: 115000, tier: 2, region: 'southwest' },
  { city: 'Pearland', state: 'TX', population: 125000, tier: 2, region: 'southwest' },
  { city: 'Sugar Land', state: 'TX', population: 110000, tier: 2, region: 'southwest' },

  // ── Tier 3: Growing suburbs / exurbs ─────────────────────────
  { city: 'Lehi', state: 'UT', population: 75000, tier: 3, region: 'west' },
  { city: 'Pflugerville', state: 'TX', population: 72000, tier: 3, region: 'southwest' },
  { city: 'New Braunfels', state: 'TX', population: 90000, tier: 3, region: 'southwest' },
  { city: 'Conroe', state: 'TX', population: 95000, tier: 3, region: 'southwest' },
  { city: 'Georgetown', state: 'TX', population: 75000, tier: 3, region: 'southwest' },
  { city: 'Spring', state: 'TX', population: 60000, tier: 3, region: 'southwest' },
  { city: 'Katy', state: 'TX', population: 22000, tier: 3, region: 'southwest' },
  { city: 'Prosper', state: 'TX', population: 35000, tier: 3, region: 'southwest' },
  { city: 'Celina', state: 'TX', population: 25000, tier: 3, region: 'southwest' },
  { city: 'Draper', state: 'UT', population: 50000, tier: 3, region: 'west' },
  { city: 'Eagle Mountain', state: 'UT', population: 45000, tier: 3, region: 'west' },
  { city: 'Queen Creek', state: 'AZ', population: 60000, tier: 3, region: 'southwest' },
  { city: 'Buckeye', state: 'AZ', population: 90000, tier: 3, region: 'southwest' },
  { city: 'Maricopa', state: 'AZ', population: 55000, tier: 3, region: 'southwest' },
  { city: 'Goodyear', state: 'AZ', population: 95000, tier: 3, region: 'southwest' },
  { city: 'Castle Rock', state: 'CO', population: 75000, tier: 3, region: 'west' },
  { city: 'Parker', state: 'CO', population: 58000, tier: 3, region: 'west' },
  { city: 'Apex', state: 'NC', population: 60000, tier: 3, region: 'southeast' },
  { city: 'Holly Springs', state: 'NC', population: 42000, tier: 3, region: 'southeast' },
  { city: 'Weddington', state: 'NC', population: 12000, tier: 3, region: 'southeast' },
  { city: 'Mount Pleasant', state: 'SC', population: 95000, tier: 3, region: 'southeast' },
  { city: 'Riverview', state: 'FL', population: 95000, tier: 3, region: 'southeast' },
  { city: 'Wesley Chapel', state: 'FL', population: 70000, tier: 3, region: 'southeast' },
  { city: 'Winter Garden', state: 'FL', population: 45000, tier: 3, region: 'southeast' },
  { city: 'St. Cloud', state: 'FL', population: 55000, tier: 3, region: 'southeast' },
  { city: 'Nocatee', state: 'FL', population: 30000, tier: 3, region: 'southeast' },
  { city: 'Eagle', state: 'ID', population: 30000, tier: 3, region: 'northwest' },
  { city: 'Star', state: 'ID', population: 12000, tier: 3, region: 'northwest' },
  { city: 'Nampa', state: 'ID', population: 100000, tier: 3, region: 'northwest' },
  { city: 'Fishers', state: 'IN', population: 100000, tier: 3, region: 'midwest' },
  { city: 'Carmel', state: 'IN', population: 100000, tier: 3, region: 'midwest' },
  { city: 'Noblesville', state: 'IN', population: 70000, tier: 3, region: 'midwest' },
  { city: 'Ankeny', state: 'IA', population: 70000, tier: 3, region: 'midwest' },
  { city: 'Olathe', state: 'KS', population: 140000, tier: 3, region: 'midwest' },
  { city: 'Overland Park', state: 'KS', population: 195000, tier: 3, region: 'midwest' },
  { city: 'Lee\'s Summit', state: 'MO', population: 100000, tier: 3, region: 'midwest' },
  { city: 'Liberty', state: 'MO', population: 32000, tier: 3, region: 'midwest' },
  { city: 'Cary', state: 'NC', population: 175000, tier: 3, region: 'southeast' },
  { city: 'Wake Forest', state: 'NC', population: 48000, tier: 3, region: 'southeast' },
]

/** Get cities by tier */
export function getCitiesByTier(tier: 1 | 2 | 3): CityEntry[] {
  return US_CITIES.filter(c => c.tier === tier)
}

/** Get cities by region */
export function getCitiesByRegion(region: CityEntry['region']): CityEntry[] {
  return US_CITIES.filter(c => c.region === region)
}

/** Get a random sample of cities, optionally weighted toward a specific tier */
export function sampleCities(count: number, preferTier?: 1 | 2 | 3): CityEntry[] {
  let pool = [...US_CITIES]
  if (preferTier) {
    // Weight preferred tier 3x
    const preferred = pool.filter(c => c.tier === preferTier)
    pool = [...pool, ...preferred, ...preferred]
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  // Deduplicate after shuffle
  const seen = new Set<string>()
  const result: CityEntry[] = []
  for (const c of pool) {
    const key = `${c.city}:${c.state}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(c)
      if (result.length >= count) break
    }
  }
  return result
}
