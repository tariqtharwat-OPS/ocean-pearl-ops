# Inventory Tracking Feature - Scope & Implementation Plan

**Status:** 📋 Scoped for Future Implementation  
**Priority:** Medium (Non-blocking for production)  
**Estimated Effort:** 40-60 hours  
**Target Release:** v2.1 (Post-Production)

---

## 1. Feature Overview

The Inventory Tracking system will provide real-time visibility into stock levels across all locations and units. This feature will track raw materials (fish), processed products, and supplies with movement history, expiration tracking, and automated low-stock alerts.

### Key Objectives
- **Real-time Stock Visibility:** Know exactly what inventory is available at each location
- **Movement Tracking:** Complete audit trail of all stock movements (in/out/transfers)
- **Expiration Management:** Track shelf life and alert on expiring items
- **Low-Stock Alerts:** Automatic notifications when stock falls below thresholds
- **Forecasting:** Predict stock needs based on historical trends

---

## 2. Database Schema

### 2.1 Stock Collection

```
locations/{locationId}/units/{unitId}/stock/{stockId}
├── itemId (string) - Reference to items collection
├── itemName (string) - Denormalized for quick access
├── quantity (number) - Current quantity in kg
├── unit (string) - "kg", "piece", "box", etc.
├── minThreshold (number) - Low-stock alert threshold
├── maxCapacity (number) - Storage capacity limit
├── dateReceived (timestamp) - When stock was received
├── expirationDate (timestamp) - When stock expires
├── location (string) - Denormalized location name
├── unit (string) - Denormalized unit name
├── lastMovement (timestamp) - Last transaction timestamp
├── status (string) - "active", "expiring", "expired", "reserved"
├── notes (string) - Additional notes
└── metadata
    ├── supplier (string) - Original supplier
    ├── batchNumber (string) - Batch/lot number
    ├── cost (number) - Unit cost in IDR
    └── grade (string) - Quality grade if applicable
```

### 2.2 Stock Movements Collection

```
stock_movements/{movementId}
├── type (string) - "IN", "OUT", "TRANSFER", "ADJUSTMENT", "WRITE_OFF"
├── fromLocationId (string) - Source location (null for IN)
├── toLocationId (string) - Destination location (null for OUT)
├── fromUnitId (string) - Source unit
├── toUnitId (string) - Destination unit
├── itemId (string) - Item being moved
├── itemName (string) - Denormalized
├── quantity (number) - Quantity moved
├── unit (string) - Unit of measurement
├── transactionId (string) - Reference to transaction
├── reason (string) - Reason for movement
├── createdBy (string) - User who created movement
├── timestamp (timestamp) - When movement occurred
├── approvedBy (string) - Approver (for transfers)
├── approvedAt (timestamp) - When approved
└── notes (string) - Additional context
```

### 2.3 Stock Alerts Collection

```
stock_alerts/{alertId}
├── type (string) - "LOW_STOCK", "EXPIRING", "EXPIRED", "CAPACITY_EXCEEDED"
├── locationId (string)
├── unitId (string)
├── itemId (string)
├── itemName (string)
├── currentQuantity (number)
├── threshold (number)
├── severity (string) - "info", "warning", "critical"
├── status (string) - "active", "acknowledged", "resolved"
├── createdAt (timestamp)
├── acknowledgedBy (string)
├── acknowledgedAt (timestamp)
└── resolvedAt (timestamp)
```

---

## 3. Backend Implementation

### 3.1 Cloud Functions to Create

#### `initializeStock`
- **Trigger:** Manual call via Admin Panel
- **Purpose:** Initialize stock for a location/unit
- **Input:** locationId, unitId, itemId, quantity, expirationDate
- **Logic:**
  - Validate location and unit exist
  - Check user permissions
  - Create stock document
  - Log initial movement
  - Trigger low-stock check

#### `recordStockMovement`
- **Trigger:** Called by postTransaction or manual API
- **Purpose:** Record stock in/out/transfer movements
- **Input:** type, fromLocation, toLocation, itemId, quantity, reason
- **Logic:**
  - Validate source has sufficient stock
  - Update source stock quantity
  - Update destination stock quantity
  - Create movement record
  - Check thresholds and create alerts
  - Update transaction reference

#### `transferStock`
- **Trigger:** HTTP call from Location Manager
- **Purpose:** Transfer stock between locations/units
- **Input:** fromLocationId, toLocationId, itemId, quantity
- **Logic:**
  - Require approval from both locations (if configured)
  - Validate sufficient stock
  - Create movement record with "TRANSFER" type
  - Update both locations
  - Log to audit trail

#### `checkStockThresholds`
- **Trigger:** Scheduled (daily at 6 AM)
- **Purpose:** Check all stock levels and create alerts
- **Logic:**
  - Query all stock documents
  - Compare against minThreshold
  - Check expiration dates
  - Create/update alerts
  - Send notifications to managers

#### `generateStockReport`
- **Trigger:** HTTP call or scheduled
- **Purpose:** Generate inventory reports
- **Input:** locationId, dateRange, format
- **Output:** Stock summary, movements, valuation

### 3.2 Firestore Security Rules

