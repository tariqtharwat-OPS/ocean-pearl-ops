# User Roles & Simulation Fix Report

## Status: ✅ FIXED

### 1. Problem
- **Auth/Firestore Sync**: Users created via UI had `role` but missing `role_v2`.
- **Legacy Logic**: App defaulted to 'READ ONLY' if `role_v2` was missing.
- **Script Failures**:
  - `createSystemUser` backend function failing to sync roles.
  - UI Automation scripts failed to select dropdowns (Location/Role).
  - UI Automation scripts failed to locate form inputs (Text vs Select).
  - "User Already Exists" error prevented simulation restart.

### 2. Solution Implemented
- **Frontend Fallback (`AuthContext.jsx`)**:
  - Added robust mapping:
    - `location_admin` -> `LOC_MANAGER`
    - `site_user` -> `UNIT_OP`
    - `unit_admin` -> `UNIT_OP`
  - This ensures permissions work even without Backend `role_v2` sync.
  - **Deployed** to Firebase Hosting (`npm run build && firebase deploy`).
- **Script Fixes**:
  - **Aliases**: Switched to `*.sim3@oceanpearl.com` to bypass Auth collisions.
  - **Selectors**: Fixed `day1_ceo_ui` to scope selectors to the `<form>` element, avoiding Header conflicts.
  - **Locators**: Fixed `day1_operator_ui` to interact with `Select` elements instead of `Input` for Supplier/Item.
- **Verification**:
  - **CEO Setup**: Validated successful creation of Budi and Susi profiles with correct `locationId` in Firestore.
  - **Operator (Susi)**: Validated login, correct role (`UNIT_OP`), access to `/receiving`, and successful Transaction Submission.
  - **Manager (Budi)**: Validated login, correct role (`LOC_MANAGER`), and access to `/wallet` and `/reports`.

### 3. Verification Evidence
- **Susi Profile**:
  ```json
  "role": "site_user",
  "locationId": "kaimana",
  "unitId": "gudang_ikan_teri"
  ```
- **Budi Profile**:
  ```json
  "role": "location_admin",
  "locationId": "kaimana"
  ```
- **Operator Transaction**: "✅ Purchase Transaction Submitted Successfully via UI."
- **Manager Access**: "Nav Items found: Home, Receiving, Cold Storage, Site Wallet, Reports"

### 4. Next Steps
- The system is now ready for full "Day 1" simulation runs.
- The `functions` backend issue (deployment failure) remains a technical debt but is **non-blocking** for current UI/Ops simulation.
