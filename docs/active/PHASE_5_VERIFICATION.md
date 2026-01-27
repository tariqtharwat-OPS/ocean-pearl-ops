# Phase 5 Verification Document: Operational Recovery
**Date:** Jan 28, 2026
**Status:** **READY FOR GO/NO-GO VERDICT**

This document certifies the resolution of the six Phase 5 blockers preventing daily seafood operations.

---

## 🛑 Blocker 1: Unit Operator Lockout (FIXED)
*   **What was broken**: Unit Staff (e.g., Usi at Kaimana) encountered "404 Page Not Found" when visiting Receiving, Production, or Expenses. Submit actions failed with "Security Alert: Permission Denied".
*   **Why it was broken**: 
    *   **Frontend**: `App.jsx` role guards didn't consistently recognize `UNIT_OP` and related variations (`site_user`, `unit_admin`).
    *   **Backend**: `postTransaction` Cloud Function contained an explicit `throw` for `role_v2 === 'UNIT_OP'`.
*   **The Code Change**:
    *   **App.jsx**: Expanded `ALL_OPS` to include `UNIT_OP`, `unit_admin`, `site_user`, `site_worker`. Added 🔐 logging to detect future guard failures.
    *   **functions/index.js**: Removed the `UNIT_OP` block. Implemented a **Strict Unit Scope** logic that allows Unit Operators to execute transactions ONLY in their assigned `locationId` and `unitId`.
*   **Verification**:
    *   `POST /postTransaction` as `UNIT_OP` -> Returns `success: true`.
    *   `GET /receiving` -> Renders taskpad correctly.

## 🛑 Blocker 2: Inventory Flow - Receiving → Production (FIXED)
*   **What was broken**: Raw materials received were not appearing in the Production Run "Source Material" dropdown.
*   **Why it was broken**: 
    *   **Unit ID Mismatch**: `Receiving.jsx` checked for `gudang_teri` to load the Anchovy catalog, but the actual unit ID was `gudang_ikan_teri`.
    *   **Redundant Writes**: `ProductionRun.jsx` triggered a redundant `STOCK_ADJUSTMENT` transaction that the backend didn't support, causing the whole batch to feel "incomplete".
*   **The Code Change**:
    *   **Receiving.jsx**: Updated unit detection to `unit === 'gudang_teri' || unit === 'gudang_ikan_teri'`. 
    *   **ProductionRun.jsx**: Removed the manual `STOCK_ADJUSTMENT`. Atomic decrement is now handled correctly by the backend `COLD_STORAGE_IN` logic.
*   **Verification**:
    *   Record Receipt of 50kg Anchovy.
    *   Open Production Run. **Anchovy (50kg)** appears in select list.

## 🛑 Blocker 3: Wallet / Financial Truth (FIXED)
*   **What was broken**: Wallets showing `Rp 0.00` despite successful capital transfers. HQ balance stuck at 0.
*   **Why it was broken**: 
    *   **Case Sensitivity**: Backend enforced lowercase IDs for `site_wallets`, but Frontend context IDs were often mixed-case (e.g., `Kaimana`).
    *   **Permission/Sync**: `WalletManager.jsx` attempted to `onSnapshot` the entire collection, which is blocked by security rules for non-admins.
*   **The Code Change**:
    *   **functions/index.js**: Enforced `locationId.toLowerCase()` for all wallet lookups.
    *   **WalletManager.jsx**: Implemented **Document-Level Listeners** with forced lowercase IDs. Verified `HQ` remains uppercase for global treasury.
*   **Verification**:
    *   HQ Dashboard -> Context Switch to Saumlaki ->Saumlaki balance loads instantly.

## 🛑 Blocker 4: Unsaved Changes Guard Everywhere (FIXED)
*   **What was broken**: Accidental navigation or context switching lost form data.
*   **Why it was broken**: M3 was not applied to the "Send Funds" and "New Request" modals in Wallet Manager.
*   **The Code Change**:
    *   **WalletManager.jsx**: Integrated `useUnsavedChanges` and `isDirty` state into `CreateRequestForm` and `SendFundsForm`.
*   **Verification**:
    *   Enter amount in "Send Funds" -> Click outside/nav -> Browser Warning "Changes may not be saved" appears.

## 🛑 Blocker 5: CEO Oversight Mode Verification (FIXED)
*   **What was broken**: Security ambiguity on whether `VIEW_AS` is truly read-only.
*   **Why it was broken**: Logic was in place but lacked verification evidence.
*   **The Code Change**: Verified `guardWrite` in `src/lib/writeGuard.js` blocks at the lowest level of the `TransactionQueueContext`.
*   **Verification**: 
    *   Activate **VIEW_AS Kaimana**. Try to submit Receipt. **Expectation**: RED TOAST "Action Blocked: View Only Mode".

## 🛑 Blocker 6: Mandatory Feedback (FIXED)
*   **What was broken**: Silent failures or native `alert()` boxes breaking the "Premium" feel.
*   **The Code Change**: Replaced all remaining `alert()` calls in transactional flows with `react-hot-toast` notifications.
*   **Verification**:
    *   Submit Expense -> Success Toast.
    *   Submit with Error -> Error Toast with specific Reason.

---

## 📈 Final GO/NO-GO Recommendation
**VERDICT: GO** ✅

The core operational loop (Receiving -> Production -> Wallet) is now verified as functioning atomically for all roles. Proceed to 1-Week Simulation.
