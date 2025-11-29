import jsPDF from 'jspdf'

class AODPdfService {
  constructor() {
    this.pageWidth = 210 // A4 width in mm
    this.pageHeight = 297 // A4 height in mm
    this.margin = 15
    this.contentWidth = this.pageWidth - (this.margin * 2)
    this.lineHeight = 4.5  // Reduced from 5 for more compact layout
    this.sectionSpacing = 6  // Reduced from 8 for more compact layout
  }

  async generateAODPdf(aodData, customer, installments = []) {
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    // Generate Page 1 (Front)
    this.generatePage1(pdf, aodData, customer, installments)
    
    // Add Page 2 (Back)
    pdf.addPage()
    this.generatePage2(pdf, aodData, customer)
    
    return pdf
  }

  generatePage1(pdf, aodData, customer, installments) {
    let yPos = this.margin

    // Debug: Log customer data to see what fields are available
    console.log('📄 PDF Generation - Customer Data:', {
      name: customer.name,
      title_owner1: customer.title_owner1,
      national_id: customer.national_id,
      address: customer.address,
      name_owner2: customer.name_owner2,
      title_owner2: customer.title_owner2,
      national_id_owner2: customer.national_id_owner2
    })

    // Professional Header with NIC Logo - Very compact
    this.addHeader(pdf, yPos)
    yPos += 30

    // Title Section
    yPos = this.addTitle(pdf, yPos)
    yPos += 5

    // Parties Section
    yPos = this.addPartiesSection(pdf, customer, yPos)
    yPos += 5

    // Agreement Sections
    yPos = this.addAgreementSections(pdf, aodData, yPos)
    yPos += 5

    // Payment Method Section
    this.addPaymentMethodSection(pdf, aodData, yPos, installments)
  }

  addHeader(pdf, yPos) {
    // NIC Logo and Company Info - More compact
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 51, 102) // Dark blue
    pdf.text('NIC', this.pageWidth / 2, yPos + 8, { align: 'center' })
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    pdf.text('NATIONAL INSURANCE COMPANY', this.pageWidth / 2, yPos + 15, { align: 'center' })
    
    pdf.setFontSize(9)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Life & Pensions', this.pageWidth / 2, yPos + 21, { align: 'center' })
    
