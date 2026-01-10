const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function injectCapital() {
    console.log("💉 INJECTING DAY 1 CAPITAL (Manual Override)...");

    const AMOUNT = 500000000;
    const LOCATION = 'kaimana'; // Target
    const HQ = 'HQ';

    // 1. Transaction
    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // HQ Wallet
    const hqRef = db.doc(`site_wallets/${HQ}`);
    batch.update(hqRef, {
        balance: admin.firestore.FieldValue.increment(-AMOUNT),
        updatedAt: timestamp
    });

    // Target Wallet
    const targetRef = db.doc(`site_wallets/${LOCATION}`);
    // Check exist
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
        batch.set(targetRef, {
            balance: AMOUNT,
            type: 'LOCATION',
            locationId: LOCATION,
            updatedAt: timestamp
        });
    } else {
        batch.update(targetRef, {
            balance: admin.firestore.FieldValue.increment(AMOUNT),
            updatedAt: timestamp
        });
    }

    // Ledger Entry
    const txnRef = db.collection('transactions').doc();
    batch.set(txnRef, {
        type: 'CASH_TRANSFER',
        amount: AMOUNT,
        sourceWalletId: HQ,
        targetWalletId: LOCATION,
        transferDirection: 'IN',
        description: "Day 1 Capital Injection (Manual Override via CLI)",
        approverId: 'SYSTEM_OVERRIDE',
        timestamp: timestamp,
        finalized: true,
        manualInjection: true
    });

    await batch.commit();
    console.log(`✅ SUCCESS: Injected Rp ${AMOUNT.toLocaleString()} to ${LOCATION}.`);
}

injectCapital().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
