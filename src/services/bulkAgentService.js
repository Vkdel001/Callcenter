import { agentApi } from './apiClient'

/**
 * Bulk Agent Service
 * Handles CSV parsing, validation, and bulk agent creation
 */
class BulkAgentService {
  constructor() {
    this.baseUrl = '/nic_cc_agent'
  }

  /**
   * Parse CSV file content
   * @param {File} file - CSV file
   * @returns {Promise<Array>} Parsed CSV data
   */
  async parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const csvText = event.target.result
          const lines = csvText.split('\n').filter(line => line.trim())
          
          if (lines.length === 0) {
            throw new Error('CSV file is empty')
          }

          // Parse header row
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          
          // Validate required headers
          const requiredHeaders = ['name', 'email']
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
          
          if (missingHeaders.length > 0) {
            throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
          }

          // Parse data rows
          const records = []
          for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i])
            
            if (values.length !== headers.length) {
              console.warn(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`)
              continue
            }

            const record = {}
            headers.forEach((header, index) => {
              record[header] = values[index]?.trim() || ''
            })
            
            record._rowNumber = i + 1
            records.push(record)
          }

          resolve({
            headers,
            records,
            totalRows: lines.length - 1
          })
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read CSV file'))
      reader.readAsText(file)
    })
  }

  /**
   * Parse a single CSV line handling quoted values
   * @param {string} line - CSV line
   * @returns {Array} Parsed values
   */
  parseCSVLine(line) {
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current)
    return values.map(v => v.replace(/"/g, ''))
  }

  /**
   * Validate parsed CSV records
   * @param {Array} records - Parsed CSV records
   * @returns {Object} Validation results
   */
  async validateRecords(records) {
    const validRecords = []
    const invalidRecords = []
    const errors = []
    
    // Check for existing emails to detect duplicates
    let existingEmails = []
    try {
      const response = await agentApi.get(this.baseUrl)
      existingEmails = (response.data || []).map(agent => agent.email.toLowerCase())
    } catch (error) {
      console.warn('Could not fetch existing agents for duplicate check:', error)
    }

    const processedEmails = new Set()
    const duplicateEmails = []

    for (const record of records) {
      const recordErrors = []
      
      // Validate required fields
      if (!record.name || record.name.trim() === '') {
        recordErrors.push({ field: 'name', message: 'Name is required' })
      } else if (record.name.length < 2 || record.name.length > 100) {
        recordErrors.push({ field: 'name', message: 'Name must be 2-100 characters' })
      }

      if (!record.email || record.email.trim() === '') {
        recordErrors.push({ field: 'email', message: 'Email is required' })
      } else {
        const email = record.email.toLowerCase().trim()
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          recordErrors.push({ field: 'email', message: 'Invalid email format' })
        }
        
        // Check for duplicates in existing database
        if (existingEmails.includes(email)) {
          duplicateEmails.push(record)
          recordErrors.push({ field: 'email', message: 'Email already exists in database' })
        }
        
        // Check for duplicates within the CSV
        if (processedEmails.has(email)) {
          recordErrors.push({ field: 'email', message: 'Duplicate email in CSV' })
        } else {
          processedEmails.add(email)
        }
      }

      // Validate optional fields
      if (record.role && !['agent', 'admin', 'csr_agent', 'internal_agent', 'life_admin'].includes(record.role)) {
        recordErrors.push({ field: 'role', message: 'Invalid role value' })
      }

      if (record.agent_type && !['call_center', 'sales_agent', 'csr_agent', 'internal_agent'].includes(record.agent_type)) {
        recordErrors.push({ field: 'agent_type', message: 'Invalid agent_type value' })
      }

      if (record.admin_lob && !['life', 'health', 'motor'].includes(record.admin_lob)) {
        recordErrors.push({ field: 'admin_lob', message: 'Invalid admin_lob value' })
      }

      if (record.branch_id && record.branch_id !== '') {
        const branchId = parseInt(record.branch_id)
        if (isNaN(branchId) || branchId < 1) {
          recordErrors.push({ field: 'branch_id', message: 'Branch ID must be a positive number' })
        }
      }

      // Add errors to the main errors array
      recordErrors.forEach(error => {
        errors.push({
          row: record._rowNumber,
          field: error.field,
          message: error.message
        })
      })

      // Categorize record
      if (recordErrors.length === 0) {
        validRecords.push(record)
      } else {
        invalidRecords.push({
          ...record,
          errors: recordErrors
        })
      }
    }

    return {
      totalRecords: records.length,
      validRecords,
      invalidRecords,
      duplicateEmails,
      errors,
      summary: {
        valid: validRecords.length,
        invalid: invalidRecords.length,
        duplicates: duplicateEmails.length
      }
    }
  }

  /**
   * Generate a simple 8-character password
   * @returns {string} Generated password
   */
  generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  /**
   * Create agents in batches
   * @param {Array} validRecords - Valid agent records
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Creation results
   */
  async createAgentsInBatches(validRecords, onProgress = () => {}) {
    const batchSize = 10
    const results = {
      created: [],
      failed: [],
      passwords: []
    }

    const totalBatches = Math.ceil(validRecords.length / batchSize)
    
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize
      const endIndex = Math.min(startIndex + batchSize, validRecords.length)
      const batch = validRecords.slice(startIndex, endIndex)

      onProgress({
        currentBatch: i + 1,
        totalBatches,
        processed: startIndex,
        total: validRecords.length,
        status: `Processing batch ${i + 1} of ${totalBatches}...`
      })

      // Process batch
      for (const record of batch) {
        try {
          const password = this.generatePassword()
          
          const agentData = {
            name: record.name.trim(),
            email: record.email.toLowerCase().trim(),
            password_hash: password, // Store plain password for now (should be hashed in production)
            role: record.role || 'agent',
            active: true,
            current_batch_size: 0,
            branch_id: record.branch_id ? parseInt(record.branch_id) : 1,
            agent_type: record.agent_type || 'call_center',
            sales_agent_id: record.sales_agent_id || null,
            admin_lob: record.admin_lob || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_logout_time: null
          }

          const response = await agentApi.post(this.baseUrl, agentData)
          
          results.created.push(response.data)
          results.passwords.push({
            email: agentData.email,
            password: password,
            name: agentData.name
          })

        } catch (error) {
          console.error('Failed to create agent:', record.email, error)
          results.failed.push({
            record,
            error: error.message
          })
        }
      }

      // Small delay between batches to avoid overwhelming the API
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    onProgress({
      currentBatch: totalBatches,
      totalBatches,
      processed: validRecords.length,
      total: validRecords.length,
      status: 'Complete'
    })

    return results
  }

  /**
   * Generate downloadable password report
   * @param {Array} passwords - Password data
   * @returns {string} CSV content
   */
  generatePasswordReport(passwords) {
    const headers = ['Name', 'Email', 'Password', 'Created Date']
    const rows = passwords.map(p => [
      p.name,
      p.email,
      p.password,
      new Date().toLocaleDateString()
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    return csvContent
  }

  /**
   * Download file as CSV
   * @param {string} content - CSV content
   * @param {string} filename - File name
   */
  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  /**
   * Create audit log entry
   * @param {Object} operation - Operation details
   * @param {Object} user - Current user
   * @returns {Promise<void>}
   */
  async createAuditLog(operation, user) {
    try {
      const auditData = {
        action: 'bulk_agent_creation',
        admin_user: user.id,
        admin_email: user.email,
        records_processed: operation.totalRecords,
        records_created: operation.created,
        records_skipped: operation.skipped,
        records_failed: operation.failed,
        timestamp: new Date().toISOString(),
        file_name: operation.fileName
      }

      console.log('Audit log created:', auditData)
      // TODO: Implement audit log storage if needed
      
    } catch (error) {
      console.error('Failed to create audit log:', error)
    }
  }
}

export const bulkAgentService = new BulkAgentService()