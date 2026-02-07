# Phase 5: Period Control & Settlement - Invariants

## Invariant 1: Time Travel Immutable
**Definition**: Any data operation (Ledger or Sub-Ledger) with a `timestamp` falling within or before a CLOSED ledger period MUST be rejected.
**Implementation**: `assertPeriodWritable(db, timestamp)` in all core handlers.
**Status**: Validated by T9 (Write Block).

## Invariant 2: Settlement Integrity
**Definition**:
1. AR Settlement MUST debit a cash-equivalent account and credit `INVOICE_AR`.
2. Fisher Payment MUST debit `FISHER_LIABILITY` and credit a cash-equivalent account.
**Status**: Validated by T10, T11. Ledger balancing enforced by `LedgerEntrySchema`.

## Invariant 3: P&L Periodicity
**Definition**: P&L items (Revenue/Expense) MUST reflect activity strictly within the declared period start and end dates.
**Status**: Validated by `generateTrialBalance` filtering logic in `reports.ts`.

## Invariant 4: Inventory Valuation Scope
**Definition**: Inventory Valuation checks can ONLY be performed against the *current* state unless historical snapshotting is implemented (Future Scope).
**Status**: Implemented warning in `reports.ts` for historical period queries.
