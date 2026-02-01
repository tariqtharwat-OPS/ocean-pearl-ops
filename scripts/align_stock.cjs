const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("🚀 ALIGNING STOCK WITH LIVE CATALOG 🚀");

    const mappings = [
        {
            from: 'COLD_rm-ml2nw6n6-wgj2m_A',
            to: 'COLD_FP-ML2O07HI-8A8X5_A',
            itemId: 'FP-ML2O07HI-8A8X5'
        },
        {
            from: 'COLD_rm-ml2nwaox-0bnir_A',
            to: 'COLD_FP-ML1Y372U-NH4RT_A',
            itemId: 'FP-ML1Y372U-NH4RT'
        }
    ];

    const unitPath = 'locations/kaimana/units/gudang_ikan_teri/stock';

    for (const m of mappings) {
        const fromRef = db.doc(`${unitPath}/${m.from}`);
        const toRef = db.doc(`${unitPath}/${m.to}`);

        const snap = await fromRef.get();
        if (snap.exists) {
            const data = snap.data();
            console.log(`Moving ${data.quantityKg}kg from ${m.from} to ${m.to}`);

            await toRef.set({
                ...data,
                itemId: m.itemId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await fromRef.delete();
            console.log(`✅ Moved ${m.from}`);
        } else {
            console.log(`⚠️ Source ${m.from} not found.`);
        }
    }

    process.exit(0);
})();
