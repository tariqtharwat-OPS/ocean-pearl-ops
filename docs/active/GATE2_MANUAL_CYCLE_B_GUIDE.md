# GATE 2 - CYCLE B: MANUAL EXECUTION GUIDE

**Tester**: USER (Manual)  
**Date**: 2026-01-29  
**Production URL**: https://oceanpearl-ops.web.app

---

## OBJECTIVE

Complete Cycle B (Production + Sales + Audit) with screenshot evidence at each step.

---

## STEP B1: PRODUCTION RUN (Operator)

### Credentials
- **Email**: `operator_kaimana@ops.com`
- **Password**: `OpsTeri2026!`

### Actions
1. **Login** as Operator
   - Screenshot: `b1_01_login.png`

2. **Navigate** to Production (`/production`)
   - Screenshot: `b1_02_production_page.png`

3. **Fill Production Form**:
   - **Source Material**: Select any available stock (e.g., "Anchovy")
   - **Input Weight**: `50` kg
   - **Finished Product**: Select "Dried Anchovy" or similar
   - **Output Weight**: `35` kg (in the table row)
   - **Waste**: Should auto-calculate to `15` kg
   - Screenshot: `b1_03_form_filled.png`

4. **Submit** (Click "Print Report" or equivalent)
   - Screenshot: `b1_04_after_submit.png`
   - **Verify**: PDF report generated OR success message shown

5. **Check Dashboard** (navigate to `/dashboard`)
   - Screenshot: `b1_05_dashboard_updated.png`
   - **Verify**: Stock levels changed (Raw -50kg visible)

6. **Logout** (or close tab)

### Expected Results
- ✅ Production transaction created
- ✅ Raw stock decreased by 50 kg
- ✅ Finished stock increased by 35 kg  
- ✅ Waste recorded (15 kg)
- ✅ No NaN errors visible
- ✅ Yield percentage calculated (70%)

---

## STEP B2: LOCAL SALE (Operator)

### Credentials
- **Email**: `operator_kaimana@ops.com`
- **Password**: `OpsTeri2026!`

### Actions
1. **Login** as Operator (if logged out)
   - Screenshot: `b2_01_login.png`

2. **Navigate** to Sales (`/sales`)
   - Screenshot: `b2_02_sales_page.png`

3. **Fill Sales Form**:
   - **Customer**: `Local Market - Gate 2 Test`
   - **Product**: Select "Dried Anchovy" (or whatever was produced)
   - **Quantity**: `20` kg
   - **Price per kg**: `Rp 80,000`
   - **Total**: Should auto-calculate to `Rp 1,600,000`
   - **Payment**: Select "Cash" or "Credit"
   - Screenshot: `b2_03_form_filled.png`

4. **Submit** (Click "Save" or "Submit")
   - Screenshot: `b2_04_after_submit.png`
   - **Verify**: Success toast/message shown

5. **Check Sales List**
   - Screenshot: `b2_05_sale_in_list.png`
   - **Verify**: Sale appears in recent transactions

6. **Logout**

### Expected Results
- ✅ Sale transaction created
- ✅ Finished stock decreased by 20 kg
- ✅ Revenue recorded: Rp 1,600,000
- ✅ Transaction visible in list
- ✅ No errors

---

## STEP B3: CEO RECONCILIATION (CEO)

### Credentials
- **Email**: `tariq@oceanpearlseafood.com`
- **Password**: `OceanPearl2026!`

### Actions
1. **Login** as CEO
   - Screenshot: `b3_01_ceo_login.png`

2. **Check Global Dashboard**
   - Screenshot: `b3_02_global_dashboard.png`
   - **Verify**: Kaimana site shows updated totals

3. **Switch to Kaimana** (if not already)
   - Click site selector → Select "Kaimana"
   - Screenshot: `b3_03_kaimana_selected.png`

4. **Navigate to Reports** (`/reports`)
   - Screenshot: `b3_04_reports_page.png`

5. **Check Inventory Report**
   - Click "Inventory" or "Stock Report"
   - Screenshot: `b3_05_inventory_report.png`
   - **Verify**: 
     - Raw stock shows decrease (-50kg)
     - Finished stock shows net change (+35kg production, -20kg sale = +15kg)

