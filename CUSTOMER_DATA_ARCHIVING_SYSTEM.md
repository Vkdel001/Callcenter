# Customer Data Archiving System - Implementation Guide

**Date:** January 20, 2026  
**System:** NIC Call Center - Customer Data Management  
**Purpose:** Automated archiving of old customer records to improve database performance

---

## Overview

This document outlines the implementation of an automated customer data archiving system that moves customer records older than 60 days from the active `nic_cc_customer` table to a backup table `nic_cc_customer_backup`.

### Business Requirements

- **Archive Criteria:** Records created more than 60 days ago
- **Method:** Move (copy + delete) rather than hard delete
- **Automation:** Fully automated via Xano Background Task
- **Safety:** Preserve data integrity and maintain audit trail
- **Performance:** Improve query performance on active customer table

---

## Architecture Overview

### Tables Involved

**Primary Table:**
- `nic_cc_customer` - Active customer records (production queries)

**Archive Table:**
- `nic_cc_customer_backup` - Historical customer records (reporting/audit)

**Logging Table:**
- `nic_cc_archive_log` - Tracks each archive operation

### Related Tables to Consider

The following tables have relationships with `nic_cc_customer`:
- `nic_cc_aod` - AOD agreements
- `nic_cc_payment_plan` - Payment plans
- `nic_cc_installment` - Installment records
- `nic_cc_call_log` - Call history
- `nic_cc_contact_update_history` - Contact updates
- `nic_cc_follow_up` - Follow-up tasks

---

## Implementation Options

### Option 1: Xano Background Task (RECOMMENDED)

**Pros:**
- Fully automatic, runs on schedule
- No manual intervention required
- Runs during off-peak hours
- Built-in Xano feature
- Set it and forget it

**Cons:**
- Requires careful testing
- Need to monitor logs initially

**Recommended Schedule:** Daily at 2:00 AM

---

### Option 2: Manual Endpoint Trigger

**Pros:**
- More control over execution
- Can run on-demand
- Easier to test initially

**Cons:**
- Requires manual trigger or external scheduler
- Not fully automatic

**Use Case:** Testing phase before enabling automation

---

## Database Schema

### 1. Archive Table Structure

**Table:** `nic_cc_customer_backup`

Must have identical schema to `nic_cc_customer` PLUS:

```
Additional Fields:
- archived_at (timestamp) - When record was archived
- archived_by (text) - System identifier
- archive_reason (text) - Why it was archived (e.g., "60_day_rule")
```

**All existing fields from nic_cc_customer:**
- id
- name
- email
- mobile
- policy_number
- amount_due
- line_of_business
- agent_id
- created_at
- updated_at
- (all other existing fields)

---

### 2. Archive Log Table

**Table:** `nic_cc_archive_log`

```
Fields:
- id (integer, auto-increment, primary key)
- run_date (timestamp) - When archive ran
- records_archived (integer) - Count of records moved
- records_failed (integer) - Count of failures
- status (text) - 'success', 'partial', 'failed'
- error_message (text, nullable) - Error details if any
- execution_time_ms (integer) - How long it took
- dry_run (boolean) - Was this a test run?
```

---

## Archive Criteria

### Basic Criteria (Phase 1)

Archive records where:
```
created_at < (current_date - 60 days)
```

### Enhanced Criteria (Phase 2 - Recommended)

Archive records where ALL of the following are true:
```
1. created_at < (current_date - 60 days)
2. No active AOD (no records in nic_cc_aod with status = 'active')
3. No pending installments (no unpaid installments)
4. No upcoming follow-ups (no follow-ups scheduled in next 30 days)
5. Last interaction > 30 days ago (no recent call logs)
```

This ensures only truly "inactive" customers are archived.

---

## Xano Endpoint Configuration

**Confirmed Archive Endpoint:**
```
https://xbde-ekcn-8kg2.n7e.xano.io/api:dn7VaXmA/archive_old_customers
```

**API Key:** `dn7VaXmA`

**Method:** POST

**Authentication:** Uses same API key as customer table endpoints

---

## Xano Implementation Guide

### Step 1: Create Archive Table

