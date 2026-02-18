# Xano Background Task Setup Guide
## Customer Data Archiving Automation

**Date:** January 22, 2026  
**Purpose:** Set up automated daily archiving of customer records older than 60 days

---

## Prerequisites

✅ Manual endpoint `archive_old_customers` is working  
✅ Dry run test successful (shows correct count)  
✅ Small batch test successful (5-10 records archived)  
✅ Archive log table is recording operations  
✅ Backup table has correct schema

---

## Step-by-Step Setup

### Step 1: Access Background Tasks

1. Log into your Xano workspace
2. In the left sidebar, click **"Background Tasks"**
3. Click the **"+ Add Background Task"** button (top right)

---

### Step 2: Basic Configuration

**Task Name:**
```
Archive Old Customers
```

**Description:**
```
Automatically archives customer records older than 60 days to nic_cc_customer_backup table. Runs daily at 2:00 AM to maintain database performance.
```

**Status:**
- Leave as **"Active"** (or set to "Inactive" if you want to enable it later)

---

### Step 3: Schedule Configuration

**Schedule Type:** Recurring

**Frequency:** Daily

**Time:** 02:00 (2:00 AM)

**Timezone:** Select your timezone (e.g., Indian/Mauritius or UTC+4)

**Why 2:00 AM?**
- Minimal system usage
- No active users
- Completes before business hours
- Allows time for monitoring before staff arrives

---

### Step 4: Function Configuration

You have two options:

#### Option A: Call Your Existing Endpoint (RECOMMENDED)

1. In the Function Stack, add **"Make an API Request"**
2. Configure:
   - **Method:** POST
   - **URL:** `https://xbde-ekcn-8kg2.n7e.xano.io/api:dn7VaXmA/archive_old_customers`
   - **Headers:** 
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - **Body:**
     ```json
     {
       "dry_run": false,
       "batch_size": 1000
     }
     ```

3. Add a **"Return"** step to output the response

**Pros:**
- Reuses tested endpoint
- Easy to update
- Can test endpoint independently

---

#### Option B: Copy Function Stack (Alternative)

1. Open your `archive_old_customers` endpoint
2. Select all function steps (Ctrl+A or Cmd+A)
3. Copy (Ctrl+C or Cmd+C)
4. Go back to Background Task
5. Paste into the Function Stack
6. **IMPORTANT:** Modify the input parameters:
   - Find where `dry_run` is used
   - Change it to `false` (hardcoded)
   - Find where `batch_size` is used
   - Change it to `1000` (hardcoded)

**Pros:**
- Runs directly without API call
- Slightly faster execution

**Cons:**
- Need to maintain two copies of logic
- Updates require changing both places

---

### Step 5: Set Parameters (If Using Option A)

If you chose Option A (API Request), you can make parameters configurable:

1. Add **Input Variables** to the Background Task:
   - `batch_size` (integer, default: 1000)
   - `dry_run` (boolean, default: false)

2. Use these variables in the API request body:
   ```json
   {
     "dry_run": {{dry_run}},
     "batch_size": {{batch_size}}
   }
   ```

This allows you to adjust settings without editing the task.

---

### Step 6: Add Error Handling (Optional but Recommended)

Wrap your function in a Try-Catch block:

1. Add **"Try"** block
2. Put your API request or function stack inside
3. Add **"Catch"** block
4. In Catch, add:
   - Log error to console
   - Send notification email (if configured)
   - Return error details

**Example Catch Block:**
```
1. Set Variable: error_message = error.message
2. Log: "Archive task failed: " + error_message
3. Return: { "success": false, "error": error_message }
```

---

### Step 7: Save and Test

1. Click **"Save"** button (top right)
2. Click **"Run Now"** to test immediately
3. Check the execution log:
   - Should show success
   - Should display number of records archived
   - Check execution time

---

### Step 8: Verify Results

After running the task:

1. **Check Archive Log Table:**
   ```
   Go to Database > nic_cc_archive_log
   Look for latest entry with:
   - run_date = just now
   - records_archived = number of records moved
   - status = 'success'
   ```

2. **Check Backup Table:**
   ```
   Go to Database > nic_cc_customer_backup
   Verify records were added with:
   - archived_at = current timestamp
   - archived_by = 'system'
   - All original fields intact
   ```

3. **Check Main Table:**
   ```
   Go to Database > nic_cc_customer
   Verify old records were removed
   Count should be reduced by records_archived amount
   ```

---

## Monitoring Setup

### Daily Monitoring (First Week)

Check these every morning:

1. **Background Task Execution Log**
   - Go to Background Tasks > Archive Old Customers
   - Click "Execution History"
   - Verify last run was successful
   - Check execution time (should be < 5 seconds for 1000 records)

2. **Archive Log Table**
   ```sql
   SELECT * FROM nic_cc_archive_log 
   ORDER BY run_date DESC 
   LIMIT 7
   ```
   - Verify daily entries
   - Check records_archived count
   - Ensure status = 'success'
   - Monitor for any failed entries

3. **Table Sizes**
   - Main table: Should stay relatively constant
   - Backup table: Should grow daily
   - Calculate: backup_count / total_days = average daily archive rate

---

### Weekly Monitoring (Ongoing)

1. **Review Archive Statistics**
   ```sql
   SELECT 
     DATE(run_date) as date,
     SUM(records_archived) as total_archived,
     AVG(execution_time_ms) as avg_time_ms
   FROM nic_cc_archive_log
   WHERE run_date > DATE_SUB(NOW(), INTERVAL 7 DAY)
   GROUP BY DATE(run_date)
   ORDER BY date DESC
   ```