```javascript
// Stock collection - Location-based access
match /locations/{locationId}/units/{unitId}/stock/{stockId} {
  allow read: if request.auth != null && (
    request.auth.token.role_v2 == 'HQ_ADMIN' ||
    (request.auth.token.role_v2 == 'LOC_MANAGER' && 
     request.auth.token.target_id == locationId) ||
    (request.auth.token.role_v2 == 'UNIT_OP' && 
     request.auth.token.target_id == unitId)
  );
  
  allow create, update: if request.auth != null && (
    request.auth.token.role_v2 == 'HQ_ADMIN' ||
    request.auth.token.role_v2 == 'LOC_MANAGER'
  );
}

// Stock movements - Audit trail (read-only for operators)
match /stock_movements/{movementId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && (
    request.auth.token.role_v2 == 'HQ_ADMIN' ||
    request.auth.token.role_v2 == 'LOC_MANAGER'
  );
}

// Stock alerts - Location-based access
match /stock_alerts/{alertId} {
  allow read: if request.auth != null && (
    request.auth.token.role_v2 == 'HQ_ADMIN' ||
    request.auth.token.role_v2 == 'LOC_MANAGER'
  );
  
  allow update: if request.auth != null && (
    request.auth.token.role_v2 == 'HQ_ADMIN' ||
    request.auth.token.role_v2 == 'LOC_MANAGER'
  );
}
```

---

## 4. Frontend Implementation

### 4.1 New Pages/Components

#### `InventoryDashboard.jsx`
- **Route:** `/inventory`
- **Access:** HQ_ADMIN, LOC_MANAGER
- **Features:**
  - Stock level overview (cards showing total inventory value)
  - Location-based stock breakdown
  - Low-stock alerts section
  - Expiring items warning
  - Quick actions (add stock, transfer, adjust)

#### `StockViewer.jsx`
- **Route:** `/inventory/stock`
- **Access:** All roles
- **Features:**
  - Searchable stock list
  - Filter by location, unit, item
  - Sort by quantity, expiration date
  - Stock details modal
  - Movement history

#### `StockTransfer.jsx`
- **Route:** `/inventory/transfer`
- **Access:** LOC_MANAGER, HQ_ADMIN
- **Features:**
  - Source/destination selection
  - Item and quantity input
  - Approval workflow (if configured)
  - Transfer confirmation
  - Receipt generation

#### `StockAdjustment.jsx`
- **Route:** `/inventory/adjust`
- **Access:** LOC_MANAGER, HQ_ADMIN
- **Features:**
  - Reason selection (damage, expiration, recount, etc.)
  - Quantity adjustment
  - Photo upload for documentation
  - Approval workflow
  - Audit trail

#### `InventoryReports.jsx`
- **Route:** `/inventory/reports`
- **Access:** HQ_ADMIN, LOC_MANAGER, READ_ONLY
- **Features:**
  - Stock valuation report
  - Movement summary
  - Turnover analysis
  - Expiration forecast
  - Export to CSV/PDF

### 4.2 UI Components

#### `StockCard.jsx`
- Display individual stock item
- Show quantity, unit, expiration date
- Status indicator (normal, low, expiring, expired)
- Quick action buttons

#### `StockAlert.jsx`
- Display stock alerts
- Color-coded by severity
- Acknowledge/dismiss actions
- Link to affected stock

#### `MovementHistory.jsx`
- Timeline view of stock movements
- Filter by date range
- Show user and reason
- Link to related transactions

#### `StockChart.jsx`
- Visualize stock trends over time
- Show usage patterns
- Forecast future needs

---

## 5. Integration Points

### 5.1 With Existing Features

#### Transaction System
- When `postTransaction` is called with type "PURCHASE_RECEIVE":
  - Automatically create stock record
  - Record movement as "IN"
  - Check thresholds

- When `postTransaction` is called with type "SALES":
  - Deduct from stock
  - Record movement as "OUT"
  - Check if stock falls below minimum

#### Financial System
- Stock value impacts balance sheet
- Cost of goods sold (COGS) calculations
- Inventory valuation for reporting

#### Shark AI
- Provide stock context for queries
- Alert on unusual movements
- Forecast recommendations based on trends

### 5.2 Notifications
- **Low Stock Alert:** Notify location manager
- **Expiring Soon:** Notify unit operators
- **Expired Items:** Escalate to location manager
- **Transfer Request:** Notify approver
- **Capacity Exceeded:** Alert location manager

---

## 6. UI/UX Changes

### 6.1 Navigation Updates
Add "Inventory" link to navigation menu:
```
- HQ Admin: ✅ Inventory (new)
- Location Manager: ✅ Inventory (new)
- Unit Operator: ✅ Stock View (read-only)
```

### 6.2 Dashboard Widgets
Add to main dashboard:
- "Total Inventory Value" widget
- "Low Stock Items" alert widget
- "Expiring Soon" warning widget
- "Recent Movements" activity feed

### 6.3 Mobile Optimization
- Bottom navigation: Add Inventory icon
- Stock quick-view modal
- Simplified transfer interface
- Voice-based stock queries via Shark AI

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Create Firestore collections
- [ ] Implement security rules
- [ ] Create backend functions (initializeStock, recordStockMovement)
- [ ] Write unit tests

