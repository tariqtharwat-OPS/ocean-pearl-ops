# Ocean Pearl Ops (OPS) - Canonical User Roster

**Version:** 1.0 (Locked)
**Last Updated:** 2026-01-12
**Auth Method:** Email/Password
**Standard Password:** `OceanPearl2026!` (Do not commit to GitHub configs)

## 1. Executive / HQ Admin
**Role:** `HQ_ADMIN`
**Permissions:** Full Access (Global Read/Write), Admin Settings, User Management, All Locations.

| Name | Email | Location | Unit | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Tariq (CEO)** | `tariq@oceanpearlseafood.com` | `HQ` | `Office` | Super Admin / CEO |
| **Sarah (CFO/Admin)** | `sarah@oceanpearlseafood.com` | `HQ` | `Office` | Financial Controller |

## 2. Location Manager
**Role:** `LOC_MANAGER`
**Permissions:** Full Access to assigned Location (Read/Write), Reports (Local), Wallet (Local). Cannot access other locations' wallets or Admin settings.

| Name | Email | Location | Unit | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Pak Budi** | `budi@oceanpearlseafood.com` | `kaimana` | `frozen_fish` | Manager Kaimana Site |

## 3. Unit Operator
**Role:** `UNIT_OP`
**Permissions:** Restricted Access. Can submit Transactions (Receiving, Production, Expense). Cannot Approve Requests, View Global Reports, or Edit Master Data.

| Name | Email | Location | Unit | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Ibu Usi** | `usi@oceanpearlseafood.com` | `kaimana` | `gudang_ikan_teri` | Operator Gudang Teri |

## 4. Investor / Viewer
**Role:** `READ_ONLY`
**Permissions:** Global Read Only. Dashboard & Reports access. No write permissions.

| Name | Email | Location | Unit | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Lukas** | `investor@oceanpearlseafood.com` | `Global` | `Global` | Investor / Auditor |

---

## Technical Enforcement
- These users are enforced by the `seedRealisticData` function in Firebase Functions.
- Any user not in this list found in Firestore should be considered "Inactive" or "Ghost".
- All users share the same development password for testing ease.
