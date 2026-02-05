# OPS V2 – FINAL BLUEPRINT
Path: D:/OPS/OPS_V2_FINAL_BLUEPRINT.md
Status: LOCKED – Execution Reference
Owner: Ocean Pearl
Execution Agent: Antigravity
Last Updated: 2026-02-05

---

## 1. PURPOSE & NON-NEGOTIABLE PRINCIPLES

### Purpose
Build a real-world seafood operations system that replaces Excel + WhatsApp without losing:
- money
- control
- traceability
- auditability

Target markets:
- Primary: US, China
- Secondary: Gulf
- Future-ready: EU

### Non-Negotiables
1. Ledger-first (all balances derive from transactions)
2. Unit-centric (every action scoped to locationId + unitId)
3. No fake success (UI success only after backend commit)
4. No legacy carry-over (full clean rebuild)
5. Traceability mandatory (trace-back & trace-forward Day 1)
6. Human-operable (works in bad internet, bad days)
7. Idempotency on all writes
8. Attachments as evidence where applicable

---

## 2. LOCATIONS & UNITS

### Jakarta
- Unit: Headquarters (OFFICE)
- Unit: Cold Storage
- (Future: Factory / Sales units allowed)

### Surabaya
- Unit: Warehouse / Cold Storage
- Sales Delivery allowed
- Invoicing handled by Jakarta OFFICE

### Kaimana
- Unit: Freezing & Processing Plant #1 (FACTORY)
- Unit: Anchovy Drying Unit (DRYING_FACTORY)
- Unit: Freezing & Processing Plant #2 (FACTORY)
- Unit: Fish Meal Plant (FISH_MEAL_PLANT – independent)
- Units: 3 Shipping Boats (TRANSPORT_BOAT)
- Units: 20 Fishing Boats (FISHING_BOAT)
- Units: 13 Collector Boats (COLLECTOR_BOAT)

### Saumlaki
- Unit: Processing + Freezing Plant (FACTORY)
- (Future boats allowed)

---

## 3. UNIT TYPES (DEFINITIVE)

- OFFICE
- COLD_STORAGE
- WAREHOUSE
- FACTORY
- DRYING_FACTORY
- FISHING_BOAT
- COLLECTOR_BOAT
- TRANSPORT_BOAT
- FISH_MEAL_PLANT

Each UnitType defines:
- allowed screens
- validations
- ledger impact
- traceability requirements

---

## 4. WALLET & MONEY MODEL

### Wallet Types
- HQ Wallet (Jakarta OFFICE)
- Unit Wallet (each unit has its own)

Wallets are virtual.
No manual balance edits.
Balances derive from ledger only.

### Bank Handling (V1)
- No real bank balance tracking
- Use BANK_CLEARING as counterparty
- All bank transfers require receipt upload

### Allowed Transactions
1. Bank → HQ Wallet (funding by CEO/HQ_ADMIN)
2. HQ Wallet → Unit Wallet (funding)
3. Unit Wallet → Bank (expenses, purchases)
4. HQ Wallet → Bank (paying vendors on behalf of units)
5. Unit Wallet → HQ Wallet (settlements)
6. Customer Payment → HQ Wallet (linked to sale/invoice)

Each transaction may specify:
- beneficiaryUnitId (cost center)

---

## 5. BOATS & FISHER LEDGER

### Boat Intake
- Type: Catch or Purchase
- Always enters RAW material
- Optional valuation on boat
- Mandatory valuation at factory receiving

### Fisher Ledger
- Each catch creates Fisher/Crew liability
- Payments reduce liability
- Balances tracked per boat and per fisher

### Boat OPEX
- Diesel
- Oil
- Maintenance
- Salaries
- Port fees

All recorded as expenses from Boat Wallet.

---

## 6. FACTORY & PRODUCTION

### Receiving
- Source: Boat / Supplier / Transfer
- Mandatory valuation
- Creates Inventory Lots

### Production Run
- Input lots (FIFO default)
- Multi-output allowed
- Waste / Reject tracked separately
- Yield calculated automatically

### Waste / Reject
- Categories include:
  - Mix (weighted, priced)
- Waste is sellable
- Transfer to Fish Meal Plant is SALE, not internal transfer

---

## 7. FISH MEAL PLANT (INDEPENDENT)

### Independence Rules
- Own wallet
- Own inventory
- Own P&L
- No internal transfers

### Inputs
- Purchase raw fish (e.g. sardine, tuna)
- Purchase waste/reject from Ocean Pearl factories

### Composition Logic
- Batch may contain multiple input types
- System tracks % composition by weight
- Composition editable within allowed window (audit logged)

### Outputs
- Fish meal
- Fish oil
- Loss / moisture

---

## 8. SALES & SHIPMENTS

### Sales Delivery
- Allowed from Jakarta & Surabaya
- Stock deducted on delivery

### Invoicing
- Performed by Jakarta OFFICE
- Creates AR

### Shipments
- Link containers, seals, lots
- Attach documents
- Export-ready

---

## 9. TRACEABILITY MODEL (DAY 1)

### Critical Tracking Events (CTEs)
- Catch
- Purchase
- Receiving
- Transform (processing, freezing, drying)
- Store
- Ship
- Sell

### Lot Genealogy
- Every lot has origin
- Every transform links inputLots → outputLots
- Every shipment links lots