2. **Check for Anomalies**
   - Sudden spike in archived records
   - Execution time increasing
   - Failed runs
   - Zero records archived (might indicate issue)

---

## Troubleshooting

### Issue: Task Not Running

**Check:**
1. Task status is "Active"
2. Schedule is correct
3. Timezone is correct
4. No Xano service issues

**Fix:**
- Toggle task to Inactive, then back to Active
- Check Xano status page
- Verify workspace is not suspended

---

### Issue: Task Fails with Error

**Check Execution Log:**
1. Click on failed execution
2. Read error message
3. Common errors:
   - "Please use a numerically indexed array" → Fix loop in function
   - "Timeout" → Reduce batch_size
   - "Database error" → Check table permissions

**Fix:**
- Test endpoint manually first
- Fix the underlying issue
- Re-run task

---

### Issue: No Records Being Archived

**Possible Causes:**
1. No records older than 60 days
2. Cutoff date calculation wrong
3. Query filter incorrect

**Check:**
```sql
SELECT COUNT(*) 
FROM nic_cc_customer 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 60 DAY)
```

If count > 0 but nothing archived, check function logic.

---

### Issue: Performance Degradation

**Symptoms:**
- Task takes longer to run
- Database slow during execution
- Timeouts

**Solutions:**
1. Reduce `batch_size` from 1000 to 500
2. Run at different time (less load)
3. Add database indexes on `created_at` field
4. Split into multiple smaller tasks

---

## Adjusting Settings

### Change Schedule Time

1. Go to Background Tasks > Archive Old Customers
2. Click "Edit"
3. Change Time field
4. Save

### Change Batch Size

**If using Option A (API Request):**
1. Edit Background Task
2. Find API request body
3. Change `batch_size` value
4. Save

**If using Option B (Copied Function):**
1. Edit Background Task
2. Find where batch_size is set
3. Change the value
4. Save

### Temporarily Disable

1. Go to Background Tasks > Archive Old Customers
2. Toggle Status to "Inactive"
3. Task will not run until re-enabled

---

## Best Practices

### 1. Start Conservative

- First week: batch_size = 100
- Second week: batch_size = 500
- Third week: batch_size = 1000
- Monitor performance at each step

### 2. Keep Logs

- Don't delete archive log entries
- Use for trend analysis
- Helpful for troubleshooting

### 3. Regular Reviews

- Monthly: Review archive statistics
- Quarterly: Assess retention policy
- Yearly: Consider purging very old backups

### 4. Document Changes

- Keep notes on any adjustments
- Document why changes were made
- Track performance improvements

---

## Advanced Configuration

### Email Notifications on Failure

Add to Catch block:

1. Add **"Send Email"** function
2. Configure:
   - To: admin@yourcompany.com
   - Subject: "Archive Task Failed"
   - Body: Include error details

### Slack Notifications

1. Add Slack webhook integration
2. Send message on both success and failure
3. Include statistics in message

### Custom Retention Periods

Modify the cutoff date calculation:

**90 days instead of 60:**
```
cutoff_date = NOW() - INTERVAL 90 DAY
```

**Different retention by LOB:**
```
WHERE (
  (line_of_business = 'Life' AND created_at < NOW() - INTERVAL 90 DAY)
  OR
  (line_of_business = 'Motor' AND created_at < NOW() - INTERVAL 60 DAY)
)
```

---

## Rollback Procedure

If something goes wrong and you need to restore archived data:

### 1. Disable Background Task

Immediately set status to "Inactive"

### 2. Identify Affected Records

```sql
SELECT * FROM nic_cc_customer_backup
WHERE archived_at > 'YYYY-MM-DD HH:MM:SS'
```

### 3. Restore Records

```sql
-- Copy back to main table
INSERT INTO nic_cc_customer 
SELECT 
  id, name, email, mobile, policy_number, amount_due, 
  -- (all original fields, excluding archived_at, archived_by, archive_reason)
FROM nic_cc_customer_backup
WHERE archived_at > 'YYYY-MM-DD HH:MM:SS'
```

### 4. Clean Up Backup

```sql
DELETE FROM nic_cc_customer_backup
WHERE archived_at > 'YYYY-MM-DD HH:MM:SS'
```

### 5. Update Archive Log

```sql
UPDATE nic_cc_archive_log
SET status = 'rolled_back'
WHERE run_date > 'YYYY-MM-DD HH:MM:SS'
```

---

## Success Checklist

After setup, verify:

- [ ] Background Task is Active
- [ ] Schedule is set to Daily at 2:00 AM
- [ ] Test run completed successfully
- [ ] Archive log entry created
- [ ] Records moved to backup table
- [ ] Records removed from main table
- [ ] Execution time is acceptable (< 10 seconds)
- [ ] Monitoring plan in place
- [ ] Team notified of new automation
- [ ] Documentation updated

---

## Support

If you encounter issues:

1. Check Xano documentation: https://docs.xano.com
2. Review execution logs in Xano
3. Test endpoint manually
4. Check database table structures
5. Verify timezone settings

---

## Summary

You've now set up automated customer data archiving that will:

✅ Run daily at 2:00 AM  
✅ Archive records older than 60 days  
✅ Process up to 1000 records per run  
✅ Log all operations  
✅ Maintain data integrity  
✅ Improve database performance  

The system is now fully automated and requires minimal maintenance!

---

**Last Updated:** January 22, 2026  
**Status:** Ready for Production
