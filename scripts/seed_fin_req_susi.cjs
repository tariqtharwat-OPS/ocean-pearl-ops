const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("🌱 SEEDING FINANCIAL REQUEST (Workaround for SIM5 - V2) 🌱");

    // Find Susi
    const susiSnap = await db.collection('users').where('email', '==', 'susi.sim5.official@oceanpearl.com').get();
    if (susiSnap.empty) {
        console.error("Susi not found!");
        process.exit(1);
    }
    const susi = susiSnap.docs[0].data();
    const susiUid = susiSnap.docs[0].id;

    const requestData = {
        requesterId: susiUid,
        requesterName: susi.displayName || 'Susi Susanti',
        type: 'EXPENSE',
        amount: 500000,
        description: 'Biaya es balok (10 balok) untuk SIM5 Day 1 - Manual Seed',
        category: 'Ice & Salt',
        locationId: susi.locationId || 'kaimana',
        unitId: susi.unitId || 'gudang_ikan_teri',
        status: 'PENDING',
        proofImage: null,
        createdAt: new Date(),
        history: [{
            action: 'CREATED',
            by: susiUid,
            at: new Date(),
            note: 'Manual workaround due to function issue'
        }]
    };

    const ref = await db.collection('financial_requests').add(requestData);
    console.log(`✅ Financial Request Seeded: ${ref.id}`);

    process.exit(0);
})();
