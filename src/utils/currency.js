// Currency formatting utility for Mauritian Rupee (MUR)

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'MUR 0.00'
  
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) return 'MUR 0.00'
  
  return `MUR ${numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

// Short format without decimals for display
export const formatCurrencyShort = (amount) => {
  if (amount === null || amount === undefined) return 'MUR 0'
  
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) return 'MUR 0'
  
  // For whole numbers, don't show decimals
  if (numAmount % 1 === 0) {
    return `MUR ${numAmount.toLocaleString('en-US')}`
  }
  
  return `MUR ${numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}