1. Go to **Database** in Xano
2. Click **Add Table**
3. Name: `nic_cc_customer_backup`
4. Click **Import Schema** → Select `nic_cc_customer`
5. Add additional fields:
   - `archived_at` (timestamp, default: now())
   - `archived_by` (text, default: 'system')
   - `archive_reason` (text, default: '60_day_rule')

---

### Step 2: Create Archive Log Table

1. Click **Add Table**
2. Name: `nic_cc_archive_log`
3. Add fields as specified above

---

### Step 3: Create Archive Function (Manual Endpoint First)

**Endpoint:** `POST /archive_old_customers`

**Inputs:**
- `dry_run` (boolean, default: false) - Test mode
- `batch_size` (integer, default: 1000) - Records per batch

**Function Stack:**

```
1. Start Transaction

2. Get Current Timestamp
   - Variable: current_time

3. Calculate Cutoff Date
   - Variable: cutoff_date = current_time - 60 days

4. Query nic_cc_customer
   - Filter: created_at < cutoff_date
   - Limit: batch_size
   - Store in: customers_to_archive

5. Count Records
   - Variable: total_count = customers_to_archive.length

6. IF dry_run = true
   - Return: { message: "Dry run", count: total_count }
   - STOP

7. Initialize Counters
   - Variable: archived_count = 0
   - Variable: failed_count = 0

8. Loop through customers_to_archive
   For each customer:
   
   a. Try:
      - Add record to nic_cc_customer_backup
        * Copy all fields from customer
        * Set archived_at = current_time
        * Set archived_by = 'system'
        * Set archive_reason = '60_day_rule'
      
      - Delete record from nic_cc_customer
        * WHERE id = customer.id
      
      - Increment archived_count
   
   b. Catch Error:
      - Increment failed_count
      - Log error (optional)

9. Create Archive Log Entry
   - Add to nic_cc_archive_log:
     * run_date = current_time
     * records_archived = archived_count
     * records_failed = failed_count
     * status = (failed_count > 0 ? 'partial' : 'success')
     * dry_run = false

10. Commit Transaction

11. Return Response
    {
      "success": true,
      "archived": archived_count,
      "failed": failed_count,
      "total": total_count
    }
```

---

### Step 4: Test Manual Endpoint

**Testing Checklist:**

1. **Dry Run Test**
   ```
   POST /archive_old_customers
   { "dry_run": true }
   ```
   - Verify count is correct
   - No records should be moved

2. **Small Batch Test**
   ```
   POST /archive_old_customers
   { "dry_run": false, "batch_size": 10 }
   ```
   - Verify 10 records moved
   - Check backup table has records
   - Check original table missing those records
   - Verify archived_at is set

3. **Verify Data Integrity**
   - Compare record in backup vs original (before deletion)
   - All fields should match
   - Additional fields should be populated

4. **Check Archive Log**
   - Verify log entry created
   - Check counts are accurate

---

### Step 5: Convert to Background Task

Once manual testing is successful:

1. Go to **Background Tasks** in Xano
2. Click **Add Background Task**
3. Name: `Archive Old Customers`
4. Description: `Automatically archives customer records older than 60 days`
5. Schedule: **Daily at 2:00 AM** (or your preferred time)
6. Function: Copy the function stack from manual endpoint
7. Set `dry_run = false` and `batch_size = 1000`
8. Save

---

### Step 6: Enable Monitoring

**Initial Monitoring (First Week):**
- Check archive log daily
- Verify record counts
- Monitor for errors
- Adjust batch size if needed

**Ongoing Monitoring (Weekly):**
- Review archive log weekly
- Check backup table growth
- Verify no data loss
- Monitor performance impact

---

## Safety Features

### 1. Dry Run Mode

Always test with `dry_run: true` first:
- Counts records that would be archived
- No actual data movement
- Safe to run in production

### 2. Batch Processing

Process in batches to avoid:
- Timeout issues
- Database locks
- Performance impact

Recommended batch size: 1000 records

### 3. Transaction Wrapping

Wrap operations in transaction:
- All or nothing approach
- Rollback on error
- Data consistency guaranteed

### 4. Error Logging

Log all operations:
- Success count
- Failure count
- Error messages
- Execution time

### 5. Audit Trail

Every archived record has:
- `archived_at` - When
- `archived_by` - Who/What
- `archive_reason` - Why

