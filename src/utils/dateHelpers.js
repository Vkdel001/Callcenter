/**
 * Date Helper Utilities for CSL Month-Year Management
 * Handles month-end date calculations and formatting
 */

/**
 * Calculate the last day of a given month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2025)
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getMonthEndDate(month, year) {
  // Create date for first day of NEXT month
  const nextMonth = new Date(year, month, 1)
  
  // Subtract one day to get last day of selected month
  const lastDay = new Date(nextMonth - 1)
  
  // Format as YYYY-MM-DD
  const yyyy = lastDay.getFullYear()
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0')
  const dd = String(lastDay.getDate()).padStart(2, '0')
  
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Format a date string to readable month-year format
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted as "February 2025"
 */
export function formatMonthYear(dateString) {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  
  return `${month} ${year}`
}

/**
 * Get month name from month number
 * @param {number} month - Month (1-12)
 * @returns {string} Month name (e.g., "February")
 */
export function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1] || ''
}

/**
 * Generate year options for dropdown (current year ± 2)
 * @returns {number[]} Array of years
 */
export function getYearOptions() {
  const currentYear = new Date().getFullYear()
  return [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2
  ]
}

/**
 * Get current month and year
 * @returns {{month: number, year: number}}
 */
export function getCurrentMonthYear() {
  const now = new Date()
  return {
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    year: now.getFullYear()
  }
}

// Examples:
// getMonthEndDate(2, 2025)  // "2025-02-28"
// getMonthEndDate(1, 2025)  // "2025-01-31"
// getMonthEndDate(2, 2024)  // "2024-02-29" (leap year)
// getMonthEndDate(4, 2025)  // "2025-04-30"
// formatMonthYear("2025-02-28")  // "February 2025"
