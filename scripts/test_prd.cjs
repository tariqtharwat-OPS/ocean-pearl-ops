const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("🚀 TESTING COLD_STORAGE_IN MANUALLY 🚀");

    const payload = {
        type: 'COLD_STORAGE_IN',
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        itemId: 'rm-ml2nw6n6-wgj2m', // Lowercase!
        processType: 'Standard',
        gradeId: 'A',
        packaging: 'Sack (25kg)',
        quantityKg: 70,
        rawUsedKg: 100, // Consume full stock
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docId = `PRD-TEST-${Date.now()}`;
    const txnRef = db.collection('transactions').doc(docId);

    try {
        await db.runTransaction(async (t) => {
            const rawRef = db.doc('locations/kaimana/units/gudang_ikan_teri/stock/RAW_rm-ml2nw6n6-wgj2m');
            const rawDoc = await t.get(rawRef);

            if (!rawDoc.exists) throw new Error("RAW Stock Doc missing");
            const current = rawDoc.data().quantityKg;
            console.log("   Current Raw:", current);

            if (current < payload.rawUsedKg) throw new Error("Insufficient RAW");

            // Deduct Raw
            t.update(rawRef, {
                quantityKg: admin.firestore.FieldValue.increment(-payload.rawUsedKg),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Add Cold
            const coldRef = db.doc('locations/kaimana/units/gudang_ikan_teri/stock/COLD_rm-ml2nw6n6-wgj2m_A');
            t.set(coldRef, {
                itemId: payload.itemId,
                grade: 'A',
                quantityKg: admin.firestore.FieldValue.increment(payload.quantityKg),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Record Txn
            t.set(txnRef, payload);
        });
        console.log("✅ MANUAL PRODUCTION SUCCESS!");
    } catch (e) {
        console.error("❌ MANUAL PRODUCTION FAILED:", e.message);
    }

    process.exit(0);
})();