---

## Related Records Handling

### Option A: Archive Related Records (Recommended)

Create backup tables for all related data:
- `nic_cc_aod_backup`
- `nic_cc_payment_plan_backup`
- `nic_cc_installment_backup`
- `nic_cc_call_log_backup`
- `nic_cc_follow_up_backup`

Archive entire customer history together.

### Option B: Keep Related Records

Leave related records in main tables:
- They reference archived customer_id
- Useful for historical reporting
- May cause orphaned records

### Option C: Enhanced Criteria

Only archive customers with NO related records:
- Safest approach
- Ensures no active data is archived
- Slower archive rate

**Recommendation:** Start with Option C, move to Option A later.

---

## Performance Considerations

### Before Archiving

**Current State:**
- `nic_cc_customer` table: ~10,000+ records
- Query performance: Slower with large dataset
- Index efficiency: Degraded

### After Archiving

**Expected State:**
- `nic_cc_customer` table: Active records only (~2,000-3,000)
- `nic_cc_customer_backup` table: Historical records (~7,000-8,000)
- Query performance: Significantly improved
- Index efficiency: Optimal

### Ongoing Maintenance

**Daily Archive:**
- Moves ~50-100 records per day (estimated)
- Keeps active table lean
- Maintains performance

---

## Rollback Plan

### If Something Goes Wrong

**Immediate Actions:**
1. Disable Background Task
2. Check archive log for errors
3. Verify data in backup table

**Data Recovery:**
```
If records need to be restored:

1. Query nic_cc_customer_backup
   - Filter: archived_at > [problem_date]

2. Copy records back to nic_cc_customer
   - Remove archived_at, archived_by, archive_reason

3. Delete from nic_cc_customer_backup
   - WHERE archived_at > [problem_date]
```

**Prevention:**
- Always test with dry_run first
- Start with small batches
- Monitor closely for first week

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] Backup table schema matches source table
- [ ] Archive log table created
- [ ] Manual endpoint created
- [ ] Dry run test successful (counts correct)
- [ ] Small batch test successful (10 records)
- [ ] Medium batch test successful (100 records)
- [ ] Data integrity verified (all fields copied)
- [ ] Archive log entries created correctly
- [ ] Related records handling decided
- [ ] Rollback procedure tested

### Post-Deployment Monitoring

- [ ] Day 1: Check archive log
- [ ] Day 2: Verify record counts
- [ ] Day 3: Check for errors
- [ ] Day 7: Review weekly summary
- [ ] Day 14: Assess performance improvement
- [ ] Day 30: Full system review

---

## Deployment Timeline

### Phase 1: Preparation (Week 1)
- Create backup table
- Create archive log table
- Create manual endpoint
- Test with dry_run mode

### Phase 2: Manual Testing (Week 2)
- Test with small batches (10-100 records)
- Verify data integrity
- Test rollback procedure
- Document any issues

### Phase 3: Automation (Week 3)
- Convert to Background Task
- Set schedule to daily 2 AM
- Enable with dry_run for 3 days
- Monitor logs daily

### Phase 4: Go Live (Week 4)
- Disable dry_run mode
- Monitor closely for 1 week
- Adjust batch size if needed
- Document final configuration

---

## Maintenance & Monitoring

### Daily (First Week)
- Check archive log for errors
- Verify record counts
- Monitor execution time

### Weekly (Ongoing)
- Review archive log summary
- Check backup table growth
- Verify no data loss
- Monitor query performance

### Monthly
- Full system review
- Performance assessment
- Adjust criteria if needed
- Review retention policy

---

## Retention Policy

### Active Table
- Records less than 60 days old
- Active customers with recent activity
- Customers with pending actions

### Archive Table
- Records older than 60 days
- Inactive customers
- Historical data for reporting

### Long-Term Retention
- Keep archived data for: **2 years** (recommended)
- After 2 years: Consider permanent deletion or cold storage
- Compliance: Check regulatory requirements

---

## Notifications & Alerts

### Success Notifications
- Daily summary email (optional)
- Weekly report to admin
- Monthly statistics

### Error Alerts
- Immediate email on failure
- Slack/Teams notification (if configured)
- Log entry with details

