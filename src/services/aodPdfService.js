import jsPDF from 'jspdf'

class AODPdfService {
  constructor() {
    this.pageWidth = 210 // A4 width in mm
    this.pageHeight = 297 // A4 height in mm
    this.margin = 15
    this.contentWidth = this.pageWidth - (this.margin * 2)
    this.lineHeight = 5
    this.sectionSpacing = 8
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

    // Professional Header with NIC Logo
    this.addHeader(pdf, yPos)
    yPos += 40

    // Title Section
    yPos = this.addTitle(pdf, yPos)
    yPos += this.sectionSpacing

    // Parties Section
    yPos = this.addPartiesSection(pdf, customer, yPos)
    yPos += this.sectionSpacing

    // Agreement Sections
    yPos = this.addAgreementSections(pdf, aodData, yPos)
    yPos += this.sectionSpacing

    // Payment Method Section
    this.addPaymentMethodSection(pdf, aodData, yPos, installments)
  }

  addHeader(pdf, yPos) {
    // NIC Logo and Company Info
    pdf.setFontSize(28)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 51, 102) // Dark blue
    pdf.text('NIC', this.pageWidth / 2, yPos + 10, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    pdf.text('NATIONAL INSURANCE COMPANY', this.pageWidth / 2, yPos + 18, { align: 'center' })
    
    pdf.setFontSize(10)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Life & Pensions', this.pageWidth / 2, yPos + 25, { align: 'center' })
    
    // Decorative line
    pdf.setDrawColor(0, 51, 102)
    pdf.setLineWidth(0.5)
    pdf.line(this.margin + 30, yPos + 30, this.pageWidth - this.margin - 30, yPos + 30)
  }

  addTitle(pdf, yPos) {
    // Professional title with background
    pdf.setFillColor(0, 51, 102) // Dark blue background
    pdf.roundedRect(this.margin, yPos, this.contentWidth, 12, 2, 2, 'F')
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255) // White text
    pdf.text('ACKNOWLEDGMENT OF DEBT', this.pageWidth / 2, yPos + 8, { align: 'center' })
    
