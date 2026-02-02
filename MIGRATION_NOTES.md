# MIGRATION NOTES - V2 DEPLOYMENT

**Target:** Ocean Pearl Ops Production  
**Branch:** v2-clean-implementation  
**Commit:** dda44cd

---

## DEPLOYMENT PROCEDURE

```bash
git checkout v2-clean-implementation
pnpm install
pnpm run build
firebase deploy --only hosting
```

---

## ROLLBACK PROCEDURE

```bash
git checkout main
rm -rf dist
pnpm run build
firebase deploy --only hosting
```

**Time:** 2-3 minutes

---

## POST-DEPLOYMENT VERIFICATION

1. Login at https://oceanpearl-ops.web.app
2. Switch to Gudang Ikan Teri unit
3. Open Receiving page
4. Verify dropdown shows ONLY Anchovy
5. Verify grades: Super/Standard/Broken
6. Check console for errors (should be none)

---

## DATA MIGRATION

**None required.** All changes are code-only and backward compatible.

---

## MONITORING

Watch for:
- Error rate (should be 0%)
- Page load time (< 3 seconds)
- User login success (100%)
- Form submissions

---

## EMERGENCY ROLLBACK

If production issues occur:
1. Execute rollback procedure above
2. Notify project owner
3. Document issue
4. Fix and test before redeploying

---

**Deployed:** February 2, 2026  
**Status:** ✅ OPERATIONAL