    // Decorative line
    pdf.setDrawColor(0, 51, 102)
    pdf.setLineWidth(0.5)
    pdf.line(this.margin + 30, yPos + 25, this.pageWidth - this.margin - 30, yPos + 25)
  }

  addTitle(pdf, yPos) {
    // Professional title with background - More compact
    pdf.setFillColor(0, 51, 102) // Dark blue background
    pdf.roundedRect(this.margin, yPos, this.contentWidth, 10, 2, 2, 'F')
    
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255) // White text
    pdf.text('ACKNOWLEDGMENT OF DEBT', this.pageWidth / 2, yPos + 7, { align: 'center' })
    
    pdf.setTextColor(0, 0, 0) // Reset to black
    return yPos + 15
  }

  addPartiesSection(pdf, customer, yPos) {
    // Between section - More compact
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Between', this.margin, yPos)
    yPos += this.lineHeight + 2

    // NICL Details with proper text wrapping - Use full line width with justify
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    const niclText = 'National Insurance Co. Ltd, a company incorporated under the laws of the Republic of Mauritius with business registration number C15123641 and having its registered office at NIC Centre, 217 Royal Road, Curepipe, duly authorised for the present purpose by its directors.'
    
    const niclLines = pdf.splitTextToSize(niclText, this.contentWidth)
    pdf.text(niclLines, this.margin, yPos, { maxWidth: this.contentWidth, align: 'justify' })
    yPos += niclLines.length * this.lineHeight + 2

    pdf.setFont('helvetica', 'italic')
    pdf.text('(Hereinafter referred to as "NICL")', this.pageWidth - this.margin - 5, yPos, { align: 'right' })
    yPos += this.lineHeight + 1

    pdf.setFont('helvetica', 'bold')
    pdf.text('ON THE ONE HAND', this.pageWidth - this.margin - 5, yPos, { align: 'right' })
    yPos += this.lineHeight + 3

    // Customer Details Section
    pdf.setFont('helvetica', 'bold')
    pdf.text('And', this.margin, yPos)
    yPos += this.lineHeight + 2

    // Customer info with professional styling
    pdf.setFont('helvetica', 'normal')
    
    // Owner 1 (Primary) - Use actual customer data
    const title1 = customer.title_owner1 || 'Mr/Mrs/Ms'
    const name1 = customer.name || '_'.repeat(30)
    const nic1 = customer.national_id || '_'.repeat(15)
    const address = customer.address || '_'.repeat(40)
    
    // Combine into single continuous text for natural line wrapping - More compact
    const owner1Text = `${title1} ${name1} holder of National Identity Card No. ${nic1}, residing at ${address}`
    const owner1Lines = pdf.splitTextToSize(owner1Text, this.contentWidth)
    pdf.text(owner1Lines, this.margin, yPos, { maxWidth: this.contentWidth, align: 'justify' })
    yPos += owner1Lines.length * this.lineHeight + 2

    // Owner 2 (Secondary) - Show actual data if exists, otherwise blank lines
    if (customer.name_owner2 && customer.name_owner2.trim() !== '') {
      // Second owner exists - use actual data
      const title2 = customer.title_owner2 || 'Mr/Mrs/Ms'
      const name2 = customer.name_owner2
      const nic2 = customer.national_id_owner2 || '_'.repeat(15)
      
      // Format as single continuous text for better alignment - Use full line width with justify
      const owner2Text = `and ${title2} ${name2} holder of National Identity Card No. ${nic2}, residing at ${address}`
      const owner2Lines = pdf.splitTextToSize(owner2Text, this.contentWidth)
      pdf.text(owner2Lines, this.margin, yPos, { maxWidth: this.contentWidth, align: 'justify' })
      yPos += owner2Lines.length * this.lineHeight + 2
    } else {
      // No second owner - show blank lines for manual filling as one continuous line
      pdf.text('and Mr/Mrs/Ms _________________________ holder of National Identity Card No. ________________, residing at _________________________________', this.margin, yPos)
      yPos += this.lineHeight + 2
    }

    // Policy Owner reference - More compact
    pdf.setFont('helvetica', 'italic')
    pdf.text('(Hereinafter referred to as the "Policy Owner")', this.pageWidth / 2, yPos, { align: 'center' })
    yPos += this.lineHeight + 1
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('ON THE OTHER HAND', this.pageWidth / 2, yPos, { align: 'center' })
    yPos += this.lineHeight + 1
    
    pdf.setFont('helvetica', 'italic')
    const partiesText = '(Hereinafter collectively referred to as the "Parties" and individually referred to as the "Party")'
    const partiesLines = pdf.splitTextToSize(partiesText, this.contentWidth - 20)
    pdf.text(partiesLines, this.pageWidth / 2, yPos, { align: 'center' })
    yPos += partiesLines.length * this.lineHeight

    return yPos
  }

  addAgreementSections(pdf, aodData, yPos) {
    // Agreement intro - More compact
    pdf.setFont('helvetica', 'normal')
    pdf.text('The Parties have reached an agreement with respect to the following:', this.margin, yPos)
    yPos += this.lineHeight + 3

    // 1. Acknowledgment
    pdf.setFont('helvetica', 'bold')
    pdf.text('1.', this.margin, yPos)
    pdf.text('Acknowledgment', this.margin + 8, yPos)
    yPos += this.lineHeight + 1

    pdf.setFont('helvetica', 'normal')
    const amount = aodData.outstanding_amount?.toLocaleString() || '0'
    const policyNo = aodData.policy_number || ''
    
    const ackText = `The Policy Owner owes an amount of MUR ${amount} representing the outstanding premium amount for the Insurance Policy No ${policyNo}.`
    const ackLines = pdf.splitTextToSize(ackText, this.contentWidth - 15)
    pdf.text(ackLines, this.margin + 8, yPos)
    yPos += ackLines.length * this.lineHeight + this.lineHeight + 2

    // 2. Undertaking and Payment Plan
    pdf.setFont('helvetica', 'bold')
    pdf.text('2.', this.margin, yPos)
    pdf.text('Undertaking and Payment Plan', this.margin + 8, yPos)
    yPos += this.lineHeight + 1

    pdf.setFont('helvetica', 'normal')
    const undertakingText = `The Policy Owner agrees to repay an amount of MUR ${amount} (the "Outstanding Amount") representing full and final satisfaction of all claims which NICL and/or its director(s) may have against him/her in the aforesaid matter.`
    const undertakingLines = pdf.splitTextToSize(undertakingText, this.contentWidth - 15)
    pdf.text(undertakingLines, this.margin + 8, yPos)
    yPos += undertakingLines.length * this.lineHeight + this.lineHeight + 2

    // 3. Repayment Plan
    pdf.setFont('helvetica', 'bold')
    pdf.text('3.', this.margin, yPos)
    pdf.text('Repayment Plan', this.margin + 8, yPos)
    yPos += this.lineHeight + 1

    pdf.setFont('helvetica', 'normal')
    pdf.text('The Debtor agrees to repay NICL under the following terms:', this.margin + 8, yPos)
    yPos += this.lineHeight + 2

    return yPos
  }

  addPaymentMethodSection(pdf, aodData, startY, installments) {
    let yPos = startY

    // Professional checkbox helper
    const addCheckbox = (x, y, checked = false) => {
      pdf.setDrawColor(0, 0, 0)
      pdf.setLineWidth(0.3)
      pdf.rect(x, y - 2, 4, 4)
      if (checked) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.text('✓', x + 0.5, y + 1.5)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
      }
    }

    // Payment method sections with better formatting
    if (aodData.payment_method === 'installments') {
      // Down Payment
      if (aodData.down_payment > 0) {
        addCheckbox(this.margin + 10, yPos, true)
        pdf.text(`Down-Payment of MUR ${(aodData.down_payment || 0).toLocaleString()}`, this.margin + 18, yPos)
        yPos += this.lineHeight + 1
      }

      addCheckbox(this.margin + 10, yPos, aodData.down_payment === 0)
      pdf.text('No Down-Payment', this.margin + 18, yPos)
      yPos += this.lineHeight + 2

      // Installment Details
      addCheckbox(this.margin + 10, yPos, true)
      const installmentText = `Repayment agreement over ${aodData.total_installments || 0} months for the period from ${aodData.start_date || '___________'} to ${aodData.end_date || '___________'} by installment amount of MUR ${(aodData.installment_amount || 0).toLocaleString()} arrangement.`
      
      const installmentLines = pdf.splitTextToSize(installmentText, this.contentWidth - 25)
      pdf.text(installmentLines, this.margin + 18, yPos)
      yPos += installmentLines.length * this.lineHeight + this.sectionSpacing

      // Add professional installment schedule
      if (installments && installments.length > 0) {
        yPos = this.addProfessionalInstallmentSchedule(pdf, installments, yPos)
      }

    } else if (aodData.payment_method === 'fund_deduction') {
      addCheckbox(this.margin + 10, yPos, false)
      pdf.text('Down-Payment of MUR ___________', this.margin + 18, yPos)
      yPos += this.lineHeight + 1

      addCheckbox(this.margin + 10, yPos, false)
      pdf.text('No Down-Payment', this.margin + 18, yPos)
      yPos += this.lineHeight + 2

      addCheckbox(this.margin + 10, yPos, true)
      const fundText = `Deduction from Fund Value for amount MUR ${(aodData.fund_deduction_amount || 0).toLocaleString()} from Policy No. ${aodData.fund_policy_number || ''}`
      const fundLines = pdf.splitTextToSize(fundText, this.contentWidth - 25)
      pdf.text(fundLines, this.margin + 18, yPos)
      yPos += fundLines.length * this.lineHeight + this.sectionSpacing

    } else if (aodData.payment_method === 'benefits_transfer') {
      addCheckbox(this.margin + 10, yPos, false)
      pdf.text('Down-Payment of MUR ___________', this.margin + 18, yPos)
      yPos += this.lineHeight + 1

      addCheckbox(this.margin + 10, yPos, false)
      pdf.text('No Down-Payment', this.margin + 18, yPos)
      yPos += this.lineHeight + 2

      addCheckbox(this.margin + 10, yPos, false)
      pdf.text('Reduction in Premium (A different form will have to be filled).', this.margin + 18, yPos)
      yPos += this.lineHeight + 1

      addCheckbox(this.margin + 10, yPos, true)
      const benefitsText = `Transfer of overpaid premiums from Policy No. ${aodData.source_policy_number || ''} to Policy No. ${aodData.target_policy_number || ''} (approval of payer is required if policy owner and payer differ)`
      const benefitsLines = pdf.splitTextToSize(benefitsText, this.contentWidth - 25)
      pdf.text(benefitsLines, this.margin + 18, yPos)
      yPos += benefitsLines.length * this.lineHeight + this.sectionSpacing
    }

    return yPos
  }

  addProfessionalInstallmentSchedule(pdf, installments, startY) {
    let yPos = startY + 3

    // Schedule title with better formatting - More compact
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setFillColor(240, 245, 255) // Light blue background
    pdf.roundedRect(this.margin + 10, yPos - 2, this.contentWidth - 20, 7, 2, 2, 'F')
    pdf.text('Payment Schedule:', this.margin + 12, yPos + 3)
    yPos += 8

    // Professional table with better alignment - More compact
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'bold')
    
    // Table headers with darker background
    pdf.setFillColor(220, 230, 240)
    pdf.rect(this.margin + 10, yPos, this.contentWidth - 20, 6, 'F')
    
    // Column headers with better positioning
    pdf.text('#', this.margin + 13, yPos + 4)
    pdf.text('Due Date', this.margin + 25, yPos + 4)
    pdf.text('Amount (MUR)', this.margin + 70, yPos + 4)
    pdf.text('Status', this.margin + 120, yPos + 4)
    pdf.text('QR', this.margin + 155, yPos + 4)
    yPos += 6

    // Table rows with better formatting - More compact
    pdf.setFont('helvetica', 'normal')
    const rowsToShow = installments.slice(0, 6)
    
    rowsToShow.forEach((installment, index) => {
      // Alternate row colors for better readability
      if (index % 2 === 0) {
        pdf.setFillColor(252, 252, 252)
        pdf.rect(this.margin + 10, yPos, this.contentWidth - 20, 5, 'F')
      }
      
      // Row data with better alignment
      pdf.text((index + 1).toString(), this.margin + 14, yPos + 3.5) // Left-align
      pdf.text(new Date(installment.due_date).toLocaleDateString(), this.margin + 25, yPos + 3.5) // Left-align
      
      // Right-align amount for better readability
      const amountText = installment.amount.toLocaleString()
      const amountWidth = pdf.getTextWidth(amountText)
      pdf.text(amountText, this.margin + 110 - amountWidth, yPos + 3.5)
      
      // Center-align status
      const statusText = installment.status
      const statusWidth = pdf.getTextWidth(statusText)
      pdf.text(statusText, this.margin + 137 - (statusWidth / 2), yPos + 3.5)
      
      // Center-align QR indicator
      pdf.text(installment.qr_code_url ? '✓' : '✗', this.margin + 157, yPos + 3.5)
      
      yPos += 5
    })

    // Table border with better styling
    pdf.setDrawColor(180, 180, 180)
    pdf.setLineWidth(0.3)
    pdf.rect(this.margin + 10, startY + 10, this.contentWidth - 20, (rowsToShow.length * 6) + 7)
    
    // Vertical lines for columns
    pdf.setDrawColor(220, 220, 220)
    pdf.setLineWidth(0.2)
    pdf.line(this.margin + 22, startY + 10, this.margin + 22, startY + 10 + (rowsToShow.length * 6) + 7) // After #
    pdf.line(this.margin + 65, startY + 10, this.margin + 65, startY + 10 + (rowsToShow.length * 6) + 7) // After Date
    pdf.line(this.margin + 115, startY + 10, this.margin + 115, startY + 10 + (rowsToShow.length * 6) + 7) // After Amount
    pdf.line(this.margin + 150, startY + 10, this.margin + 150, startY + 10 + (rowsToShow.length * 6) + 7) // After Status

    return yPos + 5
  }

  // This method is now replaced by addProfessionalInstallmentSchedule

  generatePage2(pdf, aodData, customer) {
    let yPos = this.margin + 10

    // Professional header for page 2
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 51, 102)
    pdf.text('ACKNOWLEDGMENT OF DEBT - Terms & Conditions', this.pageWidth / 2, yPos, { align: 'center' })
    pdf.setTextColor(0, 0, 0)
    yPos += this.sectionSpacing + 5

    // Legal clauses with professional formatting
    pdf.setFontSize(9)
    const clauses = [
      {
        number: '4.',
        text: 'Following the aforesaid undertaking and its due fulfillment, NICL expressly accepts that it shall not have any other claim of whatever nature to make against the Policy Owner pertaining to the aforesaid matter and NICL hereby waives and abandons such claims.'
      },
      {
        number: '5.',
        text: 'The Policy Owner acknowledges that in the event the said agreement is not respected and fulfilled in whatsoever way, NICL reserves the right to cancel the above mentioned Insurance policy.'
      },
      {
        number: '6.',
        text: 'Any premium arrears recovery from the policy fund value will lead to a reduction in the fund, impacting on future benefits pay-out.'
      },
      {
        number: '7.',
        text: 'On the full settlement of the total outstanding premiums, the policy may be reinstated in full force as per the original terms and conditions.'
      },
      {
        number: '8.',
        text: 'The Policy Owner further acknowledges having read and understood the contents of this document and has affixed his/her signature thereto.'
      }
    ]

    clauses.forEach((clause, index) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(clause.number, this.margin, yPos)
      pdf.setFont('helvetica', 'normal')
      
      const textLines = pdf.splitTextToSize(clause.text, this.contentWidth - 12)
      pdf.text(textLines, this.margin + 8, yPos)
      yPos += textLines.length * this.lineHeight + this.sectionSpacing
    })

    yPos += 10

    // Execution section with professional styling
    pdf.setFont('helvetica', 'normal')
    const executionText = `Made in two originals and executed at _________________ this ${new Date().toLocaleDateString()}`
    const executionLines = pdf.splitTextToSize(executionText, this.contentWidth)
    pdf.text(executionLines, this.margin, yPos)
    yPos += executionLines.length * this.lineHeight + this.sectionSpacing

    pdf.text('For and on behalf of National Insurance Co. Ltd', this.margin, yPos)
    yPos += this.sectionSpacing + 5

    // Professional signature boxes with better formatting
    // NICL signature section - Smaller box
    pdf.setDrawColor(0, 51, 102)
    pdf.setLineWidth(0.5)
    pdf.rect(this.margin, yPos, 85, 20)
    
    // "Sign here" indicator
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(100, 100, 100)
    pdf.text('Sign here ↓', this.margin + 2, yPos + 3)
    pdf.setTextColor(0, 0, 0)
    
    // Label below box
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('(Signature of Authorised Representative of NICL)', this.margin + 2, yPos + 25)
    
    // Date field next to signature
    pdf.setDrawColor(150, 150, 150)
    pdf.setLineWidth(0.3)
    pdf.rect(this.margin, yPos + 28, 85, 6)
    pdf.setFontSize(7)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Date: ___/___/______', this.margin + 2, yPos + 32)
    pdf.setTextColor(0, 0, 0)
    yPos += 40

    // Customer instruction with better formatting and space for writing
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setFillColor(255, 250, 205) // Light yellow background
    pdf.roundedRect(this.margin, yPos, this.contentWidth, 8, 2, 2, 'F')
    pdf.text('To write in own handwriting: "Read, understood and approved"', this.margin + 5, yPos + 5)
    pdf.setFont('helvetica', 'normal')
    yPos += 18  // More space for customer to write

    // Customer signature areas - side by side with smaller boxes
    pdf.setDrawColor(0, 51, 102)
    pdf.setLineWidth(0.5)
    pdf.rect(this.margin, yPos, 85, 20) // Policy Owner 1 - Smaller
    pdf.rect(this.margin + 95, yPos, 85, 20) // Policy Owner 2 - Smaller

    // "Sign here" indicators
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(100, 100, 100)
    pdf.text('Sign here ↓', this.margin + 2, yPos + 3)
    pdf.text('Sign here ↓', this.margin + 97, yPos + 3)
    pdf.setTextColor(0, 0, 0)

    // Labels below boxes
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('(Signature of Policy Owner 1)', this.margin + 2, yPos + 25)
    pdf.text('(Signature of Policy Owner 2)', this.margin + 97, yPos + 25)
    
    // Date fields
    pdf.setDrawColor(150, 150, 150)
    pdf.setLineWidth(0.3)
    pdf.rect(this.margin, yPos + 28, 85, 6)
    pdf.rect(this.margin + 95, yPos + 28, 85, 6)
    
    pdf.setFontSize(7)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Date: ___/___/______', this.margin + 2, yPos + 32)
    pdf.text('Date: ___/___/______', this.margin + 97, yPos + 32)
    pdf.setTextColor(0, 0, 0)
    yPos += 40

    // Mobile number fields - text only, no boxes
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Mobile Number: ___________________', this.margin, yPos)
    pdf.text('Mobile Number: ___________________', this.margin + 95, yPos)
    yPos += 10

    // Professional footer
    pdf.setDrawColor(0, 51, 102)
    pdf.setLineWidth(0.5)
    pdf.line(this.margin, this.pageHeight - 25, this.pageWidth - this.margin, this.pageHeight - 25)
    
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Document Name: Acknowledgment of Debt Agreement - NICL', this.margin, this.pageHeight - 18)
    pdf.text('Ref. & Version: PMA/POL/V1.0', this.margin, this.pageHeight - 12)
    pdf.text('Page 2 of 2', this.pageWidth - this.margin, this.pageHeight - 18, { align: 'right' })
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, this.pageWidth - this.margin, this.pageHeight - 12, { align: 'right' })
  }

  async downloadPdf(aodData, customer, installments = []) {
    const pdf = await this.generateAODPdf(aodData, customer, installments)
    const filename = `AOD_${aodData.policy_number}_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)
    return filename
  }

  async getPdfBlob(aodData, customer, installments = []) {
    const pdf = await this.generateAODPdf(aodData, customer, installments)
    return pdf.output('blob')
  }

  async getPdfDataUrl(aodData, customer, installments = []) {
    const pdf = await this.generateAODPdf(aodData, customer, installments)
    return pdf.output('dataurlstring')
  }
}

export const aodPdfService = new AODPdfService()