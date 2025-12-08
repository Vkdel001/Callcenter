# CSL Upload Issues & Fixes

## 🐛 **Issues Identified:**

### 1. **Xano Field Error: "Unable to locate input: next_cash_back_date"**
**Problem:** Xano expects exact field names, but some fields might be optional or have different names in Xano.

**Solution:** 
- Remove fields that are null/undefined before sending to Xano
- Use optional chaining for all date fields
- Only send fields that have values

### 2. **Only 211 Records Parsed from 2000**
**Problem:** CSV parsing uses simple `split(',')` which breaks when data contains commas (like addresses, amounts with commas "2,000")

**Solution:**
- Use proper CSV parsing library (Papa Parse) OR
- Implement RFC 4180 compliant CSV parser that handles:
  - Quoted fields with commas
  - Multi-line fields
  - Escaped quotes

### 3. **Slow Upload Speed**
**Problem:** 
- Current batch size: 10 records per batch
- Delay between batches: 500ms
- For 2000 records: 200 batches × 500ms = 100 seconds minimum

**Solution:**
- Increase batch size to 50 records
- Reduce delay to 100ms
- Use Promise.all() for parallel processing within batch
- Remove unnecessary delays

---

## 🔧 **Recommended Fixes:**

### **Option A: Use Papa Parse Library (Recommended)**

**Pros:**
- Industry standard CSV parser
- Handles all edge cases
- Fast and reliable
- Easy to implement

**Cons:**
- Adds dependency (~50KB)

**Implementation:**
```bash
npm install papaparse
```

```javascript
import Papa from 'papaparse'

const parseCSV = (csvText) => {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  })
  return result.data
}
```

### **Option B: Custom RFC 4180 Parser (No Dependencies)**

**Pros:**
- No external dependencies
- Full control

**Cons:**
- More complex code
- Need to handle edge cases

---

## 📊 **Performance Improvements:**

### **Current Settings:**
```javascript
BATCH_SIZE = 10
BATCH_DELAY = 500ms
Time for 2000 records = ~100 seconds
```

### **Optimized Settings:**
```javascript
BATCH_SIZE = 50
BATCH_DELAY = 100ms
Time for 2000 records = ~4-5 seconds
```

---

## 🎯 **Xano Field Mapping Fix:**

### **Problem:**
Sending fields with null/undefined values causes Xano errors.

### **Solution:**
```javascript
const cleanPayload = (payload) => {
  const cleaned = {}
  Object.keys(payload).forEach(key => {
    if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
      cleaned[key] = payload[key]
    }
  })
  return cleaned
}

// Before sending to Xano:
const payload = mapCSVToPolicy(policy)
const cleanedPayload = cleanPayload(payload)
await cslPolicyService.upsertPolicy(cleanedPayload)
```

---

## 🚀 **Quick Fix (Without Code Changes):**

### **For Issue #1 (Xano Error):**
- Check Xano table schema
- Make sure all date fields are optional (not required)
- Or provide default values for missing dates

### **For Issue #2 (CSV Parsing):**
- **Temporary workaround:** Export CSV with different delimiter (pipe | or tab)
- Or ensure no commas in data fields
- Or wrap all fields in quotes

### **For Issue #3 (Speed):**
- Upload smaller batches (500 records at a time)
- Or wait for code optimization

---

## ✅ **Recommended Action:**

**I recommend Option A (Papa Parse) because:**
1. Solves CSV parsing issue completely
2. Industry standard solution
3. Easy to implement
4. Minimal code changes

**Would you like me to:**
1. ✅ Install Papa Parse and update the upload component?
2. ✅ Optimize batch processing for speed?
3. ✅ Add payload cleaning to prevent Xano errors?

**All three fixes can be done in ~5 minutes.**

---

## 📝 **Alternative: Manual Xano Check**

If you want to avoid code changes for now:

1. **Check Xano Schema:**
   - Go to Xano → csl_policies table
   - Check if `next_cash_back_date` field exists
   - Make sure it's optional (not required)

2. **Test with Small File:**
   - Create CSV with just 10 records
   - Test upload
   - Check which fields cause errors

3. **Adjust CSV:**
   - Remove problematic columns
   - Or fill in missing values

---

**Let me know if you want me to implement the fixes!** 🚀
