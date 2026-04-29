/**
 * Niche Library — codified from docs/22-Niche-Hunting-SOP.md
 * 60+ niches across 10 verticals for autonomous discovery.
 */

export interface NicheEntry {
  name: string
  vertical: string
  searchTerms: string[]
  revenueEstimate: 'high' | 'moderate' | 'low' | 'very_low'
  franchiseRisk: boolean
}

export const NICHE_LIBRARY: NicheEntry[] = [
  // ── Home Services ──
  { name: 'hvac', vertical: 'home_services', searchTerms: ['hvac', 'heating and cooling', 'air conditioning repair'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'plumbing', vertical: 'home_services', searchTerms: ['plumber', 'plumbing services'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'roofing', vertical: 'home_services', searchTerms: ['roofing contractor', 'roof repair'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'electrical', vertical: 'home_services', searchTerms: ['electrician', 'electrical contractor'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'landscaping', vertical: 'home_services', searchTerms: ['landscaping', 'lawn care service'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'pool services', vertical: 'home_services', searchTerms: ['pool service', 'pool cleaning', 'pool maintenance'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'fence and deck', vertical: 'home_services', searchTerms: ['fence company', 'deck builder', 'fence installation'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'garage door', vertical: 'home_services', searchTerms: ['garage door repair', 'garage door installation'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'appliance repair', vertical: 'home_services', searchTerms: ['appliance repair', 'appliance service'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'house cleaning', vertical: 'home_services', searchTerms: ['house cleaning service', 'maid service'], revenueEstimate: 'low', franchiseRisk: true },
  { name: 'junk removal', vertical: 'home_services', searchTerms: ['junk removal', 'junk hauling'], revenueEstimate: 'moderate', franchiseRisk: true },
  { name: 'moving company', vertical: 'home_services', searchTerms: ['moving company', 'local movers'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'painting', vertical: 'home_services', searchTerms: ['house painter', 'painting contractor'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'flooring', vertical: 'home_services', searchTerms: ['flooring company', 'flooring installation'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'window cleaning', vertical: 'home_services', searchTerms: ['window cleaning service', 'window washer'], revenueEstimate: 'low', franchiseRisk: false },

  // ── Property Maintenance ──
  { name: 'pest control', vertical: 'property', searchTerms: ['pest control', 'exterminator'], revenueEstimate: 'moderate', franchiseRisk: true },
  { name: 'tree service', vertical: 'property', searchTerms: ['tree service', 'tree removal', 'tree trimming'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'septic and drain', vertical: 'property', searchTerms: ['septic service', 'drain cleaning'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'foundation repair', vertical: 'property', searchTerms: ['foundation repair', 'foundation contractor'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'waterproofing', vertical: 'property', searchTerms: ['basement waterproofing', 'waterproofing contractor'], revenueEstimate: 'high', franchiseRisk: false },

  // ── Auto ──
  { name: 'auto detailing', vertical: 'auto', searchTerms: ['auto detailing', 'car detailing'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'mobile mechanic', vertical: 'auto', searchTerms: ['mobile mechanic', 'mobile auto repair'], revenueEstimate: 'low', franchiseRisk: false },
  { name: 'towing', vertical: 'auto', searchTerms: ['towing service', 'tow truck'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'body shop', vertical: 'auto', searchTerms: ['auto body shop', 'collision repair'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'auto glass', vertical: 'auto', searchTerms: ['auto glass repair', 'windshield replacement'], revenueEstimate: 'moderate', franchiseRisk: true },

  // ── Pets ──
  { name: 'dog grooming', vertical: 'pets', searchTerms: ['dog grooming', 'pet grooming'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'pet boarding', vertical: 'pets', searchTerms: ['pet boarding', 'dog boarding', 'kennel'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'veterinary', vertical: 'pets', searchTerms: ['veterinarian', 'vet clinic', 'animal hospital'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'dog training', vertical: 'pets', searchTerms: ['dog training', 'dog trainer'], revenueEstimate: 'moderate', franchiseRisk: false },

  // ── Health & Wellness ──
  { name: 'chiropractor', vertical: 'health', searchTerms: ['chiropractor', 'chiropractic'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'physical therapy', vertical: 'health', searchTerms: ['physical therapy', 'physical therapist'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'massage therapy', vertical: 'health', searchTerms: ['massage therapist', 'massage therapy'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'acupuncture', vertical: 'health', searchTerms: ['acupuncture', 'acupuncturist'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'med spa', vertical: 'health', searchTerms: ['med spa', 'medical spa', 'medspa'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'dentist', vertical: 'health', searchTerms: ['dentist', 'dental office', 'dental clinic'], revenueEstimate: 'high', franchiseRisk: false },

  // ── Education & Activities ──
  { name: 'tutoring', vertical: 'education', searchTerms: ['tutoring center', 'tutor'], revenueEstimate: 'moderate', franchiseRisk: true },
  { name: 'music lessons', vertical: 'education', searchTerms: ['music lessons', 'music school', 'piano lessons'], revenueEstimate: 'low', franchiseRisk: false },
  { name: 'martial arts', vertical: 'education', searchTerms: ['martial arts studio', 'karate', 'taekwondo'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'dance studio', vertical: 'education', searchTerms: ['dance studio', 'dance classes'], revenueEstimate: 'moderate', franchiseRisk: false },

  // ── Events ──
  { name: 'event venue', vertical: 'events', searchTerms: ['event venue', 'wedding venue', 'banquet hall'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'catering', vertical: 'events', searchTerms: ['catering service', 'caterer'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'florist', vertical: 'events', searchTerms: ['florist', 'flower shop'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'photographer', vertical: 'events', searchTerms: ['photographer', 'wedding photographer'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'dj service', vertical: 'events', searchTerms: ['dj service', 'wedding dj', 'event dj'], revenueEstimate: 'low', franchiseRisk: false },

  // ── Personal Care ──
  { name: 'tattoo studio', vertical: 'personal_care', searchTerms: ['tattoo studio', 'tattoo shop', 'tattoo parlor'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'barbershop', vertical: 'personal_care', searchTerms: ['barbershop', 'barber'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'nail salon', vertical: 'personal_care', searchTerms: ['nail salon', 'nail spa'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'hair salon', vertical: 'personal_care', searchTerms: ['hair salon', 'beauty salon'], revenueEstimate: 'moderate', franchiseRisk: false },
  { name: 'lash and brow', vertical: 'personal_care', searchTerms: ['lash extensions', 'brow studio', 'lash studio'], revenueEstimate: 'moderate', franchiseRisk: false },

  // ── Food & Beverage ──
  { name: 'bakery', vertical: 'food', searchTerms: ['bakery', 'cake shop'], revenueEstimate: 'low', franchiseRisk: false },
  { name: 'coffee shop', vertical: 'food', searchTerms: ['coffee shop', 'cafe'], revenueEstimate: 'low', franchiseRisk: true },
  { name: 'food truck', vertical: 'food', searchTerms: ['food truck', 'mobile food'], revenueEstimate: 'low', franchiseRisk: false },
  { name: 'restaurant', vertical: 'food', searchTerms: ['restaurant', 'family restaurant'], revenueEstimate: 'moderate', franchiseRisk: true },
  { name: 'juice bar', vertical: 'food', searchTerms: ['juice bar', 'smoothie bar'], revenueEstimate: 'low', franchiseRisk: true },

  // ── Professional Services ──
  { name: 'accounting', vertical: 'professional', searchTerms: ['accountant', 'cpa', 'tax preparer'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'real estate agent', vertical: 'professional', searchTerms: ['real estate agent', 'realtor'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'insurance agent', vertical: 'professional', searchTerms: ['insurance agent', 'insurance agency'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'law firm', vertical: 'professional', searchTerms: ['lawyer', 'law firm', 'attorney'], revenueEstimate: 'high', franchiseRisk: false },
  { name: 'notary', vertical: 'professional', searchTerms: ['notary public', 'mobile notary'], revenueEstimate: 'low', franchiseRisk: false },
  { name: 'printing', vertical: 'professional', searchTerms: ['print shop', 'printing service'], revenueEstimate: 'low', franchiseRisk: true },
]

export function getNicheByName(name: string): NicheEntry | undefined {
  return NICHE_LIBRARY.find(n => n.name === name)
}

export function getNichesByVertical(vertical: string): NicheEntry[] {
  return NICHE_LIBRARY.filter(n => n.vertical === vertical)
}

export function getVerticals(): string[] {
  return [...new Set(NICHE_LIBRARY.map(n => n.vertical))]
}
