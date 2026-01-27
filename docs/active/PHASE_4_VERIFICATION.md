# Phase 4 Verification Guide
**Date:** Jan 27, 2026
**Scope:** Hardening (M3 Unsaved Changes, M8 API Error Handling) and Repo Hygiene.


## ✅ M3: Unsaved Changes Guard
1.  **Preparation**: Log in as Unit Operator. Go to **Receiving**, **Expenses**, **Production Run**, or **Wallet Manager**.
2.  **Make Dirty**:
    *   **Receiving**: Add line item.
    *   **Expenses**: Type in notes or amount.
    *   **Production**: Select Input Stock or add Output line.
    *   **Wallet**: Open "New Request" or "Send Funds" and type description.
3.  **Test 1 (Browser Refresh)**:
    *   Click "Save/Submit". 
    *   **Verify**: Success toast appears. 
    *   **Action**: Refresh page immediately after.
    *   **Verify**: No warning dialog (dirty state cleared).

## ✅ M8: API Error Handling
1.  **Preparation**: Go to **Receiving**.
2.  **Test 1 (Validation Error)**:
    *   Enter a negative quantity (e.g., -5).
    *   Click Submit.
    *   **Verify**: Red Toast Message "Critical: Negative values not allowed".
    *   **Verify**: NO alert() dialog. NO blank page.
3.  **Test 2 (Missing Fields)**:
    *   Clear Supplier.
    *   Click Submit.
    *   **Verify**: Red Toast Message "Please select a supplier".
4.  **Test 3 (Permission Denied)**:
    *   (Requires mocked failure or CEO View-As mode).
    *   If using View-As: Try to submit.
    *   **Verify**: Red Toast Message "Action blocked: View Only Mode".

## ✅ Repo Hygiene
1.  **Verify Root**: Check `d:\OPS`.
    *   Should NOT contain: `BUGLIST.md`, `DEPLOYMENT_SUMMARY.md`.
    *   Should contain: `README.md`, `package.json`, `docs/`.
2.  **Verify Docs**:
    *   Open `docs/index.md`.
    *   Check links to Active Docs work.
    *   Check Archive folder exists.