### Phase 2: Basic UI (Weeks 3-4)
- [ ] Create InventoryDashboard
- [ ] Create StockViewer
- [ ] Implement stock list display
- [ ] Add basic filtering/search

### Phase 3: Stock Management (Weeks 5-6)
- [ ] Create StockTransfer component
- [ ] Create StockAdjustment component
- [ ] Implement approval workflows
- [ ] Add movement history

### Phase 4: Reporting & Analytics (Weeks 7-8)
- [ ] Create InventoryReports
- [ ] Implement stock charts
- [ ] Add export functionality
- [ ] Create forecasting logic

### Phase 5: Integration & Testing (Weeks 9-10)
- [ ] Integrate with transaction system
- [ ] Integrate with Shark AI
- [ ] End-to-end testing
- [ ] Performance optimization

---

## 8. Testing Strategy

### Unit Tests
- Stock calculation functions
- Threshold checking logic
- Movement validation

### Integration Tests
- Stock creation via transaction
- Transfer workflows
- Alert generation

### User Acceptance Tests
- Location manager workflow
- Unit operator visibility
- HQ admin oversight

### Performance Tests
- Query performance with 10,000+ stock items
- Real-time update latency
- Report generation speed

---

## 9. Success Criteria

- ✅ Stock levels accurately reflect reality
- ✅ All movements are auditable
- ✅ Alerts generated within 5 minutes of threshold breach
- ✅ Transfers complete within 2 seconds
- ✅ Reports generate in < 10 seconds
- ✅ 99.9% data accuracy
- ✅ Zero data loss on system failure

---

## 10. Future Enhancements

### Phase 2 Features
- Barcode scanning for stock movements
- RFID integration for real-time tracking
- Predictive ordering based on usage patterns
- Supplier integration for automated reordering
- Temperature/humidity monitoring for cold storage
- Waste tracking and analysis
- Batch expiration tracking
- Multi-warehouse support

### Advanced Analytics
- Machine learning for demand forecasting
- Anomaly detection for unusual movements
- Supplier performance analysis
- Seasonal trend analysis

---

## 11. Documentation Needs

- [ ] API documentation for stock functions
- [ ] User guide for inventory management
- [ ] Admin guide for configuration
- [ ] Developer guide for extending features
- [ ] Database schema documentation
- [ ] Integration guide for third-party systems

---

## 12. Rollout Plan

### Pre-Launch
- [ ] Data migration from existing system
- [ ] Staff training (2 hours per location)
- [ ] Dry run with test data
- [ ] Performance testing

### Launch
- [ ] Soft launch with HQ only
- [ ] Monitor for 1 week
- [ ] Gradual rollout to locations
- [ ] 24/7 support during first month

### Post-Launch
- [ ] Gather user feedback
- [ ] Optimize based on usage patterns
- [ ] Plan Phase 2 enhancements

---

## 13. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data inconsistency | Medium | High | Implement strong validation, regular audits |
| Performance degradation | Low | High | Optimize queries, add indexing, caching |
| User adoption | Medium | Medium | Training, intuitive UI, gradual rollout |
| Integration issues | Low | High | Thorough testing, staged rollout |
| Expiration tracking errors | Low | High | Automated alerts, manual verification |

---

## 14. Estimated Costs

| Component | Effort (hours) | Cost (USD) |
|-----------|---|---|
| Backend development | 20 | $1,000 |
| Frontend development | 25 | $1,250 |
| Testing & QA | 10 | $500 |
| Documentation | 5 | $250 |
| **Total** | **60** | **$3,000** |

---

## 15. Approval & Sign-off

**Prepared By:** Manus AI  
**Date:** January 11, 2026  
**Status:** 📋 Ready for Review  

**Approvals:**
- [ ] Product Manager
- [ ] Technical Lead
- [ ] Operations Manager
- [ ] Finance Lead

---

## Appendix A: Sample API Calls

### Initialize Stock
```javascript
// Initialize stock for a location
await firebase.functions().httpsCallable('initializeStock')({
  locationId: 'jakarta',
  unitId: 'cold_storage',
  itemId: 'yellowfin_tuna',
  quantity: 500,
  expirationDate: new Date('2026-02-11'),
  minThreshold: 100,
  maxCapacity: 2000
});
```

### Record Movement
```javascript
// Record stock movement
await firebase.functions().httpsCallable('recordStockMovement')({
  type: 'IN',
  toLocationId: 'jakarta',
  toUnitId: 'cold_storage',
  itemId: 'yellowfin_tuna',
  quantity: 500,
  reason: 'Daily purchase from supplier',
  transactionId: 'txn_12345'
});
```

### Transfer Stock
```javascript
// Transfer between locations
await firebase.functions().httpsCallable('transferStock')({
  fromLocationId: 'jakarta',
  toLocationId: 'kaimana',
  itemId: 'yellowfin_tuna',
  quantity: 100,
  reason: 'Rebalancing inventory'
});
```

---

**End of Scope Document**
