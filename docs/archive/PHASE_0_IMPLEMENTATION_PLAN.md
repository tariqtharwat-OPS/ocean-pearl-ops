# Phase-0 CEO Control Mode - Implementation Plan

## Mission
Make OPS practically runnable by the CEO as a real Global Admin, with safe "View As" and powerful "Operate As" across locations/roles.

## Status: IN PROGRESS
**Started:** 2026-01-19

---

## 1. CEO Global Admin Rules ✅ (Planned)

### 1.1 Define CEO/Global Admin
- [x] Review current implementation in `AuthContext.jsx`
- [ ] Add formal `GLOBAL_ADMIN` role support
- [ ] Implement Firebase Custom Claims check (optional for Phase-0)
- [ ] Ensure Firestore rules align with app logic

### 1.2 Permissions Matrix
| Role | Read All | Write All | Approve | Override |
|------|----------|-----------|---------|----------|
| GLOBAL_ADMIN | ✓ | ✓ | ✓ | ✓ |
| HQ_ADMIN | ✓ | ✓ | ✓ | - |
| LOC_MANAGER | Location only | Location only | Location only | - |
| UNIT_OP | Unit only | Unit only | - | - |

---

## 2. Two CEO Modes ⏳ (In Progress)

### 2.1 View As Mode (Read-Only)
- [ ] Add `viewMode` state to AuthContext
- [ ] Create `setViewAsMode(location, unit, role)` function
- [ ] Disable all write operations when in View As mode
- [ ] Add visual indicator banner
- [ ] Update document title format

### 2.2 Operate As Mode (Write-Enabled)
- [ ] Add `operateMode` state to AuthContext
- [ ] Create `setOperateAsMode(location, unit, role)` function
- [ ] Enable full write permissions as target role
- [ ] Add confirmation dialog for first action per session
- [ ] Add visual indicator banner
- [ ] Update document title format

### 2.3 Mode Switching UI
- [ ] Create `CEOControlPanel` component
- [ ] Add mode selector (View As / Operate As / Exit to CEO)
- [ ] Add location/unit/role selectors
- [ ] Add persistent banner showing current mode
- [ ] Add "Exit to CEO" button always visible

---

## 3. UI/UX Clarity 🎨 (Planned)

### 3.1 Document Title Pattern
```
Normal: OPS — CEO (Global Admin)
View As: OPS — VIEW AS: Saumlaki / UNIT_OP
Operate As: OPS — OPERATE AS: Kaimana / LOC_MANAGER
```

### 3.2 Banner Design
- Sticky top banner below header
- Color-coded:
  - CEO Mode: Yellow/Gold
  - View As: Blue (read-only)
  - Operate As: Orange (write-enabled)
- Shows: Mode | Location | Unit | Role | Exit Button

### 3.3 Confirmation Modal
- First action in Operate As mode triggers confirmation
- "You are about to perform actions as: [ROLE] at [LOCATION]"
- Session-based (one confirmation per session)

---

## 4. Wallet & Location Switching 💰 (Needs Review)

### Current Status
- `Layout.jsx` has basic location/unit switcher
- `WalletManager.jsx` has context-aware wallet display
- Need to verify proper data isolation

### Tasks
- [ ] Test wallet switching with real data
- [ ] Ensure query filters respect selected context
- [ ] Test approval workflows in Operate As mode
- [ ] Verify transaction history shows correct scope

---

## 5. Fix Fragile Screens 🛠️ (Critical)

### Known Issues
- [ ] AdminPanel.jsx - Items/Settings crashes
- [ ] Missing error boundaries on key pages
- [ ] Undefined/null access patterns
- [ ] Missing field validations

### Global Stability Tasks
- [ ] Add defensive `?. ??` patterns
- [ ] Add ErrorBoundary to all route components
- [ ] Add loading states to all async operations
- [ ] Add user-friendly error messages
- [ ] Test with empty Firestore collections

---

## 6. Golden Test Data 📊 (Planned)

### Seed Script Requirements
Must create deterministic test data:

