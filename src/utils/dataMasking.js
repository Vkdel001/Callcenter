/**
 * Data Masking Utilities
 * Masks sensitive PII (National ID, Mobile, Email) for display in UI
 * Actual data remains unmasked in database for legitimate use
 */

/**
 * Mask National ID
 * Shows first 7 characters, masks the rest
 * Example: A0101851234567 → A010185*******
 * 
 * @param {string} nationalId - Original national ID
 * @returns {string} Masked national ID
 */
export function maskNationalId(nationalId) {
  if (!nationalId || typeof nationalId !== 'string') return ''
  if (nationalId.length < 7) return nationalId
  
  const visible = nationalId.substring(0, 7)
  const masked = '*'.repeat(nationalId.length - 7)
  return visible + masked
}

/**
 * Mask Mobile Number
 * Shows last 4 digits, masks the rest (industry standard)
 * Example: 57372333 → ****2333
 * 
 * @param {string} mobile - Original mobile number
 * @returns {string} Masked mobile number
 */
export function maskMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') return ''
  
  // Remove any non-digit characters
  const cleaned = mobile.replace(/\D/g, '')
  if (cleaned.length < 4) return cleaned
  
  const masked = '*'.repeat(cleaned.length - 4)
  const visible = cleaned.substring(cleaned.length - 4)
  return masked + visible
}

/**
 * Mask Email Address
 * Shows first 2 and last 2 characters of username, full domain
 * Example: john.smith@gmail.com → jo******th@gmail.com
 * 
 * @param {string} email - Original email address
 * @returns {string} Masked email address
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return ''
  
  const [username, domain] = email.split('@')
  
  if (username.length <= 2) {
    // Very short username: show first char only
    return username[0] + '*'.repeat(username.length - 1) + '@' + domain
  }
  
  if (username.length <= 4) {
    // Short username: show first and last char
    return username[0] + '*'.repeat(username.length - 2) + username[username.length - 1] + '@' + domain
  }
  
  // Normal username: show first 2 and last 2 characters
  const firstTwo = username.substring(0, 2)
  const lastTwo = username.substring(username.length - 2)
  const masked = '*'.repeat(username.length - 4)
  
  return firstTwo + masked + lastTwo + '@' + domain
}

/**
 * Mask all PII fields in an object
 * Useful for masking entire customer/QR records
 * 
 * @param {Object} data - Object containing PII fields
 * @returns {Object} Object with masked PII fields
 */
export function maskPII(data) {
  if (!data || typeof data !== 'object') return data
  
  const masked = { ...data }
  
  if (masked.national_id) {
    masked.national_id = maskNationalId(masked.national_id)
  }
  
  if (masked.mobile) {
    masked.mobile = maskMobile(masked.mobile)
  }
  
  if (masked.email) {
    masked.email = maskEmail(masked.email)
  }
  
  return masked
}

/**
 * Check if a value is masked
 * Useful for conditional logic
 * 
 * @param {string} value - Value to check
 * @returns {boolean} True if value contains masking asterisks
 */
export function isMasked(value) {
  return typeof value === 'string' && value.includes('*')
}
