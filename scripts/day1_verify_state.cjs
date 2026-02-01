const admin = require('firebase-admin');

async function verifyState() {
    console.log("🔍 VERIFYING DAY 1 FINAL STATE 🔍");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    // 1. CHECK WALLET
    const walletSnap = await db.collection('site_wallets').doc('kaimana').get();
    if (!walletSnap.exists) {
        console.error("❌ Kaimana Wallet Doc Missing!");
    } else {
        const bal = walletSnap.data().balance;
        console.log(`💰 Kaimana Balance: ${bal.toLocaleString()} IDR`);
        if (bal === 997000000) console.log("   ✅ Balance Correct (1B - 3M).");
        else console.log("   ⚠️ Balance Mismatch (Expected 997,000,000).");
    }

    // 2. CHECK STOCK
    const stockSnap = await db.collection('stock')
        .where('locationId', '==', 'kaimana')
        .where('id', '==', 'yellowfin_tuna')
        .get();

    if (stockSnap.empty) {
        console.error("❌ No Tuna Stock found in Kaimana!");
    } else {
        const qty = stockSnap.docs[0].data().qty;
        console.log(`🐟 Kaimana Tuna Stock: ${qty} kg`);
        if (qty === 50) console.log("   ✅ Stock Correct (50kg).");
        else console.log("   ⚠️ Stock Mismatch (Expected 50kg).");
    }

    // 3. CHECK TRANSACTION
    const txSnap = await db.collection('transactions')
        .where('locationId', '==', 'kaimana')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

    if (txSnap.empty) {
        console.error("❌ No Transactions found!");
    } else {
        const tx = txSnap.docs[0].data();
        console.log(`📝 Latest Tx: ${tx.type} | Status: ${tx.status} | Amount: ${tx.totalAmount}`);
        if (tx.status === 'completed' && tx.totalAmount === 3000000) console.log("   ✅ Transaction Correct.");
        else console.log("   ⚠️ Transaction State Issue.");
    }

    process.exit(0);
}

verifyState();