    pdf.setTextColor(0, 0, 0) // Reset to black
    return yPos + 20
  }

  addPartiesSection(pdf, customer, yPos) {
    // Between section
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Between', this.margin, yPos)
    yPos += this.sectionSpacing

    // NICL Details with proper text wrapping
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    const niclText = 'National Insurance Co. Ltd, a company incorporated under the laws of the Republic of Mauritius with business registration number C15123641 and having its registered office at NIC Centre, 217 Royal Road, Curepipe, duly authorised for the present purpose by its directors.'
    
    const niclLines = pdf.splitTextToSize(niclText, this.contentWidth - 10)
    pdf.text(niclLines, this.margin + 5, yPos)
    yPos += niclLines.length * this.lineHeight + 3

    pdf.setFont('helvetica', 'italic')
    pdf.text('(Hereinafter referred to as "NICL")', this.pageWidth - this.margin - 5, yPos, { align: 'right' })
    yPos += this.lineHeight + 2

    pdf.setFont('helvetica', 'bold')
    pdf.text('ON THE ONE HAND', this.pageWidth - this.margin - 5, yPos, { align: 'right' })
    yPos += this.sectionSpacing + 3

    // Customer Details Section
    pdf.setFont('helvetica', 'bold')
    pdf.text('And', this.margin, yPos)
    yPos += this.sectionSpacing

    // Customer info with professional styling
    pdf.setFont('helvetica', 'normal')
    
    // First line - Name and ID Card
    const line1 = `Mr/Mrs/Ms ${customer.name || '_'.repeat(30)} holder of National Identity Card`
    const line1Parts = pdf.splitTextToSize(line1, this.contentWidth - 10)
    pdf.text(line1Parts, this.margin + 5, yPos)
    yPos += line1Parts.length * this.lineHeight

    // Second line - NIC and Address
    const customerNic = customer.nic || '_'.repeat(15)
    const customerAddress = customer.address || '_'.repeat(40)
    const line2 = `No. ${customerNic}, residing at ${customerAddress}`
    const line2Parts = pdf.splitTextToSize(line2, this.contentWidth - 10)
    pdf.text(line2Parts, this.margin + 5, yPos)
    yPos += line2Parts.length * this.lineHeight + 3

    // Second policy owner (optional)
    pdf.text('and Mr/Mrs/Ms _________________________ holder of National Identity', this.margin + 5, yPos)
    yPos += this.lineHeight
    pdf.text('Card No. ________________, residing at _________________________________', this.margin + 5, yPos)
    yPos += this.sectionSpacing + 3

    // Policy Owner reference
    pdf.setFont('helvetica', 'italic')
    pdf.text('(Hereinafter referred to as the "Policy Owner")', this.pageWidth / 2, yPos, { align: 'center' })
    yPos += this.lineHeight + 2
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('ON THE OTHER HAND', this.pageWidth / 2, yPos, { align: 'center' })
    yPos += this.lineHeight + 2
    
    pdf.setFont('helvetica', 'italic')
    const partiesText = '(Hereinafter collectively referred to as the "Parties" and individually referred to as the "Party")'
    const partiesLines = pdf.splitTextToSize(partiesText, this.contentWidth - 20)
    pdf.text(partiesLines, this.pageWidth / 2, yPos, { align: 'center' })
    yPos += partiesLines.length * this.lineHeight

    return yPos
  }

  addAgreementSections(pdf, aodData, yPos) {
    // Agreement intro
    pdf.setFont('helvetica', 'normal')
    pdf.text('The Parties have reached an agreement with respect to the following:', this.margin, yPos)
    yPos += this.sectionSpacing + 3

    // 1. Acknowledgment
    pdf.setFont('helvetica', 'bold')
    pdf.text('1.', this.margin, yPos)
    pdf.text('Acknowledgment', this.margin + 8, yPos)
    yPos += this.lineHeight + 2

    pdf.setFont('helvetica', 'normal')
    const amount = aodData.outstanding_amount?.toLocaleString() || '0'
    const policyNo = aodData.policy_number || ''
    
    const ackText = `The Policy Owner owes an amount of MUR ${amount} representing the outstanding premium amount for the Insurance Policy No ${policyNo}.`
    const ackLines = pdf.splitTextToSize(ackText, this.contentWidth - 15)
    pdf.text(ackLines, this.margin + 8, yPos)
    yPos += ackLines.length * this.lineHeight + this.sectionSpacing

    // 2. Undertaking and Payment Plan
    pdf.setFont('helvetica', 'bold')
    pdf.text('2.', this.margin, yPos)
    pdf.text('Undertaking and Payment Plan', this.margin + 8, yPos)
    yPos += this.lineHeight + 2

    pdf.setFont('helvetica', 'normal')
    const undertakingText = `The Policy Owner agrees to repay an amount of MUR ${amount} (the "Outstanding Amount") representing full and final satisfaction of all claims which NICL and/or its director(s) may have against him/her in the aforesaid matter.`
    const undertakingLines = pdf.splitTextToSize(undertakingText, this.contentWidth - 15)
    pdf.text(undertakingLines, this.margin + 8, yPos)
    yPos += undertakingLines.length * this.lineHeight + this.sectionSpacing

    // 3. Repayment Plan
    pdf.setFont('helvetica', 'bold')
    pdf.text('3.', this.margin, yPos)
    pdf.text('Repayment Plan', this.margin + 8, yPos)
    yPos += this.lineHeight + 2

    pdf.setFont('helvetica', 'normal')
    pdf.text('The Debtor agrees to repay NICL under the following terms (please tick as appropriate):', this.margin + 8, yPos)
    yPos += this.lineHeight + 3

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
      const installmentText = `Repayment agreement over ${aodData.total_installments || 0} months (max 6 months) for the period from ${aodData.start_date || '___________'} to ${aodData.end_date || '___________'} by installment amount of MUR ${(aodData.installment_amount || 0).toLocaleString()} arrangement.`
      
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
    let yPos = startY + 5

    // Schedule title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text('Payment Schedule:', this.margin + 10, yPos)
    yPos += this.lineHeight + 2

    // Professional table
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    
    // Table headers with background
    pdf.setFillColor(240, 240, 240)
    pdf.rect(this.margin + 10, yPos - 2, this.contentWidth - 20, 6, 'F')
    
    pdf.text('#', this.margin + 12, yPos + 2)
    pdf.text('Due Date', this.margin + 25, yPos + 2)
    pdf.text('Amount (MUR)', this.margin + 60, yPos + 2)
    pdf.text('Status', this.margin + 100, yPos + 2)
    pdf.text('QR', this.margin + 130, yPos + 2)
    yPos += 8

    // Table rows
    pdf.setFont('helvetica', 'normal')
    installments.slice(0, 6).forEach((installment, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250)
        pdf.rect(this.margin + 10, yPos - 2, this.contentWidth - 20, 5, 'F')
      }
      
      pdf.text((index + 1).toString(), this.margin + 12, yPos + 1)
      pdf.text(new Date(installment.due_date).toLocaleDateString(), this.margin + 25, yPos + 1)
      pdf.text(installment.amount.toLocaleString(), this.margin + 60, yPos + 1)
      pdf.text(installment.status, this.margin + 100, yPos + 1)
      pdf.text(installment.qr_code_url ? '✓' : '✗', this.margin + 132, yPos + 1)
      yPos += 5
    })

    // Table border
    pdf.setDrawColor(200, 200, 200)
    pdf.setLineWidth(0.2)
    pdf.rect(this.margin + 10, startY + 8, this.contentWidth - 20, (installments.length * 5) + 6)

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

    // Professional signature boxes
    // NICL signature
    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.3)
    pdf.rect(this.margin, yPos, 85, 25)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('(Signature of Authorised Representative of NICL)', this.margin + 2, yPos + 30)
    yPos += 40

    // Customer instruction
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text('To write in own handwriting "Read, understood and approved".', this.margin, yPos)
    yPos += this.sectionSpacing + 5

    // Customer signature areas - side by side
    pdf.setDrawColor(0, 0, 0)
    pdf.rect(this.margin, yPos, 85, 25) // Policy Owner 1
    pdf.rect(this.margin + 95, yPos, 85, 25) // Policy Owner 2

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('(Signature of Policy Owner 1)', this.margin + 2, yPos + 30)
    pdf.text('(Signature of Policy Owner 2)', this.margin + 97, yPos + 30)
    yPos += 40

    // Mobile number fields
    pdf.setDrawColor(150, 150, 150)
    pdf.rect(this.margin, yPos, 85, 8)
    pdf.rect(this.margin + 95, yPos, 85, 8)
    
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Mobile Number', this.margin + 25, yPos + 5)
    pdf.text('Mobile Number', this.margin + 120, yPos + 5)
    pdf.setTextColor(0, 0, 0)
    yPos += 20

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