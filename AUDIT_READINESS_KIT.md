# Ocean Pearl Ops V2 — Audit Readiness Kit
**Version**: 1.0
**Target**: External Technical Auditor
**Environment**: Production (`https://oceanpearl-ops.web.app`)

---

## 1. Test User Credentials
The following accounts are **LIVE** and ready for testing. All passwords have been synchronized to a standard test passkey.

**Global Password**: `OceanPearl2026!`

| Role Level | Login Email | Assigned Role | Location / Unit |
| :--- | :--- | :--- | :--- |
| **👑 CEO / Root** | `tariq@oceanpearlseafood.com` | `GLOBAL_ADMIN` | GLOBAL View |
| **🏢 HQ Admin** | `admin_hq_sarah@ops.com` | `HQ_ADMIN` | Jakarta (HQ) |
| **📍 Manager** | `manager_kaimana_budi@ops.com` | `LOC_MANAGER` | Kaimana (Frozen Fish) |
| **👷 Operator** | `op_teri_usi@ops.com` | `UNIT_OP` | Kaimana (Gudang Ikan Teri) |
| **👀 Investor** | `investor_view@ops.com` | `READ_ONLY` | GLOBAL View |

> **Note**: If you prefer to use **Role Switching**, log in as **Tariq** and use the "Operate As" panel in the dashboard header to assume any identity dynamically.

---

## 2. Permissions Matrix (Expected Behavior)
Please verify these constraints during your audit.

### 👷 UNIT_OP (Usi)
*   **Context**: Focused on a single Unit (Gudang Ikan Teri).
*   ✅ **CAN**:
    *   Create Expenses (Status: `DRAFT` or `PENDING_APPROVAL`).
    *   Add New Vendors (Inline).
    *   View Receiving/Stock for their unit.
*   ❌ **CANNOT**:
    *   Approve Expenses.
    *   Delete Approved Expenses.
    *   Switch Locations (Locked to Kaimana).

### 📍 LOC_MANAGER (Budi)
*   **Context**: Oversees entire Location (Kaimana).
*   ✅ **CAN**:
    *   **Approve** / Reject Expenses.
    *   Add New Expense Types.
    *   View Global Dashboard for their Location.
*   ❌ **CANNOT**:
    *   Edit HQ-level settings (Admin Panel restrictions).

### 🏢 HQ_ADMIN / CEO
*   ✅ **CAN**: Do Everything.
*   ✅ **CAN**: Switch Context to any Location.
*   ✅ **CAN**: "View As" any user (Read-Only Mode safety check).

---

## 3. Data Preconditions & State
The Production database is initialized with the following state:

| Data Type | Status | Notes |
| :--- | :--- | :--- |
| **Locations** | 🟢 **Ready** | Jakarta, Kaimana, Saumlaki are configured. |
| **Expenses** | 🟠 **Clean Slate** | The expense ledger is currently **empty**. <br>**Test Step**: Please create the *first* expense as Usi (Unit OP). |
| **Wallets** | 🟢 **Ready** | Site Wallets exist. Transactions may be viewable in "Wallet" page. |
| **Master Data** | 🟢 **Ready** | Basic Vendor/Type lists exist; Inline creation is enabled. |

---

## 4. Safety & Destruction Protocols
*   **Production Safety**: This is a live production environment.
*   **Allowed**: Creating Expenses, Receiving Fish, Standard Operations.
*   **Prohibited**: Deleting "Metadata" (Locations/Users) in the Admin Panel without cause.
*   **Drafts**: Feel free to create unlimited Draft Expenses.
*   **Reset**: If you need a data reset, contact the engineering lead (Antigravity).

---

**Statement of Readiness**:
The system is ready for independent human + technical advisor testing.
Signed,
*Antigravity AI (Dev Lead)*
