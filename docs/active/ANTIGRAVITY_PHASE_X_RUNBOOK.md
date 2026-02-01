# Ocean Pearl Ops V2 — Phase X: Business-Grade Verification & Fix Loop (Antigravity Runbook)

**Goal (non‑negotiable):** Prove (with evidence) that Ocean Pearl Ops V2 can replace **Excel + WhatsApp** for real seafood operations in Kaimana **without losing money, control, or trust** — and fix anything that prevents that.

**You are Antigravity.** Act as:
- **Operator (Unit staff)** in wet/fast conditions
- **Manager (Site manager)** approving + supervising
- **CEO/HQ Admin** checking truth + reports + controls
- **Saboteur mindset**: try to break integrity and permissions

**Do not “logical simulate.”** Only accept **observed behavior** (browser) + **recorded evidence** (screenshots/logs) + **repeated re-test** after fixes.

---

## 0) Inputs you MUST read (in repo root or docs/)
These are the sources you must reconcile (some conflict on verdict):

1) `docs/active/EXPERT_PANEL_EVALUATION.md`  *(business / workflow gaps and requirements)*  
2) `docs/active/QA_TEST_REPORT.md` *(real UI click-based failures)*  
3) `docs/active/PHASE_8_REAL_HUMAN_FIX_LOG.md` *(claims of fixes + PASS)*  
4) `docs/active/simulation_log.md` *(multi-day operational simulation plan & observations)*  
5) `docs/active/INDEPENDENT_HUMAN_SIMULATION_VERDICT.md` *(earlier **NO‑GO** verdict)*  
6) Any latest fix report: `docs/active/PHASE_7_FIX_REPORT.md` *(if present in repo)*  
7) Audit PDF (if present): `Ocean Pearl Ops V2 Audit (1).pdf`

**Your job:** make these consistent by proving what is true **today in production**, then fixing what is not.

---

## 1) Ground truth targets
### A) Production environment
- URL: `https://oceanpearl-ops.web.app`
- Branch: `main`
- You MUST state in your final report:
  - **HEAD commit hash tested**
  - **Firebase project** used
  - **Functions deploy time** (approx) and confirmation output
  - **Playwright run ID** (CI) if used

### B) Working credentials (confirmed working previously)
- **CEO/Admin:** `tariq@oceanpearlseafood.com` / `OceanPearl2026!`
- **Manager (Kaimana):** `manager_kaimana@ops.com` / `OpsKaimana2026!`
- **Operator (Kaimana):** `operator_kaimana@ops.com` / `OpsTeri2026!`

> If any credential fails, you must treat that as a **P0 blocker** and fix by creating/resetting test accounts + documenting the change.

---

## 2) Gate 1 — Prove you can really use a browser (before doing anything else)
### Requirement
You must demonstrate browser capability by producing **one artifact**:
- A Playwright screenshot file **or** a short video of a real run, showing:
  - login page
  - successful login
  - navigation to Receiving
  - navigation to Expenses
  - logout

### Allowed approaches
- **CI (recommended):** GitHub Actions Playwright run against production.
- **Local:** Playwright runs on your environment.

### If local PowerShell is used
**Do NOT use `&&`** in PowerShell. Use separate lines:
```powershell
setx HOME "$env:USERPROFILE"
npm install -D playwright
npx playwright install
```

**Gate PASS = browser artifact exists** in repo (`/docs/active/artifacts/phase_x/…`) or as Action artifact.  
**Gate FAIL = stop.** Fix environment first.

---

## 3) Gate 2 — Transactional Smoke Tests (must pass twice)
Run **two full cycles**, each time with fresh inputs:

### Cycle Definition
1. Operator: **Receiving**
   - create receiving with:
     - supplier (existing + add new)
     - species, grade, unit
     - qty with decimals (e.g., 52.50kg)
     - price and/or total
   - submit
   - verify:
     - toast success
     - transaction appears in recent activity / transactions list
     - stock increases correctly in unit context

2. Operator: **Expense**
   - create expense (pending approval)
   - verify it appears in list with correct status and values

3. Manager: **Approve**
   - approve the expense
   - verify status changes + wallet effect (if designed)