#### Locations & Units
- Jakarta (HQ): office, cold_storage
- Kaimana: gudang_ikan_teri, frozen_fish
- Saumlaki: frozen_fish

#### Users (One per role per location)
- CEO: info@oceanpearlseafood.com (GLOBAL_ADMIN)
- HQ Admin: admin@oceanpearlseafood.com (HQ_ADMIN, jakarta)
- Kaimana Manager: budi@oceanpearlseafood.com (LOC_MANAGER, kaimana)
- Saumlaki Manager: dewi@oceanpearlseafood.com (LOC_MANAGER, saumlaki)
- Kaimana Operator: andi@oceanpearlseafood.com (UNIT_OP, kaimana/frozen_fish)
- Saumlaki Operator: siti@oceanpearlseafood.com (UNIT_OP, saumlaki/frozen_fish)

#### Wallets
- HQ: 1,000,000,000 IDR
- Kaimana: 50,000,000 IDR
- Saumlaki: 50,000,000 IDR

#### Sample Transactions
- 1x Expense Draft (UNIT_OP → pending LOC_MANAGER approval)
- 1x Funding Request (LOC_MANAGER → pending HQ approval)
- 1x Production Run (complete with input/output)
- 5x Completed transactions per location

#### Master Data
- 5x Raw Materials (Tuna, Shrimp, Anchovy, etc.)
- 5x Finished Products (Frozen Loin, IQF Shrimp, etc.)
- 3x Partners (Suppliers, Buyers)

---

## 7. CEO Walkthrough Script ✅ (To be Created)

### Test Scenarios

#### A. View As Mode (Read-Only)
1. CEO logs in
2. Selects "View As" → Kaimana / UNIT_OP
3. Verifies can see data but cannot edit
4. Attempts to create expense → blocked with message
5. Exits back to CEO mode

#### B. Operate As UNIT_OP
1. CEO selects "Operate As" → Kaimana / UNIT_OP
2. Creates expense draft
3. Verifies draft appears in pending approvals
4. Exits to CEO mode

#### C. Operate As LOC_MANAGER
1. CEO selects "Operate As" → Kaimana / LOC_MANAGER
2. Approves the expense draft
3. Verifies wallet deduction
4. Verifies approval audit trail

#### D. Operate As FINANCE (HQ)
1. CEO selects "Operate As" → Jakarta / HQ_ADMIN
2. Transfers funds Kaimana → Saumlaki
3. Verifies double-entry ledger
4. Verifies both wallet balances

#### E. Operate As ADMIN
1. CEO selects "Operate As" → ADMIN
2. Adds new raw material
3. Edits existing partner
4. Verifies no crashes

#### F. Production Run
1. CEO selects "Operate As" → Saumlaki / UNIT_OP
2. Creates production run
3. Verifies input/output calculations
4. Verifies stock deductions

---

## Implementation Order

### Phase 1: Foundation (Hours 1-2)
1. Enhance AuthContext with CEO modes
2. Create CEOControlPanel component
3. Add banner and document title updates

### Phase 2: UI Integration (Hours 3-4)
4. Integrate CEO panel into Layout
5. Add mode-based permission gates
6. Test mode switching

### Phase 3: Stability (Hours 5-6)
7. Fix AdminPanel crashes
8. Add error boundaries
9. Add defensive coding patterns

### Phase 4: Testing (Hours 7-8)
10. Create golden data seed script
11. Run CEO walkthrough
12. Document results

---

## Success Criteria Checklist

- [ ] CEO can View As any role/location safely (read-only)
- [ ] CEO can Operate As any role/location and truly run workflows (write-enabled)
- [ ] Context is always obvious (title + banner + exit)
- [ ] Admin Items/Settings no longer crash
- [ ] App works with empty/partial data (no hard crashes)
- [ ] Golden test data exists and renders cleanly
- [ ] CEO walkthrough passes in production
- [ ] All tests documented in final report

---

## Notes
- Focus on stability, not new features
- Use existing `role` and `role_v2` fields
- Leverage current `updateViewContext` as foundation
- Keep changes minimal and surgical
