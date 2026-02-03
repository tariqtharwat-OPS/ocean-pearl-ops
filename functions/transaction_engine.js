const { HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * handleTransactionInternal
 * Core logic for all operational transactions.
 */
async function handleTransactionInternal(data, auth, bypassRbac = false) {
    // 1. Authentication Check
    if (!auth && !bypassRbac) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    // Use LET to allow overriding by RBAC
    let { type, locationId, unitId, itemId, quantityKg, pricePerKg, gradeId, supplyType, rawUsedKg, paymentMethod, amount, transferDirection, description, customDate, skipAudit } = data;

    // Timestamp Logic
    let timestamp;
    if (customDate) {
        const d = new Date(customDate);
        if (isNaN(d.getTime())) timestamp = admin.firestore.Timestamp.now();
        else timestamp = admin.firestore.Timestamp.fromDate(d);
    } else {
        timestamp = admin.firestore.Timestamp.now();
    }

    // --- DATA INTEGRITY: Lowercase IDs ---
    if (locationId) locationId = locationId.toLowerCase();
    if (unitId) unitId = unitId.toLowerCase();
    if (itemId) itemId = itemId.toLowerCase();

    // === 1.5 RBAC ENFORCEMENT & SCOPE OVERRIDE ===
    if (!bypassRbac) {
        const userSnap = await db.collection('users').doc(auth.uid).get();
        const userData = userSnap.data() || {};
        const role_v2 = userData.role_v2;
        const target_id = userData.target_id || userData.locationId || userData.loc;

        if (!role_v2) throw new HttpsError('permission-denied', 'Account Security: No V2 Role.');

        if (role_v2 === 'HQ_ADMIN') {
            // Global Access
        } else if (role_v2 === 'LOC_MANAGER' || role_v2 === 'location_manager') {
            locationId = target_id;
        } else if (role_v2 === 'UNIT_OP' || role_v2 === 'unit_operator') {
            locationId = target_id;
            unitId = userData.unitId || unitId;
        } else {
            throw new HttpsError('permission-denied', 'Unknown Role.');
        }
    }

    if (!locationId || !unitId || !type) {
        throw new HttpsError('invalid-argument', 'Missing core transaction fields.');
    }

    const transactionRef = db.collection('transactions').doc();
    const getUnitWalletId = (loc, unt) => {
        if (!loc || loc === 'HQ' || unt === 'HQ') return 'HQ';
        return `${loc.toLowerCase()}_${unt.toLowerCase()}`;
    };

    const sourceWalletId_Real = getUnitWalletId(locationId, unitId);
    let targetWalletId_Real = sourceWalletId_Real;
    const sourceLocationRef = db.doc(`locations/${locationId}/units/${unitId}`);

    let calculatedTotal = 0;
    let stockImpactRaw = 0;
    let stockImpactCold = 0;
    let walletImpact = 0;
    let stockGrade = gradeId || "NA";

    let isTransport = (type === 'TRANSPORT');
    let targetLocationId = data.targetLocationId ? data.targetLocationId.toLowerCase() : null;
    let targetUnitId = data.targetUnitId ? data.targetUnitId.toLowerCase() : null;

    const stockTypes = ['PURCHASE_RECEIVE', 'COLD_STORAGE_IN', 'SALE_INVOICE', 'LOCAL_SALE', 'STOCK_ADJUSTMENT', 'TRANSPORT'];
    if (stockTypes.includes(type)) {
        const qty = parseFloat(quantityKg);
        if (isNaN(qty) || qty <= 0) throw new HttpsError('invalid-argument', `Invalid quantity.`);
        quantityKg = qty;
    }

    switch (type) {
        case 'PURCHASE_RECEIVE':
            if (!pricePerKg || pricePerKg <= 0) throw new HttpsError('invalid-argument', 'Price per Kg is mandatory.');
            calculatedTotal = quantityKg * pricePerKg;
            stockImpactRaw = quantityKg;
            if (paymentMethod === 'cash') walletImpact = -calculatedTotal;
            break;

        case 'COLD_STORAGE_IN':
            const decrementAmount = (rawUsedKg && rawUsedKg > 0) ? rawUsedKg : quantityKg;
            stockImpactRaw = -decrementAmount;
            stockImpactCold = quantityKg;
            break;

        case 'EXPENSE':
            calculatedTotal = amount || 0;
            if (calculatedTotal <= 0) throw new HttpsError('invalid-argument', 'Expense amount must be positive.');
            if (paymentMethod === 'cash') walletImpact = -calculatedTotal;
            break;

        case 'SALE_INVOICE':
            if (!gradeId) throw new HttpsError('invalid-argument', 'Grade is MANDATORY for Sales.');
            calculatedTotal = quantityKg * (pricePerKg || 0);
            stockImpactCold = -quantityKg;
            break;

        case 'LOCAL_SALE':
            if (!gradeId) throw new HttpsError('invalid-argument', 'Grade is MANDATORY for Sales.');
            calculatedTotal = quantityKg * (pricePerKg || 0);
            stockImpactCold = -quantityKg;
            walletImpact = calculatedTotal;
            break;

        case 'CASH_TRANSFER':
            calculatedTotal = amount;
            if (transferDirection === 'IN') walletImpact = amount;
            else if (transferDirection === 'OUT') walletImpact = -amount;
            break;

        case 'TRANSPORT':
            if (!targetLocationId || !targetUnitId) throw new HttpsError('invalid-argument', 'Target Loc/Unit required.');
            calculatedTotal = data.freightCost || 0;
            stockImpactCold = -quantityKg;
            walletImpact = -calculatedTotal;
            targetWalletId_Real = getUnitWalletId(targetLocationId, targetUnitId);
            break;

        default:
            throw new HttpsError('invalid-argument', 'Unknown Transaction Type');
    }

    await db.runTransaction(async (t) => {
        const txnDate = timestamp.toDate();
        const transactionData = { ...data, totalAmount: calculatedTotal };
        const year = txnDate.getFullYear().toString().substr(-2);
        const prefixMap = { 'PURCHASE_RECEIVE': 'RCV', 'COLD_STORAGE_IN': 'PRD', 'EXPENSE': 'EXP', 'SALE_INVOICE': 'INV', 'LOCAL_SALE': 'SLD', 'TRANSPORT': 'TRN', 'CASH_TRANSFER': 'TXF' };
        const prefix = prefixMap[type] || 'TXN';
        const locCode = locationId ? locationId.substring(0, 3).toUpperCase() : 'GEN';
        const counterRef = db.doc(`counters/${prefix}_${locCode}_${year}`);

        const HQ_WALLET_ID = 'HQ';
        const sourceStockRef = sourceLocationRef.collection('stock').doc(`COLD_${itemId}_${stockGrade}`);
        const rawStockRef = sourceLocationRef.collection('stock').doc(`RAW_${itemId}`);

        const counterDoc = await t.get(counterRef);
        let sourceWalletId = null;
        let targetWalletId = null;

        if (type === 'CASH_TRANSFER') {
            if (transferDirection === 'IN') { sourceWalletId = HQ_WALLET_ID; targetWalletId = sourceWalletId_Real; }
            else { sourceWalletId = sourceWalletId_Real; targetWalletId = HQ_WALLET_ID; }
        } else if (walletImpact < 0) { sourceWalletId = sourceWalletId_Real; }
        else if (walletImpact > 0) { targetWalletId = sourceWalletId_Real; }

        let sourceWalletDoc = null;
        if (sourceWalletId) sourceWalletDoc = await t.get(db.doc(`site_wallets/${sourceWalletId}`));
        let targetWalletDoc = null;
        if (targetWalletId) targetWalletDoc = await t.get(db.doc(`site_wallets/${targetWalletId}`));

        let coldStockDoc = await t.get(sourceStockRef);
        let rawStockDoc = await t.get(rawStockRef);

        let targetStockRef = null;
        if (isTransport) {
            targetStockRef = db.doc(`locations/${targetLocationId}/units/${targetUnitId}/stock/COLD_${itemId}_${stockGrade}`);
            await t.get(targetStockRef);
        }

        const currentSeq = counterDoc.exists ? (counterDoc.data().seq || 0) : 0;
        const newSeq = currentSeq + 1;
        const serialNumber = `${prefix}-${locCode}-${year}-${newSeq.toString().padStart(4, '0')}`;

        if (sourceWalletId && (type !== 'PURCHASE_RECEIVE' || paymentMethod === 'cash')) {
            const current = (sourceWalletDoc && sourceWalletDoc.exists) ? sourceWalletDoc.data().balance : 0;
            const deduct = Math.abs(walletImpact || amount);
            if (current < deduct) throw new HttpsError('failed-precondition', `Insufficient funds in ${sourceWalletId}.`);
        }

        if (stockImpactCold < 0 && ((coldStockDoc.data()?.quantityKg || 0) + stockImpactCold < 0)) throw new HttpsError('failed-precondition', 'Insufficient cold stock.');
        if (stockImpactRaw < 0 && ((rawStockDoc.data()?.quantityKg || 0) + stockImpactRaw < 0)) throw new HttpsError('failed-precondition', 'Insufficient raw stock.');

        t.set(counterRef, { seq: newSeq }, { merge: true });

        if (sourceWalletId) t.update(db.doc(`site_wallets/${sourceWalletId}`), { balance: admin.firestore.FieldValue.increment(-(Math.abs(walletImpact || amount))), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (targetWalletId) t.set(db.doc(`site_wallets/${targetWalletId}`), { balance: admin.firestore.FieldValue.increment(Math.abs(walletImpact || amount)), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

        if (stockImpactCold !== 0) t.set(sourceStockRef, { quantityKg: admin.firestore.FieldValue.increment(stockImpactCold), grade: stockGrade, updatedAt: timestamp }, { merge: true });
        if (stockImpactRaw !== 0) t.set(rawStockRef, { quantityKg: admin.firestore.FieldValue.increment(stockImpactRaw), updatedAt: timestamp }, { merge: true });
        if (isTransport) t.set(targetStockRef, { quantityKg: admin.firestore.FieldValue.increment(quantityKg), grade: stockGrade, updatedAt: timestamp }, { merge: true });

        t.set(transactionRef, { ...transactionData, serialNumber, timestamp, serverTimestamp: timestamp, userId: bypassRbac ? 'SYSTEM' : auth.uid, finalized: true, skipAudit: !!skipAudit });

        const auditRef = db.collection('audit_logs').doc();
        t.set(auditRef, { originalTransactionId: transactionRef.id, action: type, performedBy: bypassRbac ? 'SYSTEM' : auth.uid, timestamp, details: { total: calculatedTotal, walletDelta: walletImpact, stockRawDelta: stockImpactRaw, stockColdDelta: stockImpactCold } });
    });

    return { success: true, id: transactionRef.id, total: calculatedTotal };
}

module.exports = { handleTransactionInternal };
