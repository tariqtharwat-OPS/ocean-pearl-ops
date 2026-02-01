const admin = require('firebase-admin');

async function seedWallet() {
    console.log("💰 SEEDING WALLET (BACKEND CORRECTION) 💰");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    const targetBalance = 997000000; // 1B - 3M purchase

    await db.collection('site_wallets').doc('kaimana').set({
        balance: targetBalance,
        currency: 'IDR',
        locationId: 'kaimana',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Kaimana Wallet Set to ${targetBalance}`);
    process.exit(0);
}

seedWallet();
