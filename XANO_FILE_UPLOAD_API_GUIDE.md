# Xano Custom File Upload API - Step-by-Step Guide

**Goal**: Create a custom API endpoint to upload signed AOD documents

**Estimated Time**: 5-10 minutes

---

## 📋 **Step 1: Open Your API Group**

1. **Login to Xano** dashboard
2. Click on **"API"** in the left sidebar
3. Find your API group (probably named something like `nic_cc_payment_plan` or your main API)
4. Click on it to open

---

## 📋 **Step 2: Create New Endpoint**

1. Click the **"+ Add API Endpoint"** button (usually at the top right)
2. You'll see a dialog to create a new endpoint

### **Fill in these details:**

```
Name: Upload Signed AOD Document
Method: POST
Path: /nic_cc_payment_plan/{nic_cc_payment_id}/upload_signed_document
```

**Important**: 
- The `{nic_cc_payment_id}` part is a **path parameter** (dynamic)
- Make sure to include the curly braces `{}`

3. Click **"Create"** or **"Add Endpoint"**

---

## 📋 **Step 3: Add Input Parameters**

You should now see the endpoint editor with sections like:
- **1. Inputs**
- **2. Function Stack**
- **3. Response**

### **Click on "1. Inputs" section**

You need to add 4 inputs:

---

### **Input 1: nic_cc_payment_id (Path Parameter)**

This should be **automatically created** because you used `{nic_cc_payment_id}` in the path.

If not, click **"+ Add Input"** and configure:
```
Name: nic_cc_payment_id
Type: integer
Source: path
Required: Yes
```

---

### **Input 2: signed_document (File Upload)**

Click **"+ Add Input"** and configure:

```
Name: signed_document
Type: file ← IMPORTANT: Select "file" type
Source: body
Required: Yes
Description: The signed AOD PDF document
```

**Note**: Make sure you select **"file"** as the type, not "text" or "attachment"

---

### **Input 3: signed_document_uploaded_by (Agent ID)**

Click **"+ Add Input"** and configure:

```
Name: signed_document_uploaded_by
Type: integer
Source: body
Required: Yes
Description: ID of the agent uploading the document
```

---

### **Input 4: signed_document_notes (Optional Notes)**

Click **"+ Add Input"** and configure:

```
Name: signed_document_notes
Type: text
Source: body
Required: No ← NOT required
Description: Optional notes about receiving the document
```

---

## 📋 **Step 4: Build the Function Stack**

Now click on **"2. Function Stack"** section.

This is where you define what the API does. You'll add functions by clicking **"+ Add Function"**.

---

### **Function 1: Edit Record (Update the Payment Plan)**

1. Click **"+ Add Function"**
2. Search for **"Edit Record"** or **"Database Request" > "Edit Record"**
3. Click on it to add

### **Configure the Edit Record function:**

```
Table: nic_cc_payment_plan
Record ID: {nic_cc_payment_id} ← Use the input variable
```

**How to set Record ID:**
- Click on the Record ID field
- You'll see a variable picker
- Select `nic_cc_payment_id` from the inputs

### **Fields to Update:**

Click **"+ Add Field"** for each field below:

**Field 1:**
```
Field Name: signed_document
Value: {signed_document} ← Select from inputs
```

**Field 2:**
```
Field Name: signed_document_uploaded_by
Value: {signed_document_uploaded_by} ← Select from inputs
```

**Field 3:**
```
Field Name: signed_document_uploaded_at
Value: now() ← Use the function picker, search for "now"
```

**Field 4:**
```
Field Name: signed_document_notes
Value: {signed_document_notes} ← Select from inputs
```

**Field 5:**
```
Field Name: signature_status
Value: "received" ← Type this as a text string
```

**Field 6:**
```
Field Name: signature_received_date
Value: now() ← Use the function picker
```

---

### **Function 2: Return Response**

1. Click **"+ Add Function"** again
2. Search for **"Response"** or **"Return"**
3. Select **"Response"**

### **Configure the Response:**

```
Status Code: 200
Body: {editrecord} ← Select the output from the previous Edit Record function
```

**How to set Body:**
- Click on the Body field
- You'll see outputs from previous functions
- Select the `editrecord` output (or whatever Xano named it)

---

## 📋 **Step 5: Save and Test**

1. Click **"Save"** button (usually top right)
2. The endpoint is now created!

---

## 📋 **Step 6: Get the API URL**

1. Look at the top of the endpoint editor
2. You should see the full URL, something like:

```
POST https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/nic_cc_payment_plan/{nic_cc_payment_id}/upload_signed_document
```

3. **Copy this URL** - you'll need to give it to me

---

## 📋 **Step 7: Test the Endpoint (Optional)**

Xano has a built-in test feature:

1. Click the **"Run"** button (top right, looks like a play button)
2. Fill in test values:
   ```
   nic_cc_payment_id: 41 (use your test AOD ID)
   signed_document: [Upload a test PDF]
   signed_document_uploaded_by: 24 (your agent ID)
   signed_document_notes: "Test upload"
   ```
3. Click **"Run"**
4. Check if it returns success (200) and the updated record

---

## ✅ **Verification Checklist**

Before you finish, verify:

- [ ] Endpoint method is **POST**
- [ ] Path includes `{nic_cc_payment_id}`
- [ ] Input `signed_document` type is **file**
- [ ] Edit Record function updates all 6 fields
- [ ] Response returns the updated record
- [ ] Endpoint is saved

---

## 🎯 **What to Do Next**

Once you've created the endpoint:

1. **Copy the full API URL**
2. **Share it with me** (it will look like the example in Step 6)
3. I'll update the frontend code to use this new endpoint
4. We'll test the file upload!

---

## 🆘 **Troubleshooting**

### **Can't find "file" type for input?**
- Make sure you're in the Inputs section
- Click "+ Add Input"
- Look for "file" in the Type dropdown
- If not there, try "attachment" or contact Xano support

### **Edit Record function not showing fields?**
- Make sure you selected the correct table
- Make sure you set the Record ID
- Click "+ Add Field" to add each field manually

### **Can't find "now()" function?**
- Click on the value field
- Look for a function icon (fx)
- Search for "now" or "timestamp"
- Select "now()"

---

## 📸 **Visual Guide Summary**

```
Step 1: API Sidebar → Your API Group
Step 2: + Add API Endpoint → Fill details → Create
Step 3: Inputs Section → Add 4 inputs (1 path, 3 body)
Step 4: Function Stack → Add "Edit Record" → Configure fields
Step 5: Add "Response" → Return editrecord output
Step 6: Save → Copy URL
Step 7: Test (optional)
```

---

## 🎉 **You're Done!**

Once you complete these steps, share the API URL with me and I'll update the code!

---

**Need Help?** Let me know which step you're stuck on and I'll provide more detailed guidance! 🚀
