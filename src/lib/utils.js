// The fixed set of team categories. 'general' is kept as the internal value
// (auto-add-to-general, engaged/non-engaged classification, and sticky notes
// gating all key off this exact string) — only its displayed label changes.
export const TEAM_CATEGORIES = [
  { value: 'general', label: 'General (Internal)' },
  { value: 'paid', label: 'Paid' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'gtm (cos)', label: 'GTM (CoS)' },
  { value: 'staff', label: 'Staff' },
  { value: 'assignment', label: 'Assignment' }
]

/**
 * Maps a team's internal category value to its display label.
 * Falls back to the raw value (capitalized) for any legacy/unmapped category.
 * @param {string} category - The raw team.category value
 * @returns {string} The display label
 */
export const getTeamCategoryLabel = (category) => {
  const normalized = (category || '').toLowerCase().trim()
  const match = TEAM_CATEGORIES.find(c => c.value === normalized)
  if (match) return match.label
  if (!normalized) return 'General (Internal)'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

/**
 * Calculates experience dynamically in months and days from a joining date.
 * @param {string} joiningDateStr - The joining date as a string (YYYY-MM-DD)
 * @returns {string} The formatted experience (e.g. "2 months, 5 days")
 */
export const calculateDynamicExperience = (joiningDateStr) => {
  if (!joiningDateStr) return 'N/A'
  const joinDate = new Date(joiningDateStr)
  joinDate.setHours(0, 0, 0, 0)
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  if (currentDate < joinDate) return '0 months, 0 days'

  // Total months
  let months = (currentDate.getFullYear() - joinDate.getFullYear()) * 12 + (currentDate.getMonth() - joinDate.getMonth())
  let days = currentDate.getDate() - joinDate.getDate()

  if (days < 0) {
    months -= 1
    // Find the number of days in the previous month
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
    days += prevMonth.getDate()
  }

  const monthText = `${months} month${months !== 1 ? 's' : ''}`
  const dayText = `${days} day${days !== 1 ? 's' : ''}`

  return `${monthText}, ${dayText}`
}
