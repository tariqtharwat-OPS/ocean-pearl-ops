const admin = require('firebase-admin');

async function verifyDay1() {
    console.log("🔍 VERIFYING DAY 1 TRANSACTIONS & STOCK 🔍");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    // 1. Check Wallets
    console.log("\n--- WALLET BALANCES ---");
    const wallets = await db.collection('site_wallets').get();
    wallets.forEach(doc => {
        console.log(`${doc.id.padEnd(20)}: ${doc.data().balance ? doc.data().balance.toLocaleString() : 0} IDR`);
    });

    // 2. Check Transactions
    console.log("\n--- TRANSACTIONS (Latest 10) ---");
    const txns = await db.collection('transactions').orderBy('timestamp', 'desc').limit(10).get();
    if (txns.empty) {
        console.log("No transactions found.");
    } else {
        txns.forEach(doc => {
            const d = doc.data();
            console.log(`[${d.type}] ${d.description || 'No Desc'} | ${d.amount ? d.amount.toLocaleString() : 0} IDR | By: ${d.userId || 'System'}`);
        });
    }

    // 3. Check Stock (Raw Materials)
    console.log("\n--- STOCK: RAW MATERIALS ---");
    // We need to check subcollections "stock" for specific units if possible, or just raw_materials aggregation if that's how it works.
    // Ops V2 usually has stock in `units/{unitId}/stock/{itemId}` OR `stock` collection group.
    // Let's check collection group 'stock'.
    const stock = await db.collectionGroup('stock').get();
    if (stock.empty) {
        console.log("No stock found in any unit.");
    } else {
        stock.forEach(doc => {
            const d = doc.data();
            console.log(`Resource: ${doc.id} | Qty: ${d.quantity} | Unit: ${doc.ref.parent.parent.id}`);
        });
    }

    process.exit(0);
}

verifyDay1().catch(console.error);
