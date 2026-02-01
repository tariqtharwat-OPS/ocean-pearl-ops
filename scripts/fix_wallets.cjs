const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("💰 FIXING WALLET BALANCES (kaimana) 💰");

    const batch = db.batch();

    // 1. Ensure kaimana has the 250M
    batch.set(db.doc('site_wallets/kaimana'), {
        balance: 250000000,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Clear the unit wallet to avoid confusion
    batch.set(db.doc('site_wallets/gudang_ikan_teri'), {
        balance: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();
    console.log("✅ Kaimana wallet seeded with 250M. Unit wallet reset.");

    process.exit(0);
})();
