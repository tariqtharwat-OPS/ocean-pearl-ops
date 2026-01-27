# 📱 Manual Production Acceptance Checklist

Run this on a mobile device or desktop browser. Total time: ~15 mins.

## 1. CEO Smoke Test (Visibility)
1. Login: `tariq@oceanpearlseafood.com`.
2. Open Dashboard: Verify metrics load (no spinning forever).
3. Click "Location" (Top Right): Switch to **Kaimana** + **VIEW_AS**.
4. **Expected**: Yellow/Red banner "View Mode (Read Only)" appears.
5. Go to **Wallet**: Verify "New Request" button is hidden or disabled.

## 2. Manager Smoke Test (Approvals)
1. Login: `manager_kaimana_budi@ops.com`.
2. Go to **Treasury/Wallet**: Verify balance is not NaN.
3. Create a **New Request**: Buy ice, 50,000 IDR. Submit.
4. **Expected**: Green Toast notification. Request appears in "Pending".

## 3. Operator Smoke Test (Data Entry)
1. Login: `op_teri_usi@ops.com`.
2. Go to **Receiving**: Add 1 row (Teri, 10kg, 5000).
3. **Guard Test**: Click sidebar "Dashboard" without saving.
4. **Expected**: "Unsaved Changes" popup blocks navigation.
5. Click **Save**: Verify success toast.

## 🚨 BLOCKER DEFINITIONS (NO-GO)
Any of these = **NO-GO**:
- **B1**: Blank white screen on login or major page load.
- **B2**: "View Mode" allows a write to happen (Data Integrity failure).
- **B3**: Unsaved changes modal fails to appear (Data Loss risk).
- **B4**: Financial calculations show `NaN` or `undefined`.
- **B5**: Critical API error without a toast explanation (User Confusion).
