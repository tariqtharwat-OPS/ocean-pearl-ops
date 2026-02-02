# MIGRATION NOTES

**Project:** Ocean Pearl Ops V2  
**Migration Type:** Additive Refactor (No Breaking Changes)  
**Date:** February 2, 2026

---

## OVERVIEW

This migration introduces the V2 unit-centric architecture while maintaining full backward compatibility with existing data and workflows. All changes are additive and non-destructive.

---

## PRE-DEPLOYMENT CHECKLIST

### Required Actions Before Deployment

#### 1. Backup Current Production
```bash
# Backup Firestore data
firebase firestore:export gs://oceanpearl-ops.appspot.com/backups/$(date +%Y%m%d)

# Backup current hosting
firebase hosting:clone oceanpearl-ops:production oceanpearl-ops:backup
```

#### 2. Verify Firebase Project
```bash
# Confirm correct project
firebase projects:list
firebase use oceanpearl-ops

# Verify project configuration
cat .firebaserc
```

#### 3. Review Firestore Indexes
```bash
# Deploy indexes first (non-breaking)
firebase deploy --only firestore:indexes
```

#### 4. Test Functions Locally (Optional)
```bash
cd functions
npm install
npm test  # If tests exist
```

---

## DEPLOYMENT STEPS

### Step 1: Deploy Cloud Functions
```bash
# Deploy functions first (backend validation)
firebase deploy --only functions

# Verify functions deployed
firebase functions:list
```

**Expected Functions:**
- `postTransaction` (updated with validation)
- `createFinancialRequest` (unchanged)
- `approveFinancialRequest` (unchanged)
- `rejectFinancialRequest` (unchanged)
- `seedRealisticData` (unchanged)

### Step 2: Deploy Hosting
```bash
# Build frontend
pnpm run build

# Deploy hosting
firebase deploy --only hosting

# Verify deployment
curl https://oceanpearl-ops.web.app
```

### Step 3: Verify Deployment
```bash
# Check hosting status
firebase hosting:channel:list

# Check function logs
firebase functions:log --only postTransaction --limit 10
```

---

## DATABASE MIGRATION

### No Schema Changes Required

The V2 refactor does not require any database schema changes. All existing data remains valid and functional.

### Optional: Add V2 Metadata to Existing Records

If you want to enrich existing data with V2 metadata, run these optional updates:

#### Add Unit Type to Existing Units
```javascript
// Run in Firebase Console or Admin SDK
const db = admin.firestore();

const unitTypeMapping = {
  'office': 'OFFICE',
  'cold_storage': 'COLD_STORAGE',
  'gudang_ikan_teri': 'PROCESSING_DRY',
  'frozen_fish': 'FROZEN_FACTORY'
};

const locations = await db.collection('locations').get();

for (const locDoc of locations.docs) {
  const units = await locDoc.ref.collection('units').get();
  
  for (const unitDoc of units.docs) {
    const unitType = unitTypeMapping[unitDoc.id];
    if (unitType) {
      await unitDoc.ref.update({
        unitType: unitType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
}
```

#### Add Batch Metadata to Recent Transactions
```javascript
// Optional: Add batch metadata to recent transactions
const recentTransactions = await db.collection('transactions')
  .where('timestamp', '>', admin.firestore.Timestamp.fromDate(new Date('2026-01-01')))
  .get();

for (const txnDoc of recentTransactions.docs) {
  const data = txnDoc.data();
  
  if (data.batchId && !data.batchMetadata) {
    await txnDoc.ref.update({
      batchMetadata: {
        ownershipType: 'OUR',  // Default, adjust as needed
        generation: 0,
        lineage: []
      }
    });
  }
}
```

**Note:** These migrations are OPTIONAL. The system works without them.

---

## USER ROLE MIGRATION

### Verify User Roles

All users should have `role_v2` field. If not, run this migration:

```javascript
const users = await db.collection('users').get();

for (const userDoc of users.docs) {
  const data = userDoc.data();
  
  if (!data.role_v2) {
    // Map legacy roles to V2
    let role_v2 = 'READ_ONLY';
    
    if (data.role === 'admin') {
      role_v2 = 'HQ_ADMIN';
    } else if (data.role === 'location_manager') {
      role_v2 = 'LOC_MANAGER';
    } else if (data.role === 'unit_operator' || data.role === 'site_user') {
      role_v2 = 'UNIT_OP';
    }
    
    await userDoc.ref.update({
      role_v2: role_v2,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}
```

---

## TESTING POST-DEPLOYMENT

### Critical Path Testing

#### Test 1: Unit Type Filtering (Gudang Ikan Teri)
1. Login as operator at Kaimana > Gudang Ikan Teri
2. Navigate to Receiving
3. **Expected:** Only anchovy items visible in dropdown
4. **Expected:** Only Super/Standard/Broken grades visible
5. Try to submit transaction with tuna (should fail)

#### Test 2: Backend Validation
1. Use browser console to attempt bypassing UI validation
2. Try to post transaction with invalid item for unit type
3. **Expected:** Server returns validation error
4. **Expected:** Transaction rejected

#### Test 3: Bilingual Support
1. Login as Indonesian user
2. Change language to Bahasa Indonesia
3. Navigate through all pages
4. **Expected:** All labels in Indonesian
5. **Expected:** Shark AI responds in Indonesian

#### Test 4: UX Improvements
1. Navigate to any page with buttons
2. **Expected:** All buttons visible without hover
3. **Expected:** Clear contrast on all elements
4. **Expected:** Forms readable and usable

### Performance Testing

