/**
 * Contact Update Service
 * Handles customer contact information updates (email, mobile, amount)
 */

const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL;
const API_KEY = import.meta.env.VITE_XANO_CONTACT_UPDATE_API || 'jj0IjsgD';
const ENDPOINT = `${XANO_BASE_URL}/api:${API_KEY}/nic_customer_contact_update`;

class ContactUpdateService {
  /**
   * Create a new contact update
   * @param {Object} updateData - Update information
   * @returns {Promise<Object>} Created update record
   */
  async createUpdate(updateData) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create contact update');
      }

      const data = await response.json();
      console.log('✓ Contact update created:', data.id);
      return data;
    } catch (error) {
      console.error('Error creating contact update:', error);
      throw error;
    }
  }

  /**
   * Get latest contact update for a customer
   * Uses GET ALL with filters to find most recent update
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object|null>} Latest update or null
   */
  async getLatestContact(customerId) {
    try {
      // Fetch ALL updates (Xano filtering might not work as expected)
      const response = await fetch(ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contact updates');
      }

      const allData = await response.json();
      
      // Filter by customer ID on client side
      const customerUpdates = allData.filter(update => {
        // Handle both relationship object and direct ID
        const updateCustomerId = update.customer?.id || update.customer;
        return updateCustomerId === customerId || updateCustomerId === parseInt(customerId);
      });
      
      // Xano returns array, find most recent by created_at (captured_at has issues)
      if (customerUpdates && customerUpdates.length > 0) {
        // Sort by created_at (or id as fallback) descending and take first
        const sorted = customerUpdates.sort((a, b) => {
          // Use created_at if available, otherwise fall back to id (higher id = more recent)
          const dateA = a.created_at ? new Date(a.created_at) : new Date(a.id * 1000);
          const dateB = b.created_at ? new Date(b.created_at) : new Date(b.id * 1000);
          return dateB - dateA;
        });
        
        return sorted[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching latest contact:', error);
      return null;
    }
  }

  /**
   * Get all contact updates with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of updates
   */
  async getAllUpdates(filters = {}) {
    try {
      // Build query string from filters
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.agent) params.append('agent', filters.agent);
      if (filters.customer) params.append('customer', filters.customer);
      if (filters.page) params.append('page', filters.page);
      if (filters.per_page) params.append('per_page', filters.per_page);

      const url = params.toString() ? `${ENDPOINT}?${params}` : ENDPOINT;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contact updates');
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching contact updates:', error);
      throw error;
    }
  }

  /**
   * Get a specific contact update by ID
   * @param {number} updateId - Update ID
   * @returns {Promise<Object>} Update record
   */
  async getUpdateById(updateId) {
    try {
      const response = await fetch(`${ENDPOINT}/${updateId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contact update');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching contact update:', error);
      throw error;
    }
  }

  /**
   * Mark a contact update as synced
   * @param {number} updateId - Update ID
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Updated record
   */
  async markAsSynced(updateId, adminId) {
    try {
      const response = await fetch(`${ENDPOINT}/${updateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'synced',
          synced_at: new Date().toISOString(),
          synced_by: adminId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark update as synced');
      }

      const data = await response.json();
      console.log('✓ Update marked as synced:', updateId);
      return data;
    } catch (error) {
      console.error('Error marking update as synced:', error);
      throw error;
    }
  }

  /**
   * Bulk mark multiple updates as synced
   * Uses Promise.all to update multiple records in parallel
   * @param {Array<number>} updateIds - Array of update IDs
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Result summary
   */
  async bulkMarkAsSynced(updateIds, adminId) {
    try {
      const promises = updateIds.map(id => this.markAsSynced(id, adminId));
      const results = await Promise.allSettled(promises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`✓ Bulk sync complete: ${successful} successful, ${failed} failed`);

      return {
        success: true,
        synced_count: successful,
        failed_count: failed,
        total: updateIds.length,
      };
    } catch (error) {
      console.error('Error in bulk sync:', error);
      throw error;
    }
  }

  /**
   * Export contact updates to CSV format
   * @param {Array} updates - Array of update records
   * @returns {string} CSV string
   */
  exportToCSV(updates) {
    if (!updates || updates.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'ID',
      'Date',
      'Policy Number',
      'Customer Name',
      'Old Mobile',
      'New Mobile',
      'Old Email',
      'New Email',
      'Old Amount',
      'New Amount',
      'Reason',
      'Notes',
      'Agent',
      'Status',
    ];

    // CSV rows
    const rows = updates.map(update => [
      update.id,
      new Date(update.captured_at).toLocaleDateString(),
      update.customer?.policy_number || '',
      update.customer?.name || '',
      update.old_mobile || '',
      update.new_mobile || '',
      update.old_email || '',
      update.new_email || '',
      update.old_amount || '',
      update.new_amount || '',
      update.update_reason || '',
      update.notes || '',
      update.agent_name || '',
      update.status || '',
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Download CSV file
   * @param {Array} updates - Array of update records
   * @param {string} filename - Filename for download
   */
  downloadCSV(updates, filename = 'contact_updates.csv') {
    const csv = this.exportToCSV(updates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✓ CSV downloaded:', filename);
  }

  /**
   * Validate update data before submission
   * @param {Object} updateData - Update data to validate
   * @returns {Object} Validation result
   */
  validateUpdate(updateData) {
    const errors = [];

    // At least one field must be updated
    const hasUpdate = 
      updateData.new_mobile || 
      updateData.new_email || 
      updateData.new_amount;

    if (!hasUpdate) {
      errors.push('Please update at least one field (mobile, email, or amount)');
    }

    // Mobile validation (if provided)
    if (updateData.new_mobile) {
      const mobileRegex = /^\d{8}$/;
      if (!mobileRegex.test(updateData.new_mobile)) {
        errors.push('Mobile number must be 8 digits');
      }
    }

    // Email validation (if provided)
    if (updateData.new_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.new_email)) {
        errors.push('Invalid email format');
      }
    }

    // Amount validation (if provided)
    if (updateData.new_amount !== undefined && updateData.new_amount !== null) {
      const amount = parseFloat(updateData.new_amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push('Amount must be a positive number');
      }
      if (amount > 999999.99) {
        errors.push('Amount is too large (max: 999,999.99)');
      }
    }

    // Required fields
    if (!updateData.update_reason) {
      errors.push('Update reason is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const contactUpdateService = new ContactUpdateService();
export default contactUpdateService;
