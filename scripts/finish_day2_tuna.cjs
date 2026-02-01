const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("🚀 FINISHING DAY 2: TUNA PROCESSING 🚀");

    const payload = {
        type: 'COLD_STORAGE_IN',
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        itemId: 'rm-ml2nwaox-0bnir', // Yellowfin Tuna
        processType: 'Loin',
        gradeId: 'A',
        packaging: 'Vacuum Pack',
        quantityKg: 25,
        rawUsedKg: 50,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docId = `PRD-TUNA-FINISH-${Date.now()}`;
    const txnRef = db.collection('transactions').doc(docId);

    try {
        await db.runTransaction(async (t) => {
            const rawRef = db.doc('locations/kaimana/units/gudang_ikan_teri/stock/RAW_rm-ml2nwaox-0bnir');
            const rawDoc = await t.get(rawRef);

            if (!rawDoc.exists) throw new Error("RAW Tuna Stock Doc missing");
            const current = rawDoc.data().quantityKg;
            console.log("   Current Raw Tuna:", current);

            if (current < payload.rawUsedKg) throw new Error("Insufficient RAW Tuna");

            // Deduct Raw
            t.update(rawRef, {
                quantityKg: admin.firestore.FieldValue.increment(-payload.rawUsedKg),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Add Cold
            const coldRef = db.doc('locations/kaimana/units/gudang_ikan_teri/stock/COLD_rm-ml2nwaox-0bnir_A');
            t.set(coldRef, {
                itemId: payload.itemId,
                grade: 'A',
                quantityKg: admin.firestore.FieldValue.increment(payload.quantityKg),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Record Txn
            t.set(txnRef, payload);
        });
        console.log("✅ TUNA PRODUCTION SUCCESS!");
    } catch (e) {
        console.error("❌ TUNA PRODUCTION FAILED:", e.message);
    }

    process.exit(0);
})();
