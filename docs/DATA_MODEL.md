# OPS V2 - Data Model Documentation
**Phase 1: Core Data Model**  
**Created**: 2026-02-06  
**Status**: Canonical Reference

---

## Overview

This document defines the complete Firestore data model for Ocean Pearl OPS V2. All collections follow **ledger-first**, **lot-based**, and **traceability-first** principles.

---

## Collections Architecture

### **Critical Collections** (Function-Only Writes)

These collections enforce **Guard #5: FUNCTION-ONLY WRITES**. Client applications CANNOT write directly to these collections.

1. **`ledger_entries`** - Double-entry accounting ledger
2. **`inventory_lots`** - Lot-based inventory with genealogy
3. **`invoices`** - Accounts receivable/payable
4. **`payments`** - Payment records
5. **`trace_links`** - Denormalized genealogy for fast queries
6. **`attachments`** - File metadata (files stored in Cloud Storage)

### **Reference Collections** (Admin-Managed)

7. **`locations`** - Jakarta, Surabaya, Kaimana, Saumlaki
8. **`units`** - 36 units (boats, factories, warehouses, offices)
9. **`users`** - Role-based user documents
10. **`master_data`** - Products, species, expense types, partners, settings

---

## Collection Schemas

### 1. `ledger_entries/{entryId}`

**Purpose**: Double-entry accounting ledger. ALL financial and inventory movements create ledger entries.

**Key Principle**: **Guard #2 - LEDGER-FIRST**. All balances are derived from ledger aggregation, never stored.

```typescript
{
  id: string;                      // Auto-generated
  timestamp: Timestamp;            
  locationId: string;              // Where operation occurred
  unitId: string;                  // Unit performing operation
  actorUserId: string;             // Who initiated
  operationType: OperationType;    // RECEIVE | PRODUCE | TRANSFER | SALE | etc.
  operationId: string;             // ⭐ IDEMPOTENCY KEY (Guard #3)
  
  lines: [                         // Double-entry lines
    {
      account: string;             // e.g., "INVENTORY", "CASH", "AR", "EXPENSE"
      direction: "DEBIT" | "CREDIT";
      amountIdr: number;           
      quantityKg?: number;         // For inventory lines
      lotId?: string;              // Links to inventory_lots
      partnerId?: string;          // Customer/vendor/fisher
      beneficiaryUnitId?: string;  // Cost center allocation
    }
  ];
  
  links: {
    inputLotIds: string[];         // ⭐ Guard #4: Traceability
    outputLotIds: string[];        
    invoiceId?: string;
    attachmentIds: string[];
  };
  
  notes?: string;
  createdAt: Timestamp;
}
```

**Validation Rules**:
- ✅ `sum(DEBIT amounts) === sum(CREDIT amounts)` (enforced by Zod schema)
- ✅ `operationId` must be unique (prevents duplicates on retry)
- ✅ At least 2 lines required

**Example - Receiving Raw Fish from Boat**:
```typescript
{
  operationType: "RECEIVE",
  operationId: "uuid-12345",
  lines: [
    { account: "INVENTORY", direction: "DEBIT", amountIdr: 10000000, quantityKg: 500, lotId: "lot-001" },
    { account: "FISHER_PAYABLE", direction: "CREDIT", amountIdr: 10000000, partnerId: "fisher-123" }
  ],
  links: {
    outputLotIds: ["lot-001"],
    attachmentIds: ["photo-catch-001"]
  }
}
```

---

### 2. `inventory_lots/{lotId}`

**Purpose**: Lot-based inventory tracking with full genealogy.

**Key Principle**: **Guard #4 - TRACEABILITY-FIRST**. Every lot tracks its origin and can trace back to boats/suppliers.

```typescript
{
  id: string;
  locationId: string;
  unitId: string;
  itemId: string;               // References master_data/items
  grade?: string;               // A, B, C, etc.
  status: LotStatus;            // RAW | FROZEN | FINISHED | REJECT_SELLABLE | WASTE
  quantityKgRemaining: number;  // Current remaining quantity
  uom: "KG";                    // Always KG
  
  origin: {
    sourceType: "CATCH" | "PURCHASE" | "TRANSFER" | "PRODUCTION";
    sourceRefId: string;        // ID of source ledger entry
    boatId?: string;            // If CATCH
    supplierId?: string;        // If PURCHASE
  };
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**Genealogy Flow**:
```
CATCH (Boat) → RAW Lot
  ↓ PRODUCTION
  FROZEN Lot + REJECT_SELLABLE Lot (Waste)
    ↓ TRANSFER (Waste to Fish Meal Plant)
    ↓ PURCHASE (Fish Meal Plant buys waste)
    Fish Meal Plant Lot → PRODUCTION → Fish Meal + Fish Oil
