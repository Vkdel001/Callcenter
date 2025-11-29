import { useState } from 'react';
import { X } from 'lucide-react';
import contactUpdateService from '../../services/contactUpdateService';

const UpdateContactModal = ({ isOpen, onClose, customer, onSuccess }) => {
  const [formData, setFormData] = useState({
    newMobile: '',
    newEmail: '',
    newAmount: '',
    updateReason: '',
    notes: '',
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      // Get current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Prepare update data
      const updateData = {
        customer: customer.id,
        old_mobile: customer.mobile || null,
        new_mobile: formData.newMobile || null,
        old_email: customer.email || null,
        new_email: formData.newEmail || null,
        old_amount: customer.amount_due || null,
        new_amount: formData.newAmount ? parseFloat(formData.newAmount) : null,
        update_reason: formData.updateReason,
        notes: formData.notes || null,
        agent: user.id,
        agent_name: user.name || user.email,
      };

      // Validate
      const validation = contactUpdateService.validateUpdate(updateData);
      if (!validation.valid) {
        setErrors(validation.errors);
        setLoading(false);
        return;
      }

      // Save update
      await contactUpdateService.createUpdate(updateData);

      // Success
      if (onSuccess) {
        onSuccess(updateData);
      }

      // Close modal
      handleClose();
    } catch (error) {
      setErrors([error.message || 'Failed to save update']);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      newMobile: '',
      newEmail: '',
      newAmount: '',
      updateReason: '',
      notes: '',
    });
    setErrors([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Update Customer Information
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Customer Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Customer: <span className="font-medium text-gray-900">{customer.name}</span></p>
            <p className="text-sm text-gray-600">Policy: <span className="font-medium text-gray-900">{customer.policy_number}</span></p>
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <ul className="list-disc list-inside text-sm text-red-600">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mobile Number */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <p className="text-sm text-gray-500 mb-1">
              Current: {customer.mobile || 'Not set'}
            </p>
            <input
              type="text"
              value={formData.newMobile}
              onChange={(e) => setFormData({ ...formData, newMobile: e.target.value })}
              placeholder="Enter new mobile (8 digits)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength="8"
            />
            <p className="text-xs text-gray-400 mt-1">Format: 8 digits (e.g., 57372333)</p>
          </div>

          {/* Email Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <p className="text-sm text-gray-500 mb-1">
              Current: {customer.email || 'Not set'}
            </p>
            <input
              type="email"
              value={formData.newEmail}
              onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
              placeholder="Enter new email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Amount Due */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Due
            </label>
            <p className="text-sm text-gray-500 mb-1">
              Current: MUR {customer.amount_due ? parseFloat(customer.amount_due).toFixed(2) : '0.00'}
            </p>
            <input
              type="number"
              step="0.01"
              value={formData.newAmount}
              onChange={(e) => setFormData({ ...formData, newAmount: e.target.value })}
              placeholder="Enter corrected amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Format: Numbers only (e.g., 4500.00)</p>
          </div>

          {/* Update Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.updateReason}
              onChange={(e) => setFormData({ ...formData, updateReason: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select reason</option>
              <option value="Customer provided new contact">Customer provided new contact</option>
              <option value="Current contact is incorrect">Current contact is incorrect</option>
              <option value="Current contact is missing">Current contact is missing</option>
              <option value="Amount is incorrect">Amount is incorrect</option>
              <option value="Contact and amount incorrect">Contact and amount incorrect</option>
              <option value="Email bounced / SMS failed">Email bounced / SMS failed</option>
              <option value="Customer requested update">Customer requested update</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows="3"
              maxLength="500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.notes.length}/500 characters
            </p>
          </div>

          {/* Info Message */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Updated information will be used immediately for QR code generation and future communications.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateContactModal;
