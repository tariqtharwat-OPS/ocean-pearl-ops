# Phase 4 Invariants

The following invariants are strictly enforced in Phase 4:

## 1. Cost Basis Tracking
**Invariant:** Every Inventory Lot must have `costPerKgIdr` and `costTotalIdr` fields.
- **Reference:** `functions/src/types.ts`
- **Logic:** `InventoryLotSchema` updated to include these as required fields (Defaults allowed for migration, but enforced logic in handlers).

## 2. Partial Consumption Updates
**Invariant:** When a lot is partially consumed (Production or Transfer), `costTotalIdr` must reduce proportionally.
- **Reference:** `functions/handlers/transferHandler.ts`
- **Logic:** `transaction.update(srcRef, { costTotalIdr: srcData.costTotalIdr - transferCost })`.

## 3. Production Shrinkage Policy
**Invariant:** Shrinkage Loss (Input Mass > Output Mass) must be posted as `EXPENSE_PRODUCTION_LOSS` and removed from Allocatable Cost.
- **Reference:** `functions/handlers/productionHandler.ts`
- **Logic:** `const shrinkCost = missingKg * weightedAvgCostPerKg;` -> `ledgerLines.push({ account: 'EXPENSE_PRODUCTION_LOSS' ... })`.
- **Result:** Unit Cost of outputs remains consistent with Weighted Avg Input Cost.

## 4. COGS Posting
**Invariant:** Every Sale (Finished or Waste) MUST post COGS to Ledger (Debit Expense, Credit Inventory).
- **Reference:** `functions/handlers/salesHandler.ts`, `wasteSaleHandler.ts`.
- **Logic:** Ledger Entry includes `EXPENSE_COGS` line equal to `qtySold * lotCostPerKg`.

## 5. Inventory Valuation Reconciliation
**Invariant:** The sum of all Physical Inventory Lot Values (`costTotalIdr`) MUST match the Financial Ledger Balance for Inventory Asset Accounts.
- **Reference:** `functions/src/reports.ts`
- **Check:** `checkInventoryValuation` compares `Sum(Lots)` vs `Sum(INVENTORY_*)`.
- **Strictness:** `process.exit(1)` if diff > Tolerance.

## 6. Master Data Guards
**Invariant:** Transactions must fail if Location/Unit IDs are invalid or if Unit does not belong to Location.
- **Reference:** All Handlers (e.g., `receivingHandler.ts` start of transaction).
- **Check:** `if (!unitDoc.exists) throw ...`

