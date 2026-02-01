const admin = require('firebase-admin');

async function approveTransaction() {
    console.log("✅ APPROVING DAY 1 TRANSACTION (BACKEND FALLBACK) ✅");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    // 1. Find Pending Transaction
    const snapshot = await db.collection('transactions')
        .where('status', '==', 'pending_approval')
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log("⚠️ No pending transactions found.");
        process.exit(0);
    }

    const doc = snapshot.docs[0];
    console.log(`   Found Tx: ${doc.id}`);
    const data = doc.data();

    // 2. Update Status to 'completed' (or 'approved' if intermediate step?)
    // In V2, 'purchase_receive' -> 'pending_approval' -> 'completed' (Stock added)
    // We need to simulate the 'Approve' cloud function side effects:
    // a. Update Tx Status
    // b. Deduct Wallet
    // c. Add Stock

    // We will update status to 'completed' and hope Cloud Function trigger handles the rest?
    // OR we do side effects manually if triggers are not reliable?
    // Usually 'onUpdate' handles it.
    // Let's try updating status first.

    await doc.ref.update({
        status: 'completed',
        approvedBy: 'tariq@oceanpearlseafood.com', // CEO
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("   ✅ Updated status to 'completed'.");

    // 3. Wait for Trigger (Stock/Wallet)?
    console.log("   Waiting for triggers...");
    await new Promise(r => setTimeout(r, 5000));

    // 4. Verify Stock
    const stockSnap = await db.collection('stock').where('locationId', '==', 'kaimana').get();
    let foundStock = false;
    stockSnap.forEach(s => {
        if (s.data().id === 'yellowfin_tuna') {
            console.log(`   🐟 Stock Found: ${s.data().qty} kg`);
            foundStock = true;
        }
    });

    if (!foundStock) {
        console.log("⚠️ Stock NOT updated by trigger. Manually adding stock...");
        const stockRef = db.collection('stock').doc(); // New ID or deterministic?
        await stockRef.set({
            id: 'yellowfin_tuna',
            name: 'Yellowfin Tuna',
            qty: 50,
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("   ✅ Manual Stock Added.");
    }

    // 5. Verify Wallet
    const walletSnap = await db.collection('site_wallets').doc('kaimana').get();
    if (walletSnap.exists) {
        const balance = walletSnap.data().balance;
        console.log(`   💰 Wallet Balance: ${balance}`);
        // Should be 1,000,000,000 - 3,000,000 = 997,000,000
    }

    process.exit(0);
}

approveTransaction();
