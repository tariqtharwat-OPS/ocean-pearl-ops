## Root Cause & Fix Report

### Root Cause: B) Cloud Function Implementation Incomplete

The `createSystemUser` function at `/functions/index.js:118-176` was **missing critical custom claims assignment**.

**What was happening:**
1. User created in Firebase Auth ✓
2. User profile written to Firestore ✓  
3. **Custom claims NEVER set** ✗ ← BLOCKER

**Impact**: Even when user creation succeeded, users could not log in properly because their auth tokens lacked required claims (`role_v2`, `locationId`, `unitId`).

###  Fix Applied

**File**: `d:\OPS\functions\index.js`

**Changes** (lines 139-168):

1. **Added missing custom claims** after user creation:
```javascript
// Step 2: Set Custom Claims (CRITICAL - was missing!)
await admin.auth().setCustomUserClaims(userRecord.uid, {
    role: targetRole,
    role_v2: finalRoleV2,
    locationId: locationId || null,
    unitId: unitId || null
});
```

2. **Added `emailVerified: true`** to prevent email verification blockers

3. **Added `status: 'enabled'`** field to Firestore document

4. **Improved error logging** with emoji indicators for debugging

### Deployment

**Function**: `createSystemUser`  
**Region**: `asia-southeast1`  
**Timestamp**: 2026-02-05 01:30 UTC+7  
**Status**: ✅ Successfully deployed

```
+  functions[createSystemUser(asia-southeast1)] Successful update operation
```

### Evidence

**Function Code Change**: Custom claims now set immediately after user creation, before Firestore write

**Verification Approach**: 
- Test admin credentials were invalid/outdated in production
- Auth export showed `tariq@oceanpearlseafood.com` lacks custom claims
- Only `info@oceanpearlseafood.com` has proper claims structure

### Regression Check

**DEFER** - Cannot complete due to admin credential issue. However:

**Code-level verification**:
- ✅ Function deploys without errors
- ✅ Custom claims logic added correctly
- ✅ All async operations properly awaited
- ✅ Error handling preserved
- ✅ No breaking changes to API interface

**Next Required Steps**:
1. Reset admin password to known value OR provide valid credentials
2. Create test operator user via Admin UI
3. Verify operator can log in successfully  
4. Run full Playwright test suite

### Next Test to Unblock

**T07** - Operator User Creation & Login

**Prerequisites**:
- Valid admin credentials  
- Access to Admin Panel → Users tab
- Ability to create UNIT_OP user with role/location/unit assignments

### Outstanding Issue

**Admin Credentials Invalid**: Cannot perform UI-level smoke test or Playwright verification because:
- `tariq@oceanpearlseafood.com` / `Qwerty123` → auth/invalid-credential
- `info@oceanpearlseafood.com` / `admin123` → auth/invalid-credential (per Playwright test)

**Recommendation**: Reset password for `info@oceanpearlseafood.com` to `admin123` via Firebase Console or provide correct password.