```

---

### 3. `invoices/{invoiceId}`

**Purpose**: Accounts receivable (AR) and accounts payable (AP).

```typescript
{
  id: string;
  type: "AR" | "AP";
  status: "OPEN" | "PAID" | "VOID";
  locationId: string;
  unitId: string;               // Beneficiary unit
  partnerId: string;            // Customer (AR) or Vendor (AP)
  currency: string;             // Default: "IDR"
  totalAmountIdr: number;
  linkedDeliveryRefId?: string; // Links to delivery/shipment
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**Usage**:
- Sales delivery → Creates AR invoice
- Purchase from supplier → Creates AP invoice
- Fish Meal Plant purchases waste → Creates AR for Ocean Pearl, AP for Fish Meal Plant

---

### 4. `payments/{paymentId}`

**Purpose**: Payment records (customer payments, vendor payments, fisher payments).

```typescript
{
  id: string;
  invoiceId?: string;           // Links to invoice (if paying invoice)
  amountIdr: number;
  method: string;               // "BANK_TRANSFER", "CASH", "CHECK"
  attachmentIds: string[];      // Receipt uploads
  createdAt: Timestamp;
}
```

---

### 5. `trace_links/{linkId}`

**Purpose**: Denormalized edges for fast trace-back/trace-forward queries.

**Key Principle**: **Guard #4 - TRACEABILITY-FIRST**. Enables compliance queries.

```typescript
{
  id: string;
  fromLotId: string;            // Parent lot
  toLotId: string;              // Child lot
  eventId: string;              // References ledger_entries
  type: "TRANSFORM" | "TRANSFER" | "SHIP" | "SELL";
  createdAt: Timestamp;
}
```

**Query Examples**:
- **Trace-back**: Given `shipment-lot-456`, find all source boats
  - Query: `trace_links WHERE toLotId == "shipment-lot-456"` (recursive)
- **Trace-forward**: Given `boat-catch-123`, find all customers
  - Query: `trace_links WHERE fromLotId == "boat-catch-123"` (recursive)

---

### 6. `locations/{locationId}`

**Purpose**: Physical locations (4 total).

```typescript
{
  id: string;                   // jakarta | surabaya | kaimana | saumlaki
  name: string;
  isActive: boolean;
  createdAt: Timestamp;
}
```

---

### 7. `units/{unitId}`

**Purpose**: Operational units (36 total).

**Key Principle**: **Blueprint Section 2 & 3** defines exact unit structure.

```typescript
{
  id: string;
  locationId: string;
  unitType: UnitType;           // OFFICE | FACTORY | FISHING_BOAT | etc.
  name: string;
  isActive: boolean;
  createdAt: Timestamp;
}
```

**Unit Breakdown**:
- Jakarta: 2 units (HQ OFFICE, Cold Storage)
- Surabaya: 1 unit (Warehouse)
- Kaimana: 33 units (2 Factories, 1 Drying Factory, 1 Fish Meal Plant, 3 Transport Boats, 20 Fishing Boats, 13 Collector Boats)
- Saumlaki: 1 unit (Factory)

**Total**: 37 units (36 + HQ)

---

### 8. `users/{uid}`

**Purpose**: Role-based user documents.

**Key Principle**: Role scoping for **Guard #7 - Firestore Rules**.

```typescript
{
  uid: string;
  role: UserRole;               // UNIT_OP | LOC_MANAGER | HQ_FINANCE | HQ_ADMIN | CEO | INVESTOR
  allowedLocationIds: string[]; // Empty = all (for CEO/HQ roles)
  allowedUnitIds: string[];     // Empty = all in allowed locations
  isActive: boolean;
  displayName?: string;
  email?: string;
  createdAt: Timestamp;
}
```

**Role Access Matrix**:
| Role | Scope | Ledger Read | Ledger Write | Admin |
|------|-------|-------------|--------------|-------|
| CEO | All | ✅ | via Functions | ✅ |
| HQ_ADMIN | All | ✅ | via Functions | ✅ |
| HQ_FINANCE | All | ✅ | via Functions | ❌ |
| LOC_MANAGER | Specific locations | ✅ Scoped | via Functions | ❌ |
| UNIT_OP | Specific units | ✅ Scoped | via Functions | ❌ |
| INVESTOR | Read-only scoped | ✅ Scoped | ❌ Never | ❌ |

---

### 9. `master_data/{docId}`

**Purpose**: Master data (products, species, vendors, settings).

**Structure**: Single collection with multiple documents.

```typescript
// master_data/species
{
  items: [
    { id: "sardine", name: "Sardine", category: "FISH", isActive: true },
    { id: "mixed-pelagic", name: "Mixed Small Pelagic", category: "FISH", isActive: true },
    // ...
  ]
}

// master_data/items
{
  items: [
    { id: "sardine-raw", name: "Sardine (RAW)", category: "RAW", isActive: true },
    { id: "fish-meal", name: "Fish Meal", category: "FINISHED", isActive: true },
    // ...
  ]
}

// master_data/expense_types
{
  items: [
    { id: "diesel", name: "Diesel", category: "OPEX", isActive: true },
    { id: "ice", name: "Ice", category: "OPEX", isActive: true },
    // ...
  ]
}

// master_data/partners
{
  items: [
    { id: "customer1", name: "Customer 1", type: "CUSTOMER", isActive: true },
    { id: "fisher1", name: "Fisher Crew #1", type: "FISHER", isActive: true },
    // ...
  ]
}

// master_data/settings
{
  currency: "IDR",
  timezone: "Asia/Jakarta",
  fiscalYearStart: "2026-01-01"
}
```

---

## Wallet Architecture (Virtual)

**CRITICAL**: There is **NO `wallets` collection with balance fields**.

**Guard #2: LEDGER-FIRST** - Wallets are **virtual**. Balances are derived from ledger queries.

### How to Calculate Wallet Balance:

```typescript
// Pseudo-code for HQ Wallet balance
const hqWalletBalance = await db.collection('ledger_entries')
  .where('unitId', '==', 'jakarta-hq')
  .get()
  .then(snapshot => {
    let balance = 0;
    snapshot.forEach(entry => {
      entry.data().lines.forEach(line => {
        if (line.account === 'CASH') {
          balance += line.direction === 'DEBIT' ? line.amountIdr : -line.amountIdr;
        }
      });
    });
    return balance;
  });
```

### Wallet Types:
1. **HQ Wallet** (jakarta-hq unit)
   - All funding from bank
   - Transfers to unit wallets
   - Payments on behalf of units

2. **Unit Wallets** (each unit has virtual wallet)
   - Receives funding from HQ
   - Makes expenses
   - Settlements back to HQ

3. **BANK_CLEARING** (counterparty, not a real wallet)
   - Used for bank transfers
   - Balances bank in/out flows

---

## Fish Meal Plant Independence

**Guard #10: FISH MEAL INDEPENDENCE**

The Fish Meal Plant (`kaimana-fishmeal`) is an **independent business**, not an internal Ocean Pearl unit for accounting purposes.

### Waste Transfer Flow:
```
1. Ocean Pearl Factory produces waste (REJECT_SELLABLE lot)
2. Fish Meal Plant PURCHASES waste:
   - Creates AP invoice for Fish Meal Plant
   - Creates AR invoice for Ocean Pearl
   - SALE ledger entry (not internal transfer)
3. Fish Meal Plant processes:
   - Input: Waste lots (purchased)
   - Output: Fish Meal + Fish Oil
4. Fish Meal Plant has separate P&L
```

**Composition Tracking**:
- Fish Meal Plant batches track % composition by weight
- Example: Batch #1 = 60% Sardine waste + 30% Tuna scraps + 10% Mixed
- Composition editable within allowed window (audit logged)

---

## Traceability Compliance

**Acceptance Tests T9 & T10** - Trace-back and Trace-forward must work from Day 1.

### Use Cases:

**US FDA Compliance**:
- Customer reports issue with shipment
- Trace back: Shipment → Lots → Production runs → Raw lots → Boats

**China GACC Compliance**:
- Prove product origin for export certificate
- Trace back: Export lot → Factory → Receiving → Boat catch records

**Internal Audit**:
- Track waste flow: Waste lot → Fish Meal Plant purchase → Fish Meal output

---

## Idempotency Strategy

**Guard #3: IDEMPOTENCY-FIRST**

Every operation that creates ledger entries MUST include an `operationId` (client-generated UUID).

### Implementation:
```typescript
// Cloud Function pseudo-code
async function handleReceiving(data) {
  const { operationId } = data;
  
  // Check if already processed
  const existing = await db.collection('ledger_entries')
    .where('operationId', '==', operationId)
    .limit(1)
    .get();
  
  if (!existing.empty) {
    // Already processed - return existing result
    return { success: true, entryId: existing.docs[0].id };
  }
  
  // Process new operation
  // ...
}
```

**Result**: Retry same operation → same result, no duplicates.

---

## Security Rules Summary

**Firestore Rules** (defined in `firestore.rules`):

1. ❌ **Deny all client writes** to:
   - `ledger_entries`
   - `inventory_lots`
   - `invoices`
   - `payments`
   - `trace_links`
   - `attachments`

2. ✅ **Allow scoped reads**:
   - HQ roles: read all
   - Location/Unit roles: read allowed locations/units
   - Investor: read-only scoped

3. ✅ **Allow admin writes** to:
   - `locations`, `units`, `users`, `master_data` (CEO/HQ_ADMIN only)

---

## Phase 1 Deliverables

✅ **Collections**: All 10 canonical collections defined  
✅ **Types**: TypeScript interfaces + Zod validation schemas  
✅ **Rules**: Function-only write enforcement + scoped reads  
✅ **Seed**: Idempotent script with 4 locations, 36 units, 6 users, master data  
✅ **Documentation**: This file

---

**Next Phase**: Phase 2 - Backend Integrity (Cloud Functions)

- Implement receiving handler
- Implement production handler
- Implement transfer handler
- Implement sales handler
- Implement wallet transaction handler
- All with idempotency, validation, and traceability
