# 7-Day Seafood Operations Simulation Checklist
**Location:** Kaimana (Target Location)
**Role:** Unit Operator (Usi) & Manager (Budi)

This checklist ensures the "REAL GO" criteria are met during the first week of live operations.

---

## 📅 Day 1: The First Purchase
- [ ] Log in as **Usi** (Kaimana Unit Op).
- [ ] Record a Receipt from Supplier "Budi Fisherman".
- [ ] Item: **Anchovy (Ikan Teri)**, 100kg @ Rp 25,000.
- [ ] Payment: Cash (Verify site wallet decrements correctly).
- [ ] **Verification**: Dashboard KPI "Raw Stock" should show exactly 100kg.

## 📅 Day 2: Production Conversion
- [ ] Log in as **Usi**.
- [ ] Start "Production Run".
- [ ] Source: 50kg of Anchovy (from yesterday).
- [ ] Result: 15kg "Dried Anchovy (Super)".
- [ ] **Verification**: Dashboard "Raw Stock" -> 50kg. "Cold Stock" -> 15kg.

## 📅 Day 3: Operational Expenses
- [ ] Log in as **Usi**.
- [ ] Record Expense: "Ice for Storage" - Rp 250,000.
- [ ] Status: Pending Approval.
- [ ] Log in as **Budi** (Manager).
- [ ] Approve Expense.
- [ ] **Verification**: Wallet balance decrements only AFTER Budi approves.

## 📅 Day 4: Funding Request
- [ ] Log in as **Budi** (Manager).
- [ ] Request Funding: "Operational Buffer" - Rp 10,000,000.
- [ ] Log in as **Tariq** (HQ Admin).
- [ ] Context Switch to Kaimana -> Approve Funding.
- [ ] **Verification**: Kaimana Wallet should increase by Rp 10M. HQ Wallet should decrease.

## 📅 Day 5: Local Sale
- [ ] Log in as **Usi**.
- [ ] Record "Local Sale" of 5kg Dried Anchovy.
- [ ] **Verification**: Site Wallet increases immediately. Cold Stock decrements.

## 📅 Day 6: Inventory Audit
- [ ] Log in as **Tariq** (CEO).
- [ ] Use **VIEW_AS Kaimana**.
- [ ] Audit all transactions. Verify no "NaN" values in the list.
- [ ] Try to edit a transaction (Verify BLOCKED).

## 📅 Day 7: Weekly Reports
- [ ] Log in as **Budi**.
- [ ] View "Weekly Operational Report".
- [ ] Verify Profit/Loss mirrors the 7-day activities.
- [ ] **Final Sign-off**: Go to Production.

---

### 🚨 Critical Failure Conditions (NO-GO)
- Any "NaN" value on a financial screen.
- Any "404" on a core page for a valid user.
- Any site wallet balance showing negative without HQ buffer.
- Any raw stock disappearing without a corresponding production run.
