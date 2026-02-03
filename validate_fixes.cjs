const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops' // Adjust if needed
    });
}

const db = admin.firestore();
const { handleTransactionInternal } = require('./functions/transaction_engine');

async function run() {
    console.log("🚀 STARTING VERIFICATION RUN...");
    const sysAuth = { uid: 'system_verify' };

    // 1. CLEAR PREVIOUS STATE (Optional but good for clean evidence)
    // We'll just use a unique itemId for this run to avoid collisions
    const testItemId = 'verify_tuna_' + Date.now();
    const loc = 'kaimana';
    const unit = 'frozen_fish';
    const targetLoc = 'jakarta';
    const targetUnit = 'cold_storage';
    const walletId = `${loc}_${unit}`;
    const targetWalletId = `${targetLoc}_${targetUnit}`;

    // PRE-SEED WALLETS
    console.log("Seeding wallets...");
    await db.doc(`site_wallets/${walletId}`).set({ balance: 5000000, updatedAt: admin.firestore.Timestamp.now() });
    await db.doc(`site_wallets/${targetWalletId}`).set({ balance: 0, updatedAt: admin.firestore.Timestamp.now() });
    console.log("Wallets seeded.");

    // PRE-CHECK
    console.log("Performing pre-check...");
    const preStock = await db.doc(`locations/${loc}/units/${unit}/stock/COLD_${testItemId}_NA`).get();
    const preWallet = await db.doc(`site_wallets/${walletId}`).get();
    console.log(`Pre-Stock: ${preStock.exists ? preStock.data().quantityKg : 0} kg`);
    console.log(`Pre-Wallet: ${preWallet.exists ? preWallet.data().balance : 0}`);

    // DAY 1: PURCHASE
    console.log("\n--- Day 1: Purchase ---");
    const r1 = await handleTransactionInternal({
        type: 'PURCHASE_RECEIVE',
        locationId: loc,
        unitId: unit,
        itemId: testItemId,
        quantityKg: 100,
        pricePerKg: 10000,
        paymentMethod: 'cash'
    }, sysAuth, true);
    console.log(`RCV Txn ID: ${r1.id}`);

    // DAY 2: PRODUCTION
    console.log("\n--- Day 2: Production ---");
    const r2 = await handleTransactionInternal({
        type: 'COLD_STORAGE_IN',
        locationId: loc,
        unitId: unit,
        itemId: testItemId,
        quantityKg: 80,
        rawUsedKg: 100,
    }, sysAuth, true);
    console.log(`PRD Txn ID: ${r2.id}`);

    // DAY 3: TRANSPORT
    console.log("\n--- Day 3: Transport (The Big Test) ---");
    const r3 = await handleTransactionInternal({
        type: 'TRANSPORT',
        locationId: loc,
        unitId: unit,
        targetLocationId: targetLoc,
        targetUnitId: targetUnit,
        itemId: testItemId,
        quantityKg: 50,
        freightCost: 50000
    }, sysAuth, true);
    console.log(`TRN Txn ID: ${r3.id}`);

    // FINAL CHECK
    const postStockSource = await db.doc(`locations/${loc}/units/${unit}/stock/COLD_${testItemId}_NA`).get();
    const postStockTarget = await db.doc(`locations/${targetLoc}/units/${targetUnit}/stock/COLD_${testItemId}_NA`).get();
    const postWallet = await db.doc(`site_wallets/${walletId}`).get();

    console.log("\n--- POST-RUN EVIDENCE ---");
    console.log(`Source Stock: ${postStockSource.data().quantityKg} kg (Expected: 30)`);
    console.log(`Target Stock: ${postStockTarget.data().quantityKg} kg (Expected: 50)`);
    console.log(`Wallet Balance: ${postWallet.data().balance} (Expected: Pre - 1,000,000 - 50,000)`);

    console.log("\n✅ VERIFICATION COMPLETE.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
