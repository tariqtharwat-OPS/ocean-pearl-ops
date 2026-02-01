const admin = require('firebase-admin');

async function seedTransaction() {
    console.log("🌱 SEEDING DAY 1 TRANSACTION (BACKEND FALLBACK) 🌱");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    const txData = {
        type: 'purchase_receive',
        status: 'pending_approval',
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        supplier: 'Nelayan A',
        items: [
            {
                id: 'yellowfin_tuna',
                name: 'Yellowfin Tuna',
                qty: 50,
                price: 60000,
                subtotal: 3000000
            }
        ],
        totalAmount: 3000000,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'susi.sim@oceanpearl.com', // Simulate Susi
        createdByName: 'Susi Susanti'
    };

    const docRef = await db.collection('transactions').add(txData);
    console.log(`✅ Transaction Created: ${docRef.id} (Pending Approval)`);

    // Also create 'financial_requests' entry if system requires it for approval?
    // V2 system usually mirrors txs needing approval to a request or queries 'pending_approval' txs.
    // We'll assume querying 'transactions' with status 'pending_approval' is enough.

    process.exit(0);
}

seedTransaction();
