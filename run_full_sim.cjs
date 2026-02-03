const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp();
}

const { handleTransactionInternal } = require('./functions/transaction_engine');

async function runSimulation() {
    console.log("🎬 STARTING FULL 7-DAY SIMULATION...");
    const sysAuth = { uid: 'system_simulation' };
    const db = admin.firestore();
    console.log("Seeding wallets...");
    await db.doc(`site_wallets/kaimana_gudang_ikan_teri`).set({ balance: 50000000, updatedAt: admin.firestore.Timestamp.now() });
    await db.doc(`site_wallets/jakarta_office`).set({ balance: 0, updatedAt: admin.firestore.Timestamp.now() });
    await db.doc(`site_wallets/HQ`).set({ balance: 500000000, updatedAt: admin.firestore.Timestamp.now() });
    console.log("Wallets seeded.");

    const results = {};
    try {
        // Day 1: RCV
        console.log("📅 Day 1: Receiving 500kg Teri in Kaimana");
        results.day1 = await handleTransactionInternal({
            type: 'PURCHASE_RECEIVE', locationId: 'kaimana', unitId: 'gudang_ikan_teri',
            itemId: 'teri_grade_a', quantityKg: 500, pricePerKg: 10000, paymentMethod: 'cash',
            description: 'Sim Day 1 RCV'
        }, sysAuth, true);

        // Day 2: PRD
        console.log("📅 Day 2: Cooking & Drying");
        results.day2 = await handleTransactionInternal({
            type: 'COLD_STORAGE_IN', locationId: 'kaimana', unitId: 'gudang_ikan_teri',
            itemId: 'teri_grade_a', quantityKg: 150, rawUsedKg: 500, description: 'Sim Day 2 PRD'
        }, sysAuth, true);

        // Day 3: TRN
        console.log("📅 Day 3: Transport");
        results.day3 = await handleTransactionInternal({
            type: 'TRANSPORT', locationId: 'kaimana', unitId: 'gudang_ikan_teri',
            targetLocationId: 'jakarta', targetUnitId: 'office', itemId: 'teri_grade_a',
            quantityKg: 150, freightCost: 500000, description: 'Sim Day 3 TRN'
        }, sysAuth, true);

        // Day 4: EXP
        console.log("📅 Day 4: Expense");
        results.day4 = await handleTransactionInternal({
            type: 'EXPENSE', locationId: 'kaimana', unitId: 'gudang_ikan_teri',
            amount: 250000, paymentMethod: 'cash', description: 'Sim Day 4 Electricity'
        }, sysAuth, true);

        // Day 5: SLD
        console.log("📅 Day 5: Local Sale");
        results.day5 = await handleTransactionInternal({
            type: 'LOCAL_SALE', locationId: 'jakarta', unitId: 'office',
            itemId: 'teri_grade_a', gradeId: 'NA', quantityKg: 50, pricePerKg: 150000,
            description: 'Sim Day 5 SLD'
        }, sysAuth, true);

        // Day 6: TXF
        console.log("📅 Day 6: Cash Transfer");
        results.day6 = await handleTransactionInternal({
            type: 'CASH_TRANSFER', locationId: 'kaimana', unitId: 'gudang_ikan_teri',
            transferDirection: 'IN', amount: 10000000, description: 'Sim Day 6 Replenish'
        }, sysAuth, true);

        console.log("\n✅ SIMULATION FINISHED.");
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error("Simulation Failed", e);
    }
}

runSimulation();
