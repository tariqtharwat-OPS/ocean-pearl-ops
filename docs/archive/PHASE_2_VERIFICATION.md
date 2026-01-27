# Phase 2 Verification Guide
**Date:** Jan 27, 2026
**Scope:** Optimization & Hardening (M2, M1, C4, M7)

## ✅ M2: Inline Vendor Addition
1.  **Navigate**: Log in as Unit Operator (or any role). Go to **Receiving**.
2.  **Action**: Open the "Supplier" dropdown. Scroll to bottom.
3.  **Click**: Select **"+ Add New Supplier"**.
4.  **Input**: Enter a test vendor name (e.g., "New Fisher A"). Click "Save & Select".
5.  **Verify**: 
    *   Modal closes.
    *   "New Fisher A" is selected in the dropdown.
    *   (Optional) Refresh page, check dropdown to see it persists.

## ✅ M1: Clean Species Catalog
1.  **Navigate**: Go to **Receiving**.
2.  **Action**: Open the "Species/Item" dropdown for a line item.
3.  **Verify**: All items follow the format `Name (Indonesian Name)` or just `Name`.
    *   **Fail**: Any item showing `undefined`, `null`, or `(-)`.

## ✅ C4: Context Switching Curtain
1.  **Navigate**: Log in as HQ Admin (or Legacy Admin).
2.  **Action**: In the top header, change the **Location** dropdown (e.g., from "Bitung" to "Kaimana").
3.  **Verify**:
    *   A full-screen dark overlay appears with "SWITCHING CONTEXT..." text/spinner.
    *   There is a visible delay (~800ms) before the new dashboard loads.
    *   **Goal**: Prevents "phantom clicks" on the old context while data refreshing.

## ✅ M7: Enhanced Visibility
1.  **Navigate**: Log in as HQ Admin.
2.  **Verify**:
    *   The Location Dropdown in the header uses **Large Text (text-lg)** and **Bold Font**.
    *   It has a distinct border/shadow compared to previous version.
    *   It is readable from a distance.