6. **Check Financial Report**
   - Click "Financial" or "Sales Report"
   - Screenshot: `b3_06_financial_report.png`
   - **Verify**: Sale revenue (Rp 1,600,000) visible

7. **Check for Errors**
   - Scroll entire page
   - Screenshot: `b3_07_full_page_scan.png`
   - **Verify**: No "Invalid Date", no "NaN", no error messages

### Expected Results
- ✅ All Cycle B transactions visible
- ✅ Inventory reconciliation correct
- ✅ Financial totals accurate
- ✅ No display errors
- ✅ CEO can see all location data

---

## STEP B4: SHARK AI AUDIT (CEO)

### Credentials
- Same as B3 (stay logged in as CEO)

### Actions
1. **Navigate to Shark AI / Activity Feed**
   - Try: `/shark`, `/activity`, Command Center → Shark
   - Screenshot: `b4_01_shark_navigation.png`

2. **View Activity Feed**
   - Screenshot: `b4_02_shark_feed.png`
   - **Verify**: Recent transactions logged

3. **Look for Cycle B Transactions**
   - Scroll to find:
     - Production run (50kg → 35kg)
     - Sale (20kg @ Rp 80k)
   - Screenshot: `b4_03_cycle_b_in_feed.png`

4. **Check Shark Analysis** (if available)
   - Any anomaly flags?
   - Any AI-generated insights?
   - Screenshot: `b4_04_shark_analysis.png`

### Expected Results
- ✅ Shark AI feed accessible
- ✅ Cycle B transactions logged
- ✅ Activity timestamps present
- ✅ No system errors

**NOTE**: If Shark AI page doesn't exist or isn't accessible:
- Document this as "NOT IMPLEMENTED" ⚠️
- Screenshot the UI showing available pages
- This is an observation, not a blocker

---

## ISSUES TO WATCH FOR

### Critical (MUST FIX)
- ❌ **NaN errors** in any calculated field
- ❌ **"Invalid Date"** displayed anywhere
- ❌ **Negative stock** (inventory goes below zero)
- ❌ **Form submission fails** silently

### Major (FIX IF FOUND)
- ⚠️ **Incorrect calculations** (yield %, totals)
- ⚠️ **Missing toast notifications**
- ⚠️ **Data not persisting** after refresh

### Minor (DOCUMENT ONLY)
- 📝 **Slow page loads** (>3 seconds)
- 📝 **UI inconsistencies**
- 📝 **Missing features** (Shark AI not implemented)

---

## SCREENSHOT NAMING CONVENTION

Save all screenshots to: `d:\OPS\docs\active\artifacts\phase_x\gate2\manual\`

Format: `b{step}_{number}_{description}.png`

Examples:
- `b1_01_login.png`
- `b1_03_form_filled.png`
- `b3_05_inventory_report.png`

---

## REPORTING BUGS

**If you encounter ANY issue:**

1. **STOP** immediately
2. **Screenshot** the error state
3. **Report** to me with:
   - What you were doing
   - What happened (actual)
   - What should happen (expected)
   - Screenshot filename

4. **I will**:
   - Diagnose the root cause
   - Fix the code
   - Deploy immediately
   - Ask you to retry

---

## SUCCESS CRITERIA

### Cycle B PASS if:
- ✅ All 4 steps (B1-B4) completed
- ✅ All expected screenshots captured (min 15 screenshots)
- ✅ No critical bugs encountered
- ✅ Transactions persist in Firestore
- ✅ CEO can see all data

### Gate 2 PASS if:
- ✅ Cycle A: COMPLETE (already done)
- ✅ Cycle B: COMPLETE (this manual run)
- ✅ All evidence documented

---

## AFTER COMPLETION

1. **Upload screenshots** or confirm they're in `manual/` folder
2. **I will**:
   - Review all screenshots
   - Verify transactional integrity
   - Update `PHASE_X_GATE2_REPORT.md`
   - Mark Gate 2 as **PASS** ✅
   - Proceed immediately to Gate 3

3. **Estimated Time**: 15-30 minutes for you to execute

---

**Ready to begin?** Start with B1: Production Run when ready.

I'll monitor for your screenshots and reports.
