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
