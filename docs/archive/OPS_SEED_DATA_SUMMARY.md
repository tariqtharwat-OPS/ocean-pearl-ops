# Ocean Pearl Ops (OPS) - Seed Data Summary

**Seed Date:** 2026-01-12
**Scope:** 7-Day Realistic Operational History

## 1. Inventory & Production Seeding
We have populated the system with a coherent chain of events:

| Day | Event | Details | Financial Impact |
| :--- | :--- | :--- | :--- |
| **Mon (Day -6)** | `PURCHASE_RECEIVE` | 200kg Red Snapper (Whole) @ 40k | -8,000,000 (Wallet) |
| **Mon (Day -6)** | `PURCHASE_RECEIVE` | 500kg YF Tuna (Whole) @ 35k | -17,500,000 (Wallet) |
| **Tue (Day -5)** | `PRODUCTION_RUN` | 100kg Snapper -> 50kg Fillet | Inventory Transformation |
| **Tue (Day -5)** | `PRODUCTION_RUN` | 200kg Tuna -> 100kg Loin | Inventory Transformation |
| **Wed (Day -4)** | `EXPENSE` | Ice & Supplies | -500,000 (Wallet) |
| **Fri (Day -2)** | `SALE_INVOICE` | Sold 50kg Snapper Fillet @ 120k | +6,000,000 (Wallet) |
| **Sat (Day -1)** | `PURCHASE_RECEIVE` | 100kg Raw Anchovy @ 5k | -500,000 (Wallet) |
| **Sun (Today)** | `PRODUCTION_RUN` | Dried 100kg Anchovy -> 40kg Dried | Inventory Transformation |

## 2. Current Snapshots (Resulting State)

### Inventory
*   **Kaimana (Frozen Fish):**
    *   Red Snapper (Whole): **100 kg** (Remainder)
    *   YF Tuna (Whole): **300 kg** (Remainder)
    *   YF Tuna Loin: **100 kg** (Produced)
    *   Red Snapper Fillet: **0 kg** (Sold)
*   **Kaimana (Gudang Teri):**
    *   Anchovy (Raw): **0 kg** (Processed)
    *   Anchovy (Dried): **40 kg** (Produced)

### Wallet Positions (Estimated)
*   **Kaimana:** Starting Balance + Inflows - Outflows
    *   -8M (Snapper)
    *   -17.5M (Tuna)
    *   -0.5M (Expense)
    *   -0.5M (Anchovy)
    *   **Net Change: -26.5M**
*   **Jakarta (HQ):**
    *   +6M (Sales)
    *   **Net Change: +6M**

## 3. Usage
This data supports:
*   **Reporting:** Sales vs Expenses graphs.
*   **Shark AI:** Answers to "How much Tuna do we have?" (300kg Whole + 100kg Loin).
*   **Traceability:** Batch `BATCH-KD-001` traces back to the Monday purchase.
