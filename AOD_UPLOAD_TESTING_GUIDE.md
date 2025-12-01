# AOD Signed Document Upload - Quick Testing Guide

**Feature**: Mark AOD as Received with Document Upload  
**Date**: November 30, 2025

---

## 🚀 Quick Start Testing

### **Prerequisites**:
1. ✅ Database fields added to `nic_cc_payment_plan`
2. ✅ Foreign key relationship set up
3. ✅ Code deployed to test environment
4. ✅ Test customer with AOD in `pending_signature` status

---

## 📋 5-Minute Test Scenario

### **Step 1: Find Test AOD** (30 seconds)
```
1. Login as agent
2. Go to Customers page
3. Select any customer with an AOD
4. Scroll to "AOD History" section
5. Find AOD with status "pending_signature"
```

**Expected**: See green "✅ Mark Received" button

---

### **Step 2: Open Upload Modal** (15 seconds)
```
1. Click "✅ Mark Received" button
```

**Expected**:
- ✅ Modal opens
- ✅ AOD details displayed (ID, customer, amount, method)
- ✅ File upload area visible
- ✅ Notes field present
- ✅ Warning box shows consequences

---

### **Step 3: Upload PDF** (1 minute)
```
1. Prepare a test PDF file (< 5MB)
2. Either:
   - Click "Choose a file" and select PDF
   - OR drag & drop PDF into upload area
```

**Expected**:
- ✅ File name displays
- ✅ File size shows (in KB)
- ✅ Green checkmark appears
- ✅ "Remove file" button visible

---

### **Step 4: Add Notes (Optional)** (15 seconds)
```
1. Type in notes field: "Test upload - received from customer"
```

**Expected**:
- ✅ Text appears in notes field
- ✅ No character limit issues

---

### **Step 5: Submit Upload** (30 seconds)
```
1. Click "Mark as Received" button
```

**Expected**:
- ✅ Button shows "Uploading..." with spinner
- ✅ After 2-5 seconds, success alert appears
- ✅ Modal closes automatically
- ✅ AOD history refreshes

---

### **Step 6: Verify Upload** (1 minute)
```
1. Look at the same AOD in history
```

**Expected**:
- ✅ Signature status changed to "received"
- ✅ New line appears: "📎 Signed copy: View Document (Uploaded [date])"
- ✅ "✅ Mark Received" button is gone
- ✅ Click "View Document" link
- ✅ PDF opens in new tab

---

## ❌ Error Testing (2 minutes)

### **Test 1: Invalid File Type**
```
1. Click "✅ Mark Received"
2. Try uploading .jpg or .docx file
```
**Expected**: Error message "Only PDF files are allowed"

---

### **Test 2: File Too Large**
```
1. Click "✅ Mark Received"
2. Try uploading PDF > 5MB
```
**Expected**: Error message "File size must be less than 5MB"

---

### **Test 3: No File Selected**
```
1. Click "✅ Mark Received"
2. Don't select any file
3. Click "Mark as Received" button
```
**Expected**: Error message "Please select a PDF file to upload"

---

### **Test 4: Cancel Upload**
```
1. Click "✅ Mark Received"
2. Select a file
3. Click "Cancel" button
```
**Expected**: Modal closes, no changes made

---

## 🔍 Database Verification (1 minute)

### **Check Xano Database**:
```
1. Open Xano dashboard
2. Go to nic_cc_payment_plan table
3. Find the test AOD record
4. Verify these fields are populated:
   - signed_document (has file)
   - signed_document_uploaded_at (has timestamp)
   - signed_document_uploaded_by (has your agent ID)
   - signed_document_notes (has your notes)
   - signature_status = "received"
   - signature_received_date (has timestamp)
```

---

## ✅ Success Checklist

After testing, verify:

- [ ] Button appears for pending_signature AODs
- [ ] Button does NOT appear for received AODs
- [ ] Modal opens correctly
- [ ] File upload works (drag & drop)
- [ ] File upload works (file picker)
- [ ] PDF validation works
- [ ] Size validation works (5MB limit)
- [ ] Notes field works
- [ ] Upload completes successfully
- [ ] Success message appears
- [ ] Modal closes after upload
- [ ] Signature status updates to "received"
- [ ] "View Document" link appears
- [ ] Clicking link opens PDF
- [ ] Database fields populated correctly
- [ ] Agent ID recorded correctly
- [ ] Timestamp recorded correctly

---

## 🐛 Common Issues & Solutions

### **Issue 1: Button Not Showing**
**Cause**: AOD status is not "pending_signature"  
**Solution**: Check signature_status field in database

---

### **Issue 2: Upload Fails**
**Cause**: File too large or wrong type  
**Solution**: Use PDF < 5MB

---

### **Issue 3: Modal Doesn't Open**
**Cause**: JavaScript error  
**Solution**: Check browser console for errors

---

### **Issue 4: "View Document" Link Broken**
**Cause**: File not uploaded properly  
**Solution**: Check Xano file storage settings

---

### **Issue 5: Agent ID Not Recorded**
**Cause**: User not logged in or ID missing  
**Solution**: Verify user.id is available in context

---

## 📱 Mobile Testing (Optional)

### **Test on Mobile Device**:
```
1. Open app on mobile browser
2. Navigate to customer with AOD
3. Click "✅ Mark Received"
4. Test file upload from mobile
5. Verify modal is responsive
```

**Expected**:
- ✅ Modal fits screen
- ✅ Buttons are tappable
- ✅ File picker opens mobile file browser
- ✅ Upload works on mobile

---

## 🎯 Performance Testing (Optional)

### **Test Upload Speed**:
```
1. Upload 100KB PDF - should take < 2 seconds
2. Upload 1MB PDF - should take < 5 seconds
3. Upload 5MB PDF - should take < 10 seconds
```

---

## 📊 Test Results Template

```
Test Date: _______________
Tester: _______________
Environment: [ ] Dev [ ] Staging [ ] Production

Basic Functionality:
[ ] PASS / [ ] FAIL - Button visibility
[ ] PASS / [ ] FAIL - Modal opening
[ ] PASS / [ ] FAIL - File upload
[ ] PASS / [ ] FAIL - Status update
[ ] PASS / [ ] FAIL - Document viewing

Validation:
[ ] PASS / [ ] FAIL - PDF type validation
[ ] PASS / [ ] FAIL - File size validation
[ ] PASS / [ ] FAIL - Required file validation

Database:
[ ] PASS / [ ] FAIL - File stored
[ ] PASS / [ ] FAIL - Timestamp recorded
[ ] PASS / [ ] FAIL - Agent ID recorded
[ ] PASS / [ ] FAIL - Notes saved

Issues Found:
_________________________________
_________________________________
_________________________________

Overall Status: [ ] PASS [ ] FAIL
```

---

## 🚀 Ready to Test!

**Estimated Testing Time**: 10-15 minutes  
**Recommended**: Test in development environment first

---

**Good luck with testing!** 🎉
