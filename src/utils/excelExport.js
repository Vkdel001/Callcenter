import * as XLSX from 'xlsx'

/**
 * Export QR transactions to Excel
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} stats - Summary statistics object
 * @param {String} exportType - 'current', 'all', or 'summary'
 * @param {Object} filters - Current filter settings
 */
export const exportQRTransactionsToExcel = (transactions, stats, exportType, filters) => {
  // Create workbook
  const workbook = XLSX.utils.book_new()
  
  // Prepare transaction data
  const transactionData = transactions.map((t, index) => ({
    'No.': index + 1,
    'Policy Number': t.policy_number || '-',
    'Customer Name': t.customer_name || '-',
    'QR Type': getQRTypeLabel(t.qr_type),
    'Line of Business': (t.line_of_business || 'unknown').toUpperCase(),
    'Amount (LKR)': parseFloat(t.amount || 0).toFixed(2),
    'Payment Received (LKR)': t.status === 'paid' 
      ? parseFloat(t.payment_amount || t.amount || 0).toFixed(2) 
      : '-',
    'Status': (t.status || 'unknown').toUpperCase(),
    'Generated Date': formatDateForExcel(t.created_at),
    'Paid Date': t.paid_at ? formatDateForExcel(t.paid_at) : '-',
    'Transaction ID': t.id || '-'
  }))
  
  // Create transactions worksheet
  const transactionsSheet = XLSX.utils.json_to_sheet(transactionData)
  
  // Set column widths
  transactionsSheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 20 }, // Policy Number
    { wch: 25 }, // Customer Name
    { wch: 15 }, // QR Type
    { wch: 15 }, // Line of Business
    { wch: 15 }, // Amount
    { wch: 20 }, // Payment Received
    { wch: 10 }, // Status
    { wch: 20 }, // Generated Date
    { wch: 20 }, // Paid Date
    { wch: 15 }  // Transaction ID
  ]
  
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions')
  
  // Add summary sheet if requested
  if (exportType === 'summary') {
    const summaryData = [
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'FILTERS APPLIED', 'Value': '' },
      { 'Metric': 'Time Period', 'Value': filters.period },
      { 'Metric': 'Line of Business', 'Value': filters.lob === 'all' ? 'All LOBs' : filters.lob.toUpperCase() },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'SUMMARY STATISTICS', 'Value': '' },
      { 'Metric': 'Total QRs Generated', 'Value': stats.total_generated },
      { 'Metric': 'Total Payments Received', 'Value': stats.total_paid },
      { 'Metric': 'Total Pending', 'Value': stats.total_pending },
      { 'Metric': 'Conversion Rate', 'Value': `${stats.conversion_rate.toFixed(2)}%` },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'FINANCIAL SUMMARY', 'Value': '' },
      { 'Metric': 'Total Amount Generated (LKR)', 'Value': stats.total_amount_generated.toFixed(2) },
      { 'Metric': 'Total Amount Collected (LKR)', 'Value': stats.total_amount_paid.toFixed(2) },
      { 'Metric': 'Collection Rate', 'Value': `${((stats.total_amount_paid / stats.total_amount_generated) * 100).toFixed(2)}%` },
      { 'Metric': 'Outstanding Amount (LKR)', 'Value': (stats.total_amount_generated - stats.total_amount_paid).toFixed(2) }
    ]
    
    // Add LOB breakdown
    summaryData.push({ 'Metric': '', 'Value': '' })
    summaryData.push({ 'Metric': 'PERFORMANCE BY LINE OF BUSINESS', 'Value': '' })
    Object.entries(stats.by_lob).forEach(([lob, data]) => {
      summaryData.push({
        'Metric': lob.toUpperCase(),
        'Value': `${data.paid}/${data.generated} paid (${((data.paid / data.generated) * 100).toFixed(1)}%) - LKR ${data.amount.toFixed(2)}`
      })
    })
    
    // Add QR Type breakdown
    summaryData.push({ 'Metric': '', 'Value': '' })
    summaryData.push({ 'Metric': 'PERFORMANCE BY QR TYPE', 'Value': '' })
    Object.entries(stats.by_qr_type).forEach(([qrType, data]) => {
      summaryData.push({
        'Metric': getQRTypeLabel(qrType),
        'Value': `${data.paid}/${data.generated} paid (${((data.paid / data.generated) * 100).toFixed(1)}%) - LKR ${data.amount.toFixed(2)}`
      })
    })
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 35 }, { wch: 50 }]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `QR_Performance_${exportType}_${timestamp}.xlsx`
  
  // Download file
  XLSX.writeFile(workbook, filename)
  
  return filename
}

// Helper functions
const getQRTypeLabel = (qrType) => {
  switch (qrType) {
    case 'quick_qr': return 'Quick QR'
    case 'customer_detail': return 'Customer Detail'
    default: return qrType || 'Unknown'
  }
}

const formatDateForExcel = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