4. Operator: **Production Run**
   - select source stock that was received
   - input -> output -> waste numbers
   - verify:
     - inventory decrement/increment is correct
     - no negative stock
     - no NaN, no silent failures
     - toast success

5. CEO/HQ: **Reports**
   - verify dashboards and reports reflect:
     - unit stock, site wallet, transactions, expenses
     - context switching updates the view correctly
   - verify CEO View‑As cannot write

### Rules
- Every step must have **evidence**: screenshot + short note.
- Any failure => classify severity and **fix immediately**, then rerun the whole cycle.

**PASS criteria:** two consecutive cycles PASS, no manual DB edits.

---

## 4) Gate 3 — Business Workflow Fit (expert-panel alignment)
This is the “real business” part.

### You must evaluate (and fix gaps if possible) for:
#### Seafood operations
- Receiving realities: partial deliveries, damaged boxes, mixed grade, re-weigh, correction, backdating
- Production realities: multi-batch, yield %, waste tracking, QC grade changes, rework
- Inventory truth: raw vs finished, location transfers, shrinkage, adjustments (controlled)

#### Finance / control
- Expenses: petty cash vs bank, approvals, audit trail, attachments/notes
- Wallet integrity: balances cannot “ghost” (case sensitivity, wrong path)
- COGS readiness: can we derive **unit cost per kg** / yield losses
- Separation of duties: operator cannot self-approve, CEO view-as cannot write

#### Reporting
- Daily: stock on hand, cash on hand, purchases, expenses, production output
- Weekly: yield, cost per kg, variance alerts, approvals queue aging
- CEO: multi-site rollup + risk flags

#### Shark AI usefulness
- What does Shark do at each step?
  - detects anomalies (negative qty, unusual price/kg, outlier supplier, suspicious expense)
  - produces actionable guidance (what to do next, who to ping)
  - logs are visible + searchable
- If Shark is “silent” or “spammy”, that’s a business failure.

### Output
Create `docs/active/BUSINESS_FIT_GAP_ANALYSIS.md` with:
- **Gap** (what real teams need)
- **Current behavior** (observed)
- **Risk** (money/control/trust impact)
- **Fix** (if feasible now)
- **Workaround / training** (if needs process)
- **Owner** (you/Manus/user/team)
- **Severity** (P0/P1/P2)

---

## 5) Severity taxonomy (use this)
- **P0 (Stop ship):** data integrity wrong, permission bypass, cannot transact, cannot approve, cannot trust wallet/stock, login broken
- **P1 (High):** workflow causes repeated human error, missing critical report, Shark misses obvious anomaly
- **P2 (Medium):** UX friction, unclear labels, minor latency, non-blocking

---

## 6) Fix protocol (when you hit issues)
For each issue:
1. Reproduce in browser
2. Capture evidence
3. Identify root cause (front-end / function / rules / indexes / data seed)
4. Fix on a branch
5. Add/extend automated test (Playwright or unit) that would catch it
6. Deploy to production
7. Re-run Gate 2 Cycle (full), confirm fix
8. Document in `docs/active/PHASE_X_FIX_LOG.md`

**No “PASS” claims without re-test evidence.**

---

## 7) Final deliverables (must be committed)
1) `docs/active/PHASE_X_EXEC_SUMMARY.md`
   - GO/NO‑GO with reasons
   - list of remaining gaps and risks

2) `docs/active/PHASE_X_REAL_HUMAN_LOG.md`
   - day-by-day log (minimum 7 simulated days)
   - each day includes operator/manager/CEO actions and screenshots

3) `docs/active/BUSINESS_FIT_GAP_ANALYSIS.md`
4) Artifacts folder:
   - `docs/active/artifacts/phase_x/` (screenshots, videos, CI logs)

---

## 8) Handoff to Manus (after you finish)
When you declare GO:
- Provide Manus with:
  - tested commit hash
  - credentials
  - links to the 3 deliverables above
  - exact steps to re-run Gate 2 in production
- Manus must confirm independently in browser (no code reading-only).

---

## 9) Start command (what you do first)
**Immediately do Gate 1:** prove browser capability by producing Playwright screenshot/video artifact and logging it in `PHASE_X_REAL_HUMAN_LOG.md`.

(Stop here until Gate 1 is PASS.)