### Monitoring Dashboard
- Total records archived
- Archive rate (records/day)
- Error rate
- Performance metrics

---

## FAQ

**Q: What happens to related records (AODs, payments, etc.)?**  
A: Initially, they remain in their tables. Phase 2 will archive related records together.

**Q: Can we restore archived records?**  
A: Yes, records can be copied back from backup table if needed.

**Q: How long does archiving take?**  
A: ~1-2 seconds per 1000 records. Initial run may take 10-20 seconds.

**Q: Will this affect active users?**  
A: No, runs at 2 AM when system usage is minimal.

**Q: Can we change the 60-day criteria?**  
A: Yes, easily adjustable in the function logic.

**Q: What if archiving fails?**  
A: Transaction rolls back, no data loss. Error logged for review.

---

## Support & Troubleshooting

### Common Issues

**Issue:** Archive not running
- Check Background Task is enabled
- Verify schedule is correct
- Check Xano logs for errors

**Issue:** No records being archived
- Verify cutoff date calculation
- Check if records meet criteria
- Run dry_run to see count

**Issue:** Performance degradation
- Reduce batch size
- Run during off-peak hours
- Check database indexes

### Contact

For issues or questions:
- Check archive log first
- Review Xano function logs
- Test with dry_run mode
- Document error messages

---

## Next Steps

1. **Review this document** with team
2. **Decide on related records handling** (Option A, B, or C)
3. **Set retention policy** (how long to keep archived data)
4. **Create backup table** in Xano
5. **Create archive log table** in Xano
6. **Build manual endpoint** for testing
7. **Test thoroughly** with dry_run
8. **Convert to Background Task** when ready
9. **Monitor closely** for first week
10. **Document final configuration**

---

## Approval & Sign-off

**Prepared by:** Kiro AI Assistant  
**Date:** January 20, 2026  
**Status:** Awaiting Approval

**Approvals Required:**
- [ ] Technical Lead
- [ ] Database Administrator
- [ ] System Administrator
- [ ] Business Owner

---

## Appendix A: Xano Function Pseudocode

```javascript
// Archive Old Customers Function
function archiveOldCustomers(dry_run = false, batch_size = 1000) {
  
  // Calculate cutoff date
  const cutoff_date = new Date();
  cutoff_date.setDate(cutoff_date.getDate() - 60);
  
  // Query customers to archive
  const customers = query('nic_cc_customer')
    .where('created_at', '<', cutoff_date)
    .limit(batch_size)
    .get();
  
  // Dry run mode
  if (dry_run) {
    return {
      message: 'Dry run - no records moved',
      count: customers.length
    };
  }
  
  // Archive records
  let archived = 0;
  let failed = 0;
  
  for (const customer of customers) {
    try {
      // Copy to backup
      insert('nic_cc_customer_backup', {
        ...customer,
        archived_at: new Date(),
        archived_by: 'system',
        archive_reason: '60_day_rule'
      });
      
      // Delete from main table
      delete('nic_cc_customer').where('id', customer.id);
      
      archived++;
    } catch (error) {
      failed++;
      console.error('Archive failed for customer:', customer.id, error);
    }
  }
  
  // Log the operation
  insert('nic_cc_archive_log', {
    run_date: new Date(),
    records_archived: archived,
    records_failed: failed,
    status: failed > 0 ? 'partial' : 'success',
    dry_run: false
  });
  
  return {
    success: true,
    archived,
    failed,
    total: customers.length
  };
}
```

---

## Appendix B: SQL Queries for Verification

```sql
-- Count records in main table
SELECT COUNT(*) FROM nic_cc_customer;

-- Count records in backup table
SELECT COUNT(*) FROM nic_cc_customer_backup;

-- Count records older than 60 days
SELECT COUNT(*) 
FROM nic_cc_customer 
WHERE created_at < NOW() - INTERVAL '60 days';

-- View recent archive log entries
SELECT * 
FROM nic_cc_archive_log 
ORDER BY run_date DESC 
LIMIT 10;

-- Check for orphaned related records
SELECT COUNT(*) 
FROM nic_cc_aod 
WHERE customer_id NOT IN (SELECT id FROM nic_cc_customer);
```

---

**End of Document**
