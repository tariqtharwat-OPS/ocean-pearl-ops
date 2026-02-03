const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { handleTransactionInternal } = require('./transaction_engine');

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * AUTOMATED 7-DAY SIMULATION (V2 - Operational Path)
 */
exports.simulateWeek = onRequest({ region: "asia-southeast1", timeoutSeconds: 540 }, async (req, res) => {
    const log = [];
    const results = {};
    const sysAuth = { uid: 'system_simulation' };

    try {
        log.push('🎬 STARTING 7-DAY SIMULATION (Operational Path)...');

        // Day 1: RCV in Kaimana
        log.push('📅 Day 1: Receiving 500kg Teri in Kaimana');
        const d1 = await handleTransactionInternal({
            type: 'PURCHASE_RECEIVE',
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            itemId: 'teri_raw',
            quantityKg: 500,
            pricePerKg: 10000,
            paymentMethod: 'cash',
            description: 'Sim Day 1 RCV'
        }, sysAuth, true);
        results.day1 = d1;

        // Day 2: PRD in Kaimana
        log.push('📅 Day 2: Cooking & Drying (500kg Raw -> 150kg Dried)');
        const d2 = await handleTransactionInternal({
            type: 'COLD_STORAGE_IN',
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            itemId: 'teri_dry',
            quantityKg: 150,
            rawUsedKg: 500,
            description: 'Sim Day 2 PRD'
        }, sysAuth, true);
        results.day2 = d2;

        // Day 3: TRANSPORT (Kaimana -> Jakarta)
        log.push('📅 Day 3: Transporting 150kg Dried Teri to Jakarta Office');
        const d3 = await handleTransactionInternal({
            type: 'TRANSPORT',
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            targetLocationId: 'jakarta',
            targetUnitId: 'office',
            itemId: 'teri_dry',
            quantityKg: 150,
            freightCost: 500000,
            description: 'Sim Day 3 TRN'
        }, sysAuth, true);
        results.day3 = d3;

        // Day 4: EXPENSE in Kaimana
        log.push('📅 Day 4: Operating Expenses (Electricity)');
        const d4 = await handleTransactionInternal({
            type: 'EXPENSE',
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            amount: 250000,
            paymentMethod: 'cash',
            description: 'Sim Day 4 Electricity'
        }, sysAuth, true);
        results.day4 = d4;

        // Day 5: SALE in Jakarta
        log.push('📅 Day 5: Selling 50kg in Jakarta');
        const d5 = await handleTransactionInternal({
            type: 'LOCAL_SALE',
            locationId: 'jakarta',
            unitId: 'office',
            itemId: 'teri_dry',
            gradeId: 'NA',
            quantityKg: 50,
            pricePerKg: 150000,
            description: 'Sim Day 5 SLD'
        }, sysAuth, true);
        results.day5 = d5;

        // Day 6: CASH TRANSFER (HQ -> Kaimana)
        log.push('📅 Day 6: Replenishing Kaimana Cash (10jt)');
        const d6 = await handleTransactionInternal({
            type: 'CASH_TRANSFER',
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            transferDirection: 'IN',
            amount: 10000000,
            description: 'Sim Day 6 Replenish'
        }, sysAuth, true);
        results.day6 = d6;

        // Day 7: Audit Log entry (Manual check)
        log.push('📅 Day 7: Simulation complete. Check audit_logs and transactions collections.');

        res.status(200).json({ success: true, results, log });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message, log });
    }
});