#### Frontend Performance
```bash
# Test page load time
curl -w "@curl-format.txt" -o /dev/null -s https://oceanpearl-ops.web.app

# Check bundle size
ls -lh dist/assets/
```

#### Backend Performance
```bash
# Monitor function execution time
firebase functions:log --only postTransaction --limit 50 | grep "execution took"
```

---

## ROLLBACK PROCEDURE

### If Critical Issues Occur

#### Immediate Rollback (Full)
```bash
# Rollback to previous deployment
firebase hosting:channel:deploy previous
firebase deploy --only functions:postTransaction --force

# Or rollback from Git
git checkout main
pnpm run build
firebase deploy
```

#### Partial Rollback (Functions Only)
```bash
# Rollback functions while keeping new frontend
git checkout main -- functions/
firebase deploy --only functions
```

#### Partial Rollback (Frontend Only)
```bash
# Rollback frontend while keeping new functions
git checkout main -- src/
pnpm run build
firebase deploy --only hosting
```

### Rollback Safety

All rollbacks are safe because:
- No database schema changes
- No data migrations required
- Legacy code paths preserved
- Backward compatibility maintained

---

## MONITORING POST-DEPLOYMENT

### Key Metrics to Monitor

#### Error Rates
```bash
# Monitor function errors
firebase functions:log --only postTransaction | grep "Error"

# Monitor client errors (check Firebase Console > Crashlytics)
```

#### Transaction Success Rate
```javascript
// Query in Firebase Console
db.collection('transactions')
  .where('timestamp', '>', new Date(Date.now() - 24*60*60*1000))
  .get()
  .then(snap => {
    console.log('Transactions in last 24h:', snap.size);
  });
```

#### User Feedback
- Monitor support channels for user reports
- Check Shark AI logs for unusual error patterns
- Review audit logs for validation failures

### Alerts to Set Up

1. **Function Error Rate > 5%**
   - Alert: Email to admin
   - Action: Investigate logs

2. **Page Load Time > 3s**
   - Alert: Slack notification
   - Action: Check bundle size

3. **Validation Failures > 10/hour**
   - Alert: Email to admin
   - Action: Review validation rules

---

## KNOWN ISSUES & WORKAROUNDS

### Issue 1: By-Product UI Incomplete
**Impact:** Users cannot add by-products through UI  
**Workaround:** By-products can be added manually through admin panel  
**Fix:** Complete by-product form UI in follow-up phase

### Issue 2: Storage Costing Not Automated
**Impact:** Storage costs not automatically calculated  
**Workaround:** Calculate storage costs manually in reports  
**Fix:** Integrate kg/day costing in follow-up phase

### Issue 3: Container Shipment Not Implemented
**Impact:** HQ export validation not enforced  
**Workaround:** Use existing export workflow  
**Fix:** Implement ContainerShipment entity in follow-up phase

---

## FOLLOW-UP TASKS

### Immediate (Week 1)
- [ ] Monitor error logs daily
- [ ] Collect user feedback
- [ ] Fix any critical bugs
- [ ] Update documentation

### Short-term (Month 1)
- [ ] Complete by-product UI
- [ ] Implement storage costing automation
- [ ] Add container shipment entity
- [ ] Implement transport boat tracking

### Long-term (Quarter 1)
- [ ] Advanced yield analytics
- [ ] Batch lineage visualization
- [ ] Enhanced Shark AI anomaly detection
- [ ] Mobile app optimization

---

## SUPPORT & TROUBLESHOOTING

### Common Issues

#### "Item not allowed for this unit type"
**Cause:** User trying to receive item not allowed for their unit  
**Solution:** Verify unit type and allowed items in `unitTypesV2.js`

#### "Grade not allowed for this unit type"
**Cause:** User trying to use grade not allowed for their unit  
**Solution:** Verify unit type and allowed grades in `unitTypesV2.js`

#### "Validation failed" in backend
**Cause:** Client-side validation bypassed or outdated  
**Solution:** Clear browser cache, refresh page

#### Translations missing
**Cause:** New translation keys not loaded  
**Solution:** Clear browser cache, verify `i18n_extended.js` deployed

### Emergency Contacts

- **Technical Issues:** Check GitHub Issues
- **Deployment Issues:** Review Firebase Console logs
- **User Issues:** Check Shark AI logs for context

---

## DOCUMENTATION UPDATES

### Files to Update Post-Deployment

1. **README.md**
   - Add V2 architecture overview
   - Update setup instructions
   - Add unit type documentation

2. **API Documentation**
   - Document new validation rules
   - Update transaction schema
   - Add batch traceability docs

3. **User Manual**
   - Update with V2 features
   - Add bilingual instructions
   - Include unit type guide

---

## SUCCESS CRITERIA

### Deployment Considered Successful When:

✅ All functions deployed without errors  
✅ Hosting deployed and accessible  
✅ No increase in error rate (< 1%)  
✅ All critical path tests pass  
✅ User feedback positive  
✅ Performance metrics within acceptable range  

### Deployment Considered Failed When:

❌ Error rate > 5%  
❌ Critical path tests fail  
❌ Page load time > 5s  
❌ Users unable to complete workflows  
❌ Data integrity issues  

**If deployment fails:** Execute rollback procedure immediately.

---

## CONCLUSION

This migration is designed to be safe, reversible, and non-disruptive. All changes are additive and backward compatible. The V2 architecture provides a solid foundation for future enhancements while maintaining full compatibility with existing data and workflows.

**Confidence Level:** HIGH  
**Risk Level:** LOW  
**Rollback Complexity:** LOW

---

**Document Version:** 1.0  
**Last Updated:** February 2, 2026  
**Author:** Manus AI Agent
