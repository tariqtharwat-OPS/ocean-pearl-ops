# Ocean Pearl Ops V2: 7-Day "Real Life" Simulation Guide
**Target Audience:** Manus (QA Tester) / Human Testers
**Version:** 1.0 (Frozen Canonical State)
**Default Password:** `OceanPearl2026!`

---

## 1. Validated User Credentials
These users are hard-coded in `seed_production.js` and guaranteed to work.

| Role Type | User / Persona | Email | Purpose in Test |
| :--- | :--- | :--- | :--- |
| **👑 ROOT ADMIN** | **Tariq (CEO)** | `tariq@oceanpearlseafood.com` | "God Mode" view. Approves large funds, checks "Shark" alerts, fixes mistakes. |
| **🏢 HQ ADMIN** | **Sarah (Ops)**| `admin_hq_sarah@ops.com` | Manages global users, daily reports, and central cash flow. |
| **📍 MANAGER** | **Pak Budi** | `manager_kaimana_budi@ops.com` | **Key Tester.** Runs Kaimana. Approves local expenses, requests cash from HQ. |
| **👷 OPERATOR** | **Usi (Admin)** | `op_teri_usi@ops.com` | **High Volume Tester.** Inputs 50+ receipts/day. Receiver of goods. |
| **👀 INVESTOR** | **Lukas** | `investor_view@ops.com` | Read-only check. Ensures he cannot edit/delete anything. |
| **❄️ LEGACY** | **Legacy Head** | `head_kaimana_teri@ops.com` | Test for backward compatibility. |

---

## 2. "Human-Like" Testing Philosophy
Do not test happy paths. Be messy. Be human.

### A. The "Fat Finger" Test
*   **Decimals:** Enter `10.5` vs `10,5` (Verify localization handling).
*   **Zeros:** Enter `10000kg` instead of `100kg` (Look for "Unusual Volume" warnings).
*   **Negatives:** Enter `Price: -5000` (Verify blocking).
*   **Double Clicks:** Click "Submit" frantically 5 times (Verify no duplicate records).

### B. The "Shark" Provocation (AI Stress)
*   **Lie to the AI:** "Draft an expense for 500 million for snacks." (Shark should catch this as anomaly/risk).
*   **Vague Instructions:** "We bought some stuff." (Shark should ask "What stuff? How much?").
*   **Math Check:** Ask "What is average price of Tuna this week?" -> Verify against calculator.

### C. The "Island" Test (Offline resilience)
*   **Disconnect WiFi:** While logged in as **Usi**.
*   **Input Data:** Enter 5 receipts.
*   **Verify UI:** Should see "Pending Sync / Offline" badge.
*   **Reconnect:** Watch the queue flush to server.

---

## 3. The 7-Day Simulation Plan
Simulate a full weekly cycle: **Cash -> Buying -> Processing -> Selling -> Reporting.**

### **Day 1: Cash Injection & Setup (Monday)**
*   **Theme:** Liquidity & Suppliers.
*   **Actions:**
    1.  **HQ (Sarah):** Login. Send **500,000,000 IDR** "Cash Transfer" to **Kaimana Frozen**.
    2.  **Manager (Budi):** Check notifications. Confirm receipt of funds.
    3.  **Manager (Budi):** Create a new Supplier "CV. Local Boat 01".
    4.  **Operator (Usi):** Try to spend money *before* it arrives (Verify "Insufficient Funds" error).

### **Day 2: The "Grand Harvest" (Tuesday)**
*   **Theme:** High Volume Receiving (Stress Test).
*   **Actions:**
    1.  **Operator (Usi):** Enter **20 separate Receipts** for "Raw Anchovy".
        *   *Vary weights:* 15kg, 200kg, 45.5kg.
        *   *Vary Prices:* 15,000/kg (Standard), 18,000/kg (Premium).
    2.  **Shark AI Check:** Ask Shark "What is the average purchase price of Anchovy today?". Verify math.
    3.  **Human Error:** Enter one receipt with `Payment Method = Cash` but forget to fill `Supplier`. Verify validation.

### **Day 3: Processing & Yield (Wednesday)**
*   **Theme:** Factory Operations & AI Auditing.
*   **Actions:**
    1.  **Operator (Usi):** Run "Production".
        *   Input: `1000kg` Raw Anchovy.
        *   Output: `350kg` Dried Anchovy. (35% Yield - Normal).
    2.  **Operator (Usi):** Run "Production" (BAD BATCH).
        *   Input: `1000kg` Raw Anchovy.
        *   Output: `150kg` Dried Anchovy. (15% Yield - **CRITICAL LOW**).
    3.  **Root Admin (Tariq):** Check Dashboard. **MUST** see a "Shark Alert: Low Yield Detected (15%)".
    4.  **Chat:** Tariq asks Shark "Show me recent production anomalies."

### **Day 4: Logistics & Cash Out (Thursday)**
*   **Theme:** Expenses & Sales.
*   **Actions:**
    1.  **Manager (Budi):** Use **Shark Chat** to draft expenses.
        *   Type: *"Draft expense 2.5 million for generator repair sup_pt_shark_abadi"*
        *   Click "Execute" on the generated draft card.
    2.  **Operator (Usi):** Create "Local Sale" (Cash In).
        *   Sell `50kg` Dried Anchovy to "Pasar Lokal".
        *   Verify Wallet Balance increases immediately.

### **Day 5: The "Offline" Island Test (Friday)**
*   **Theme:** Resilience.
*   **Actions:**
    1.  **Operator (Usi):** **DISCONNECT INTERNET/WIFI.**
    2.  **Action:** Perform 5 Transactions (Receive Fish, Buy Ice, Pay Labor).
    3.  **Verify:** UI should say "Saved Offline".
    4.  **Action:** **RECONNECT INTERNET.**
    5.  **Verify:** Watch the "Transaction Queue" flush.
    6.  **HQ (Sarah):** Verify data appears in Jakarta 1 minute later.

### **Day 6: Identify & Access Management (Saturday)**
*   **Theme:** Security.
*   **Actions:**
    1.  **HQ (Sarah):** "Fire" a temporary worker. Go to Admin Panel -> Disable User.
    2.  **Worker:** Try to login. Must check "Account Disabled" message.
    3.  **Investor (Lukas):** Login. Try to access `/admin/production` manually via URL. Verify "Access Denied".

### **Day 7: Weekly Closing (Sunday)**
*   **Theme:** Reporting & Accuracy.
*   **Actions:**
    1.  **Manager (Budi):** Ask Shark: "Generate weekly summary for Kaimana."
    2.  **HQ (Sarah):** Download "CSV Export" of all transactions.
    3.  **Manus (The Tester):** Compare the CSV sum in Excel vs. the Dashboard "Total Cash" widget. **They must match exactly.**

---
**Pass/Fail Criteria:**
*   **FAIL:** If Dashboard Cash Widget != Excel Export Sum.
*   **FAIL:** If Offline Data is lost on reconnect.
*   **FAIL:** If Shark AI fails to detect the 15% Bad Yield.
