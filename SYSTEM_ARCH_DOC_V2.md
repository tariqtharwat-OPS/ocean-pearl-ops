# DEPRECATED — Do not use. Refer to SYSTEM_CANONICAL_STATE.md

# Ocean Pearl Ops System Architecture V2 - Design Document

**Status:** DRAFT (Waiting for Approval)
**Date:** January 8, 2026
**Author:** Antigravity (Google DeepMind)

---

## 1. User Roles & Permission Hierarchy

We are moving from a flat `role` string to a **Scope-Based Permission System**.

### A. Role Definitions

| Role Name | Scope | Description | Allowed Actions |
| :--- | :--- | :--- | :--- |
| **UNIT_OP**<br>(Unit Operator) | **Single Unit**<br>(e.g., `gudang_teri`) | Day-to-day operational staff. | • **View:** Assigned Unit Data Only.<br>• **Stock:** Receive Raw Material, Execute Production Run.<br>• **Finance:** Create *Expense Request* (Cannot Spend).<br>• **Shark:** Ask operational questions (local only). |
| **LOC_MANAGER**<br>(Location Manager) | **Single Location**<br>(e.g., `kaimana`) | Site Commander. | • **View:** All Units in Location + Location Wallet.<br>• **Finance:** Manage Location Wallet, Approve Expense Requests, Request Funds from HQ.<br>• **Stock:** Audit all units, Move stock between units.<br>• **Shark:** Strategic analysis (Location level). |
| **HQ_ADMIN**<br>(Core Admin) | **Global** | Super Admin / Treasury. | • **View:** All Data.<br>• **Finance:** Manage HQ Wallet, Approve Fund Transfers, Audit Ledger.<br>• **Config:** Manage Items, Partners, Users.<br>• **Shark:** Full System Command. |
| **READ_ONLY** | **Scoped**<br>(Unit / Loc / Global) | Auditor / Investor / Observer. | • **View:** Dashboards, Reports, Ledger.<br>• **Actions:** NONE. |

### B. Access Control Matrix

| Feature | UNIT_OP | LOC_MANAGER | HQ_ADMIN |
| :--- | :--- | :--- | :--- |
| **Wallet Balance** | ❌ NO ACCESS | ✅ View & Spend | ✅ View & Spend |
| **Expense Creation** | ⚠️ Request Only | ✅ Direct Spend | ✅ Direct Spend |
| **Fund Transfer** | ❌ NO ACCESS | ⚠️ Request Only | ✅ Execute (HQ->Loc) |
| **Stock Receiving** | ✅ Execute | ✅ Execute | ✅ Execute |
| **Production Run** | ✅ Execute | ✅ Execute | ✅ Execute |
| **Global Dashboard** | ❌ NO ACCESS | ❌ NO ACCESS | ✅ Full Access |

---

## 2. Location & Unit Type Definitions

The system will enforce business logic based on `location.type` and `unit.type`.

### A. Location Types
1.  **HQ (Headquarters)**
    *   **Behavior:** Financial Center. No physical stock operations.
    *   **Wallet:** Unlimited liquidity source (in/out).
2.  **Operational Site (e.g., Kaimana)**
    *   **Behavior:** Physical processing center.
    *   **Wallet:** Finite balance. Requires top-ups from HQ.

### B. Unit Types & Capabilities

| Unit Type | Primary Function | Inputs | Outputs | Allowed Screens |
| :--- | :--- | :--- | :--- | :--- |
| **OFFICE** | Admin management | N/A | N/A | • Expense Manager<br>• Reports<br>• Wallet (Manager Only) |
| **PROCESSING_WET**<br>(e.g., Anchovy) | Cooking/Drying | Raw Fish | Dried Goods | • Receiving (Raw)<br>• Processing (Batch)<br>• Stock |
| **PROCESSING_FROZEN**<br>(e.g., Factory) | Cutting/Freezing | Raw Fish | Frozen Products | • Receiving (Raw)<br>• Processing (Yield)<br>• Stock |
| **COLD_STORAGE** | Inventory Holding | Finished Goods | Sales / Transfer | • Receiving (FG)<br>• Inventory Audit<br>• Dispatch/Sales |

