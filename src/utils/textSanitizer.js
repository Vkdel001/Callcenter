/**
 * Text Sanitization Utilities
 * Removes accents and special characters for data consistency
 */

/**
 * Remove accents from text and convert to ASCII
 * @param {string} text - Text with potential accents
 * @returns {string} - Text without accents
 */
export const removeAccents = (text) => {
  if (!text || typeof text !== 'string') return text

  // Mapping of accented characters to their ASCII equivalents
  const accentMap = {
    // Lowercase
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'œ': 'oe',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ç': 'c', 'ñ': 'n',
    
    // Uppercase
    'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
    'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
    'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O', 'Œ': 'OE',
    'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
    'Ý': 'Y', 'Ÿ': 'Y',
    'Ç': 'C', 'Ñ': 'N'
  }

  // Replace each accented character
  return text.split('').map(char => accentMap[char] || char).join('')
}

/**
 * Sanitize customer name for database storage and QR codes
 * @param {string} name - Original name
 * @returns {string} - Sanitized name
 */
export const sanitizeCustomerName = (name) => {
  if (!name) return name
  
  // Remove accents
  let sanitized = removeAccents(name)
  
  // Remove any remaining non-ASCII characters (corrupted characters like �)
  sanitized = sanitized.replace(/[^\x00-\x7F]/g, '')
  
  // Clean up multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim()
  
  return sanitized
}

/**
 * Sanitize all text fields in customer data
 * @param {object} customer - Customer object
 * @returns {object} - Customer object with sanitized text fields
 */
export const sanitizeCustomerData = (customer) => {
  const sanitized = { ...customer }
  
  // Fields that should be sanitized
  const textFields = ['name', 'name_owner2', 'address', 'email']
  
  textFields.forEach(field => {
    if (sanitized[field]) {
      if (field === 'email') {
        // For email, only sanitize the name part before @
        const emailParts = sanitized[field].split('@')
        if (emailParts.length === 2) {
          sanitized[field] = `${removeAccents(emailParts[0])}@${emailParts[1]}`
        }
      } else {
        sanitized[field] = sanitizeCustomerName(sanitized[field])
      }
    }
  })
  
  return sanitized
}

/**
 * Test function to verify sanitization
 */
export const testSanitization = () => {
  const testCases = [
    { input: 'Kaminee Dupré', expected: 'Kaminee Dupre' },
    { input: 'François Léger', expected: 'Francois Leger' },
    { input: 'Chloé Bérenger', expected: 'Chloe Berenger' },
    { input: 'José García', expected: 'Jose Garcia' },
    { input: 'Müller', expected: 'Muller' },
    { input: 'Kaminee Dupr�', expected: 'Kaminee Dupr' }, // Corrupted character
  ]
  
  console.log('🧪 Testing Text Sanitization:')
  testCases.forEach(({ input, expected }) => {
    const result = sanitizeCustomerName(input)
    const status = result === expected ? '✅' : '❌'
    console.log(`${status} "${input}" → "${result}" (expected: "${expected}")`)
  })
}