### HQ Dashboard
- Trace-back: customer/shipment → boats/suppliers
- Trace-forward: boat/supplier → customers

---

## 10. ROLES & PERMISSIONS

- UNIT_OP: operate within assigned unit
- LOC_MANAGER: approve, view unit wallet & reports
- HQ_FINANCE: AR/AP, wallets, reports
- HQ_ADMIN: users, master data, reports
- CEO: full access
- INVESTOR: read-only, scoped

---

## 11. SHARK RULES (DAY 1)

Shark generates alerts for:
- Missing attachments
- Abnormal yield
- Large cash movements
- Overselling stock
- Missing traceability
- Repeated small payments to same vendor

Shark does NOT mutate data.

---

## 12. ACCEPTANCE TESTS (BLOCKING)

- T1: Receiving creates lot + ledger
- T2: Wallet balance reconciles
- T3: Production consumes & produces correctly
- T4: Waste sale to Fish Meal works
- T5: Fisher balances reconcile
- T6: Sales delivery deducts stock
- T7: Invoice creates AR
- T8: Customer payment settles AR
- T9: Trace-back works
- T10: Trace-forward works
- T11: No fake success
- T12: Idempotency confirmed

All tests = PASS or FAIL only.

---

## 13. CHANGE LOG (MANDATORY)

Antigravity must log:
- Date
- What changed
- Why
- Impact

No undocumented changes allowed.

---

### 2026-02-06 | Phase 0 – Full Clean Reset

**What Changed**:
- Tagged existing state as `v2-pre-final-wipe`
- Created new branch `v2-final-rebuild`
- Deleted ALL legacy code (frontend, backend, functions, tests, scripts)
- Kept only: `OPS_V2_FINAL_BLUEPRINT.md`, `.gitignore`, `.git/`

**Why**:
- Previous implementation (`v2-clean-implementation`) violated fundamental architecture principles
- Full wipe mandated to prevent legacy contamination
- Clean slate required for ledger-first, function-only, traceability-first rebuild

**Impact**:
- No legacy code can be reused
- All implementation follows Blueprint strictly
- Never-Again Guards enforced from Day 1

**Commit**: `99784b1`

---

### 2026-02-06 | Phase 0.5 – Failure Autopsy

**What Changed**:
- Created `OPS_V2_FAILURE_AUTOPSY.md`
- Documented 10 failure categories from previous implementation
- Defined 10 Never-Again Guards for enforcement

**Why**:
- Learn from past mistakes: fake success, mock architecture, missing ledger, no traceability
- Establish permanent guard rails for v2-final-rebuild
- Prevent repeating UI-first, optimistic-update, client-write patterns

**Impact**:
- Every Phase 1-6 decision must reference Guards
- Violations = immediate rejection
- Autopsy serves as permanent reference for "what NOT to do"

**Commit**: `4587202`

---

### 2026-02-06 | Phase 1 – Core Data Model (COMPLETE)

**What Changed**:
- ✅ Firebase project structure (TypeScript, Functions v2, Node 20)
- ✅ 10 canonical Firestore collections:
  - Critical: `ledger_entries`, `inventory_lots`, `invoices`, `payments`, `trace_links`, `attachments`
  - Reference: `locations`, `units`, `users`, `master_data`
- ✅ TypeScript types + Zod validation schemas (double-entry enforcement)
- ✅ Firestore security rules (function-only writes, scoped reads)
- ✅ Idempotent seed script (4 locations, 37 units, 6 users, master data)
- ✅ `docs/DATA_MODEL.md` (comprehensive documentation)

**Why**:
- Ledger-first architecture (Guard #2): No balance fields, all derived from ledger
- Traceability-first (Guard #4): Lot genealogy, trace_links for queries
- Function-only writes (Guard #5): Client cannot mutate critical data
- Idempotency-first (Guard #3): `operationId` prevents duplicates
- Backend-first (Guard #1): No UI, data model before features

**Impact**:
- Production-ready schema that enforces double-entry accounting
- 36 boats seeded in Kaimana (20 fishing, 13 collector, 3 transport)
- Fish Meal Plant (`kaimana-fishmeal`) ready for independence (Guard #10)
- Role-based access: CEO, HQ_ADMIN, HQ_FINANCE, LOC_MANAGER, UNIT_OP, INVESTOR
- Security rules prevent fake success (Guard #6)

**Design Gaps Identified** (non-blocking):
1. Wallet config collection - not needed (virtual wallets sufficient)
2. Fisher ledger - covered by ledger_entries (no separate collection needed)
3. Composite indexes - empty (will populate in Phase 2 when queries run)
4. Attachment storage - Phase 2 deliverable (Cloud Storage + upload function)

**Acceptance Criteria**:
- ✅ Collections exist (10 canonical)
- ✅ Rules block client writes (critical collections)
- ✅ Seed idempotent (re-run safe)
- ✅ Scoped reads (HQ all, Unit scoped, Investor read-only)
- ✅ Zod validation (all critical schemas)

**Commits**: 
- Implementation: `8825bd9`
- Report: `e34f8b4`

**Remaining**: Phase 2 (Cloud Functions), Phase 3 (Wallet flows), Phase 4 (Traceability queries), Phase 5 (Minimal UI), Phase 6 (Acceptance Tests T1-T12)

---
END OF FILE