---

## 3. Financial Workflows (Wallet V2)

We introduce a **Zero-Trust Spending Model**. Unit users never touch cash directly; they request authorization.

### Flow A: Unit Expense (e.g., Buying Ice)
1.  **Unit User**: Submits `EXPENSE_REQUEST` (Amount: 500k, Type: Ice, Photo attached).
2.  **System**: Creates "Pending Request" notification for Location Manager.
3.  **Location Manager**: Reviews -> `APPROVE` or `REJECT`.
4.  **System (On Approval)**:
    *   Deducts 500k from `Location Wallet`.
    *   Marks Request as `PAID`.
    *   Logs Transaction in Ledger.

### Flow B: Funding Request (Location Needs Money)
1.  **Location Manager**: Submits `FUNDING_REQUEST` (Amount: 100M, Reason: Purchasing Season).
2.  **HQ Admin**: Reviews -> `APPROVE` (Triggers Transfer) or `REJECT`.
3.  **System (On Approval)**:
    *   Atomic Transfer: HQ Wallet (-) -> Location Wallet (+).
    *   Global Cash remains neutral.

---

## 4. Shark AI: "Human-in-the-Loop" Agent

Shark will transition from a "Chatbot" to an "Executive Assistant".

### A. Modes of Operation
1.  **Consultative (All Roles)**
    *   "What is my stock level?"
    *   "Show me recent expenses."
    *   *Output:* Text/Charts. No database changes.

2.  **Drafting (Manager/Admin)**
    *   "Prepare a transaction for 100kg Tuna purchase from Nelayan A."
    *   *Output:* Shark shows a **Transaction Preview Card**.
    *   *Action:* User clicks **CONFIRM** to execute.

3.  **Analysis (Admin)**
    *   "Analyze this invoice image."
    *   *Output:* Extracted data (Items, Qty, Price).
    *   *Action:* Shark proposes `PURCHASE_RECEIVE` entry. User **CONFIRMS**.

### B. Safety Rules
*   Shark **NEVER** executes writes automatically.
*   Shark **ALWAYS** presents a "Plan" first.
*   Shark respects the `auth.uid` role. (It won't show HQ data to a Unit OP).

---

## 5. Database Schema Changes

To support the above without breaking existing data (`backward_compatibility`), we will add fields, not remove them.

### A. `users` Collection
*   Add `role_scope`: `'global' | 'location' | 'unit'`
*   Add `target_id`: ID of the location or unit (if scoped).
*   Add `permissions`: Array of strings `['can_approve_expense', 'can_view_wallet']`.

### B. `locations / units` Schema
*   Add `capabilities`: Array `['receiving_raw', 'processing_dry', 'cold_storage']`.
*   Add `wallet_id`: Reference to the wallet document (Locations only).

### C. `financial_requests` (NEW Collection)
*   `id`: Auto-gen
*   `requester_id`: User UID
*   `approver_id`: User UID (null if pending)
*   `amount`: Number
*   `status`: `'PENDING' | 'APPROVED' | 'REJECTED'`
*   `context`: `{ locationId, unitId, type }`

---

## 6. Migration Plan

1.  **Backup**: Export current Firestore.
2.  **Schema Patch**: Run a Cloud Function to:
    *   Tag `HQ` location as `type: 'HQ'`.
    *   Tag `Kaimana/Saumlaki` as `type: 'OPERATIONAL'`.
    *   Assign `unit.type` based on hardcoded map (e.g., `gudang_teri` -> `PROCESSING_WET`).
3.  **User Patch**:
    *   Map `admin` -> `HQ_ADMIN`.
    *   Map `manager` -> `LOC_MANAGER`.
    *   Map `staff` -> `UNIT_OP`.
4.  **UI Switch**: Deploy new Role-Based Router.

---

**Waiting for User Approval to proceed with Implementation.**
