# DEPRECATED — Do not use. Refer to SYSTEM_CANONICAL_STATE.md

# This database structure is designed to be highly scalable, supporting multiple locations and units with strict data isolation and real-time syncing.

## Core Hierarchy
**Root**
├── `locations/{locationId}` (e.g., kaimana, saumlaki)
│   ├── `units/{unitId}` (e.g., gudang_teri, frozen_factory)
│   │   ├── `inventory` (Real-time stock levels)
│   │   ├── `wallet` (Cash balances)
│   │   └── `transactions` (Ledger of all movements)
│   └── `config` (Location-specific settings)
├── `users` (Global user usage)
├── `partners` (Global suppliers/buyers)
└── `catalog` (Global product definitions)

---

## 1. Locations & Units (Static Configuration)
Though stored in code (`constants.js`), the data reflects in the DB structure.
*   **Location:** Broad geographic region (e.g., Kaimana).
*   **Unit (Site):** Specific physical facility (e.g., Gudang Ikan Teri).
*   **Rule:** Transactions NEVER occur at the Location level. They MUST be scoped to a Unit.

## 2. Inventory (Real-Time Stock)
Path: `locations/{locationId}/units/{unitId}/stock/{itemId}`
```json
{
  "id": "RAW_Tuna_Yellowfin",
  "itemId": "tuna_yellowfin",
  "type": "raw_material",
  "name": "Yellowfin Tuna",
  "quantityKg": 1500.50,
  "averageCost": 35000,
  "lastUpdated": "2026-01-05T12:00:00Z"
}
```

## 3. Financial Wallet (Site Cash)
Path: `locations/{locationId}/units/{unitId}/wallet/main`
```json
{
  "balance": 50000000,
  "currency": "IDR",
  "lastTransactionId": "TX-123",
  "updatedAt": "TIMESTAM P"
}
```

## 4. Transactions (The Ledger)
Path: `transactions/{transactionId}`
*Note: We store a global collection for easy querying but enforce `locationId` and `unitId` fields.*
```json
{
  "id": "RCV-20260105-ABCDE",
  "type": "PURCHASE_RECEIVE", // or EXPENSE, PRODUCTION_IN, SALES
  "locationId": "kaimana",
  "unitId": "gudang_teri",     // CRITICAL: The Site
  "supplierId": "sup_01",      // Link to partners
  "itemId": "tuna_yellowfin",
  "quantityKg": 50.5,
  "pricePerKg": 35000,
  "amount": 1767500,
  "timestamp": "2026-01-05T12:30:00Z",
  "user": "admin_kaimana"
}
```

## 5. Partners (Suppliers/Buyers)
Path: `partners/{partnerId}`
```json
{
  "name": "Pak Budi",
  "type": "supplier", // or buy_agent
  "locationId": "kaimana", // Primary region
  "phone": "+62812..."
}
```

## 6. Users (Auth Profile)
Path: `users/{uid}`
```json
{
  "email": "admin_kaimana@ops.com",
  "role": "manager",
  "locationId": "kaimana",  // String
  "unitId": "gudang_teri",  // String (Default View)
  "name": "Kaimana Manager"
}
```
