# Ocean Pearl Ops V2 — Target Blueprint (Goal-Driven, Implementation-Free)
**This document defines WHAT must be true (outcomes, invariants, acceptance tests).  
It does NOT dictate HOW to implement.**

Audience: Antigravity / any coding agent taking full ownership.

---

## 0) Mission
Deliver a production-grade ops system that replaces Excel + WhatsApp for:
- Admin + finance control
- Accurate inventory and costing
- Supplier/customer/agents accounting (AR/AP/advances/commissions)
- Multi-unit operations (boats, warehouse, factory, cold storage, transport)
- End-to-end traceability (catch/purchase → processing → transport → sale/export)
- Shark AI audit + alerts

**Success means:** real humans can operate daily without silent failures, and data reconciles perfectly.

---

## 1) Core Invariants (Non‑Negotiable)
1) **No fake success:** UI may only show success after server confirms committed writes.
2) **Ledger-first:** Every operational action produces an immutable ledger entry in `transactions`.
3) **Function-only integrity:** Any mutation to:
   - `transactions`
   - unit stock buckets
   - wallets / balances
   is done via Cloud Functions (Admin SDK). Client direct writes are blocked.
4) **Unit-centric reality:** All operations are scoped to `{locationId, unitId}`.
5) **Traceability always:** Every sale/export line can trace back to raw source(s).
6) **Idempotency:** Repeated submits (double-click, retry) must not double-apply.
7) **Security:** Investor-scoped users must not see any transaction lines outside their scope.

---

## 2) Roles & Access (Outcomes)
Roles (`role_v2` authoritative):
- HQ_ADMIN (CEO)
- HQ_FINANCE
- LOC_MANAGER
- UNIT_OP
- INVESTOR

Outcomes:
- HQ_ADMIN can manage users, master data, approvals, reports.
- LOC_MANAGER operates within allowed location(s).
- UNIT_OP operates within allowed unit(s) only.
- INVESTOR sees **all transaction lines** but **only** within assigned scope (global/location/unit).

Investor scope outcomes:
- A unit-scoped investor cannot see transaction IDs outside that unit. No leakage.

---

## 3) Entities / Master Data (Outcomes)
The system must support master data creation/editing via UI:
- Locations (Kaimana, Saumlaki, Jakarta)
- Units (warehouse, factory, cold storage, boats, transport, HQ)
- Items:
  - Raw materials (fish)
  - Finished products
  - Optional by-products
- Grades (A/B/C + NA fallback)
- Partners:
  - Suppliers
  - Customers
  - Purchasing agents
  - Sales agents
  - Logistics providers
  - Investor partners
- Expense types (fuel, ice, packaging, etc.) with inline “add new” support.

**Outcome:** Data entry is “real-world respectful” (clear names, IDs, units KG/IDR) and survives reloads.

---

## 4) Accounting Outcomes (AR/AP/Agents/Investors)
### Customers (AR)
- Credit limit enforced (block if exceed unless HQ override).
- Partial payments supported.
- AR balance always equals sum of unpaid invoices minus receipts.

### Suppliers (AP)
- Purchases can be cash or credit.
- AP balance always equals unpaid supplier invoices/receipts.

### Agents
- Commission per invoice can be either:
  - % of invoice total, or
  - fixed amount per KG (item-specific if needed),
  entered on invoice screens (receiving/sales).
- Agent advances supported:
  - Pay advance
  - Settle/deduct later
- Agent balances and history visible on partner page.

### Investors (scope + share)
- Investors see transaction lines in scope.
- Share mode per scope:
  - % of revenue or % of profit.
- Profit/revenue calculations must be reproducible from ledger and master cost rules.

---

## 5) Operations Outcomes (End-to-End)
### Boat / Fishing
- Catch receiving (by trip optional) and landing transfer into warehouse.
- Boat can be modeled as a Unit; traceability preserved.

### Receiving (Purchase Receive)
- Creates transaction + increases RAW stock.
- Cash purchase decreases unit wallet; credit purchase increases supplier AP.

### Production (multi-output)
- Consumes RAW, produces one-or-many outputs:
  - finished products
  - optional by-products (fish maw / roe / etc.)
  - waste remainder
- If by-product is recorded → becomes sellable stock.
- Yield calculated and stored. Shark flags abnormal yield.

### Transport
- Moves inventory source→dest:
  - decreases source stock bucket
  - increases destination stock bucket
  - applies freight cost once
- Must be idempotent and safe under retries.

### Sales
- Local cash sale increases wallet.
- Invoice sale increases AR (wallet unchanged).
- Commissions for sales agents applied.

### Export / Shipment
- Track minimal shipment fields:
  - container no, seal, incoterms, destination, LC/SKBDN ref, dates.
- Shipment lines reference specific stock/batches to preserve traceability.

---

## 6) Shark AI Outcomes
Shark produces audit notifications for:
- Abnormal yield
- Large cash movement
- Oversell/negative attempts (blocked)
- Suspicious transport patterns / repeated retries
Each alert links to:
- transactionId
- severity
- reason
- timestamps

---

## 7) UI Outcomes (Not Layout-Specific)
Must exist and work:
- Login + role-based routing
- CEO Command Center (fast global view + Shark feed)
- Admin → Users (create/disable users, assign roles + scopes)
- Admin → Master Data (items, partners, locations, units, expense types)
- Treasury / Wallet Manager
- Operational screens:
  - Receiving
  - Production Run
  - Transport
  - Sales
  - Expenses
  - Shipments
- Reports:
  - Ledger
  - Stock balances
  - Wallet balances
  - Yield
  - Transport ledger
  - AR/AP summaries (and by partner)

---

## 8) Acceptance Tests (Step-by-Step, Micro)
**Rule:** Do not move to next test until PASS.

T1) HQ_ADMIN login → Command Center loads, no permission errors  
T2) Admin creates UNIT_OP user for Kaimana unit → new user logs in successfully  
T3) Create supplier + buyer + purchasing agent + sales agent + investor partner  
T4) Receiving (cash) 300kg anchovy → RAW stock +, wallet -  
T5) Production: 300kg input → outputs (A/B) + optional by-product; waste remainder; yield stored  
T6) Transport 100kg Kaimana→Jakarta + freight cost once; retry does not double apply  
T7) Local sale in Jakarta (cash) → wallet +, stock -  
T8) Invoice sale (credit) → AR +, wallet unchanged; add partial payment → AR -, wallet +  
T9) Agent advance pay + settlement; agent commission posted correctly  
T10) Investor (unit-scoped) views only scoped transactions; cannot access outside transaction IDs  
T11) Shipment created + lines from stock; traceability from shipment line back to raw/production  
T12) Shark alerts show for at least 2 triggers (yield + large cash)

---

## 9) Deliverables (What “Done” Means)
- Clean repository structure (no junk, no duplicated legacy paths)
- Stable production deployment (hosting + functions + rules + indexes)
- A single Markdown report:
  - what was built
  - evidence of acceptance tests (txn IDs + before/after)
  - remaining known issues (if any) with severity

