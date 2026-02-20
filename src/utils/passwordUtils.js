/**
 * Password Utility Functions
 * Simple password generation (no hashing - passwords stored as plain text)
 */

/**
 * Generate a simple 8-character password
 * Uses alphanumeric characters excluding ambiguous ones (0, O, I, l)
 * @returns {string} Generated password
 */
export const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        textArea.remove()
        return true
      } catch (error) {
        console.error('Fallback copy failed:', error)
        textArea.remove()
        return false
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
