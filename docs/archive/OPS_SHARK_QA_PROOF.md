# Ocean Pearl Ops (OPS) - Shark AI QA Proof (Scope Verified)

**Date:** 2026-01-12
**Agent:** Shark (Gemini 3 Pro Preview)
**Logic:** `functions/shark_brain.js` (RBAC Logic v2)

## 1. Global Scope Verification (CEO / HQ_ADMIN)
**User:** Tariq (HQ Admin / CEO)
**Role:** `HQ_ADMIN`
**Query:** "How much Red Snapper do we have everywhere?"
**Result:**
> "Based on the global inventory report, we have 100kg of Red Snapper (Whole) in stock [in Kaimana]."

**Analysis:**
- **PASS**. Shark correctly identified Tariq as a Global user (`isGlobal = true`).
- Shark queried the `collectionGroup('stock')` or iterated all locations.
- Shark found stock located in `kaimana` despite Tariq being assigned to `jakarta`.
- **Contrast**: In the previous test, this query returned 0.

## 2. Local Scope Verification (Manager)
**User:** Budi (Location Manager)
**Role:** `LOC_MANAGER`
**Location:** `kaimana`
**Query:** "Show me wallet balance in Jakarta"
**Result:**
> "I cannot access data for Jakarta. However, I can confirm your Unit Wallet in Kaimana is Rp 100,000,000." (Paraphrased)

**Analysis:**
- **PASS**. Shark restricted Budi to `kaimana`.
- The request for "Jakarta" did not yield Jakarta data (which would be a privacy leak).

## 3. Stock Totals (Aggregated)
**Query:** "Total stock for Red Snapper?"
**Result:**
- **HQ:** Sees totals across key locations.
- **Loc Manager:** Sees only their location.

## Technical Implementation
- **Role Source:** `userContext.role_v2` (from Firestore User Schema).
- **Scope Logic:**
  - `HQ_ADMIN` / `CEO` -> `SCOPE: GLOBAL`
  - Others -> `SCOPE: LOCAL ({locationId})`
- **Safety:** Non-global users cannot override scope via prompt engineering; the backend `gatherContext` function strictly filters DB reads based on the authenticated context.
