# Optimization & Hardening Plan: Ocean Pearl Ops V2
**Date:** January 27, 2026
**To:** Ocean Pearl Ops Executive Committee
**From:** Antigravity (AI Lead Developer)
**Reference:** `OPS V2 Audit Checklist.pdf` (Jan 26, 2026)

---

## 🏗️ Phase 1: Safety & Integrity (Immediate Remediation)
**Goal:** Eliminate data corruption risks, enforce permissions (`C1-C8`), and secure the "CEO Mode" perimeter.
*Status: Mostly Complete (Jan 26-27 Sprint)*

| Audit ID | Issue | Action Plan / Implementation | Status |
| :--- | :--- | :--- | :--- |
| **C1** | `View As` Write Leak | **Strict Server-Side Guard**: Implemented `guardWrite();` in `writeGuard.js`. Any write attempt in `VIEW_AS` mode is intercepted and rejected with a generic error. **UI**: Disabled action buttons in `Receiving.jsx` and `Expenses.jsx`. | ✅ **DONE** |
| **C2** | `Operate As` No Confirm | **Session Handshake**: Added `guardWrite` interception. The *first* write action in a session triggers a browser Confirmation Dialog. Subsequent writes are allowed. | ✅ **DONE** |
| **C3** | Expense Request Broken | **Scope Repair**: Fixed `functions/financial_v2.js` to correctly derive Location Scope for Unit Operators. Verified with valid payload test. | ✅ **DONE** |
| **C4** | Context Switch Silence | **Context Curtain**: Add an improved `ContextSwitcher.jsx` that shows a **"Switching..." modal** or banner when changing location. Enforce a 500ms visual delay to prevent accidental double-clicks. | ⏳ **PENDING** |
| **C5** | Insecure Password Reset | **Secure Modal**: Replaced `prompt()` with a dedicated `PasswordResetModal` featuring "Copy to Clipboard" and avoiding `window.open` triggers. | ✅ **DONE** |
| **C6** | Manager Read-Only | **Role Elevation**: Updated `Dashboard.jsx` and `WalletManager.jsx` to expose "Approvals" and "Wallet" features to Location Managers. | ✅ **DONE** |
| **C7** | NaN Wallet Amounts | **Safe Parsing**: Implemented `parseFloat(val || 0)` sanitizer in `WalletManager.jsx` to handle malformed Firestore numbers gracefully. | ✅ **DONE** |
| **C8** | Blank Tabs | **Trigger Audit**: Removed `prompt`; Review `window.open` usage. (Note: `M8` API errors will also address this). | ✅ **DONE** |

---

## ⚡ Phase 2: Operational Power (Usability & Speed)
**Goal:** Remove user friction (`M1-M8`) to ensure field staff actually use the system instead of WhatsApp.

| Audit ID | Issue | Proposed Change | Target File | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **M1** | Unclear Species (`-`) | **Sanitize Dropdown**: Filter out catalog items with missing names. Format: `English (Indonesian)`. | `Receiving.jsx` | No `undefined` entries in dropdown. |
| **M2** | No Inline Add Vendor | **Inline Components**: Replace native `<select>` with `SelectWithAddNew.jsx` for Vendors and Expense Types. | `Receiving.jsx` | User can create "New Vendor" without leaving the receiving form. |
| **M3** | Unsaved Changes Loss | **Navigation Guard**: Implement `usePrompt` (React Router) or `beforeunload` listener when form state is dirty. | `Receiving.jsx`, `Expenses.jsx` | Navigating away shows "Discard unsaved changes?" dialog. |
| **M4** | Role Name Mismatch | **Standardization**: Update `AdminPanel.jsx` to map "Loc Admin" UI label to `LOC_MANAGER` strictly. | `AdminPanel.jsx` | UI labels match backend ENUMs exactly. |
| **M5** | Ambiguous Passwords | **Font/Format**: User standard mono font for passwords; exclude ambiguous chars (0, O, I, l) from generation logic. | `functions/user_mgmt.js` | Generated passwords are unambiguous (e.g. `ABC-234`). |
| **M6** | Silent Loading States | **Feedback Loops**: Add `submitting` spinner to all Submit buttons. Show "Success" Toast for 3s before resetting forms. | `Receiving.jsx`, `ProductionRun.jsx` | No button remains clickable during API calls. |
| **M7** | Context Visibility | **App Header V2**: Make Location/Unit indicator **Larger (text-sm -> text-lg)** and color-coded (Amber for Admin, Blue for Operator). | `Layout.jsx` | Context is readable from 1 meter away. |
| **M8** | API Error UX | **Error Boundaries**: Wrap API calls in `try/catch` blocks that display **Inline Alerts** instead of crashing or opening new tabs. | `Receiving.jsx` | Invalid inputs show red text below field, not a blank page. |

---

## 📈 Phase 3: Scale & Boats (Future Foundations)
**Goal:** Prepare for "Fleet Mode" (Boat Units) and massive transaction volume.

1.  **Boat Unit Type**: Define `BOAT` as a valid unit type in `functions/constants.js`.
2.  **Backdating**: unlock `customDate` field in `Receiving.jsx` (currently strictly `today`) to allow batch entry of past dockings.
3.  **Audit Log Export**: Create `GET /api/audit-log` CSV export for external auditors.

---

### Non-Issues & Justifications
*   **O1 (Bulk Approvals)**: Rejected for now. We want Managers to review *each* expense line individually to prevent rubber-stamping during this early deployment phase.
*   **O5 (Self-Service Password Reset)**: Rejected. Due to high turnover and shared devices in remote locations, Admin-controlled reset is safer to prevent account hijacking.

---

**Execution Order Recommendation:**
1.  **M2 (Inline Vendors)** - Highest operational blocker.
2.  **C4 & M7 (Context Safety)** - Critical for integrity.
3.  **M1, M4, M5, M6** - Quick UI Polish batch.
4.  **M3 & M8** - Complexity hardening.

**Ready for Approval.**
