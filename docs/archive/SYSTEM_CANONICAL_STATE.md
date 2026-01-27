# Ocean Pearl Ops System - Canonical State (V2)

**Status:** CANONICAL / FROZEN
**Effective Date:** January 2026
**AI Identity:** Shark AI (Sole System Intelligence)

---

## 🛑 LEGACY FREEZE NOTICE
The following concepts are explicitly **DEPRECATED** and must not be used:
- **Samudra AI**: Replaced by Shark AI.
- **Watchdog**: Replaced by Shark AI Insights/Analysis.
- **V1 Dashboards**: Legacy views (`DashboardV1.jsx`) are frozen.

---

## 1. System Roles & Identity

The system uses a strict **Scope-Based Permission System**.

| Role Name | Scope | Description |
| :--- | :--- | :--- |
| **UNIT_OP** | Single Unit | Operational staff (Receiving, Processing). Cannot spend money. |
| **LOC_MANAGER** | Single Location | Site Commander. Approves expenses, manages location wallet and inventory. |
| **HQ_ADMIN** | Global | Treasury & System Config. Controls global liquidity and master data. |
| **READ_ONLY** | Scoped | Auditor/Investor. View-only access to Dashboards and Ledgers. |

## 2. Shark AI (System Intelligence)

**Role:** Executive Assistant (Not Autonomous Agent).
**Identity:** "Shark AI"
**Tone:** Helpful, Insightful, Executive-Level, Non-Policing.

### Capabilities:
1.  **Consultation**: Answers operational questions ("What is the stock in Kaimana?").
2.  **Drafting**: Prepares transaction records for human confirmation ("Draft a purchase for 500kg Tuna").
3.  **Analysis**: Insights on anomalies or efficiency (displayed as "Shark AI Insights").

**Constraints:**
- Shark AI **NEVER** writes to the database automatically.
- Shark AI **ALWAYS** requires human confirmation for financial/stock actions.

## 3. Financial Workflow (Zero-Trust V2)

1.  **Expense Request**:
    - `UNIT_OP` requests funds (puts pending request in system).
    - `LOC_MANAGER` reviews and `APPROVES` (deducts from Location Wallet).
2.  **Funding Request**:
    - `LOC_MANAGER` requests wallet top-up.
    - `HQ_ADMIN` reviews and `APPROVES` (Transfers HQ -> Location).

## 4. Unit Types & Capabilities

| Unit Type | Function | Allowed Operations |
| :--- | :--- | :--- |
| **OFFICE** | Admin | Expenses, Reports |
| **PROCESSING_DRY** | Drying | Receive Raw, Process (Batch), Stock |
| **FROZEN_FACTORY** | Freezing | Receive Raw, Process (Yield), Stock |
| **COLD_STORAGE** | Inventory | Receive FG, Audit, Dispatch |

---

**This document represents the absolute truth of the system state. Any code or artifact contradicting this document is considered a bug/drift.**
