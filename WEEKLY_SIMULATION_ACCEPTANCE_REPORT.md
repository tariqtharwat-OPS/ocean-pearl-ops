# WEEKLY_SIMULATION_ACCEPTANCE_REPORT.md

## 1) Git Reference
- **Branch**: `v2-clean-implementation`
- **HEAD Commit**: `7a01124004fe242258a856c770d97dac0af3ea70`

## 2) Code Proof
The following files implement the standardized operational write path:

- `functions/transaction_engine.js`
  - **Entry Function**: `handleTransactionInternal`
  - **Handled Types**: `PURCHASE_RECEIVE`, `COLD_STORAGE_IN`, `EXPENSE`, `SALE_INVOICE`, `LOCAL_SALE`, `CASH_TRANSFER`, `TRANSPORT`
- `functions/index.js`
  - **Wrapper**: `onCall` export `postTransaction` -> calls `handleTransactionInternal`
- `functions/simulate_week.js`
  - **Simulation**: `onRequest` export `simulateWeek` -> calls `handleTransactionInternal` (via system auth bypass)

## 3) Firestore Proof (Operational History)

| Doc Path | Type | Timestamp | Locations/Units | Details |
| :--- | :--- | :--- | :--- | :--- |
| `transactions/yYCZVVQ7SNmugle7qS2X` | `PURCHASE_RECEIVE` | 2026-02-02T... | `kaimana` / `gudang_ikan_teri` | 500kg @ 10,000 (5,000,000) |
| `transactions/YG1BrpN8H7u7xWV2uwkK` | `COLD_STORAGE_IN` | 2026-02-02T... | `kaimana` / `gudang_ikan_teri` | 150kg Yield (500kg Raw) |
| `transactions/mQ5CLzv6iqxRXyb9dQEI` | `TRANSPORT` | 2026-02-02T... | `kaimana/gudang` -> `jakarta/office` | 150kg (Freight: 500,000) |
| `transactions/BnxML7eG6yYMh80az03H` | `EXPENSE` | 2026-02-02T... | `kaimana` / `gudang_ikan_teri` | 250,000 (Electricity) |
| `transactions/qWEMuZQa6PJUG4S6a4v2` | `LOCAL_SALE` | 2026-02-02T... | `jakarta` / `office` | 50kg @ 150,000 (7,500,000) |
| `transactions/cWJO6my714jWDPzwK0mM` | `CASH_TRANSFER` | 2026-02-02T... | `HQ` -> `kaimana` | 10,000,000 Transfer |

## 4) Stock & Wallet Reconciliation

| Document | Before (Day 0) | After (Day 7) | Delta | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Kaimana Stock** (COLD_teri_grade_a_NA) | 0 kg | **0 kg** | +150 (PRD) - 150 (TRN) | **MATCH** |
| **Jakarta Stock** (COLD_teri_grade_a_NA) | 0 kg | **100 kg** | +150 (TRN) - 50 (SLD) | **MATCH** |
| **Kaimana Wallet** (`kaimana_gudang_ikan_teri`) | 50,000,000 | **54,250,000** | -5M (RCV) - 500k (TRN) - 250k (EXP) + 10M (TXF) | **MATCH** |
| **Jakarta Wallet** (`jakarta_office`) | 0 | **7,500,000** | +7.5M (SLD) | **MATCH** |

## 5) Transport Correctness Proof (mQ5CLzv6iqxRXyb9dQEI)
- **Source Impact**: `kaimana/gudang_ikan_teri` stock decreased by exactly 150kg.
- **Destination Impact**: `jakarta/office` stock increased by exactly 150kg.
- **Freight Logic**: Wallet `kaimana_gudang_ikan_teri` was debited 500,000 once.
- **Idempotency**:
  - Secured via `db.runTransaction` block in `transaction_engine.js`.
  - Serial number generation (`TRN-KAI-26-0001`) prevents secondary writes.
  - Finalized state check on the transaction document.

## 6) Final Verdict
**PASS (reconciled)**
