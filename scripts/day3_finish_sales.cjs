const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("🚀 RECORDING DAY 3 SALES (COMMERCIAL LOOP) 🚀");

    const sales = [
        {
            type: 'SALE_INVOICE',
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            itemId: 'FP-ML2O07HI-8A8X5', // Anchovy Fillet
            gradeId: 'A',
            quantityKg: 70,
            pricePerKg: 55000,
            amount: 70 * 55000,
            buyerId: 'buyer-b',
            buyerName: 'Buyer B (Seafood Export Ltd)',
            description: 'Day 3 Simulation: Export Sale'
        },
        {
            type: 'SALE_INVOICE',
            locationId: 'kaimana',
            unitId: 'gudang_ikan_teri',
            itemId: 'FP-ML1Y372U-NH4RT', // Tuna Loin
            gradeId: 'A',
            quantityKg: 25,
            pricePerKg: 165000,
            amount: 25 * 165000,
            buyerId: 'buyer-b',
            buyerName: 'Buyer B (Seafood Export Ltd)',
            description: 'Day 3 Simulation: Premium Loin Sale'
        }
    ];

    for (const sale of sales) {
        const id = `SALE-SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const txnRef = db.collection('transactions').doc(id);
        const stockRef = db.doc(`locations/kaimana/units/gudang_ikan_teri/stock/COLD_${sale.itemId}_${sale.gradeId}`);

        try {
            await db.runTransaction(async (t) => {
                const stockSnap = await t.get(stockRef);
                if (!stockSnap.exists) throw new Error(`Stock missing for ${sale.itemId}`);

                const current = stockSnap.data().quantityKg;
                if (current < sale.quantityKg) throw new Error(`Insufficient stock for ${sale.itemId}. Has ${current}, need ${sale.quantityKg}`);

                // Deduct Stock
                t.update(stockRef, {
                    quantityKg: admin.firestore.FieldValue.increment(-sale.quantityKg),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Record Transaction
                t.set(txnRef, {
                    ...sale,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'COMPLETED'
                });
            });
            console.log(`✅ Recorded Sale: ${sale.itemId} (${sale.quantityKg}kg)`);
        } catch (e) {
            console.error(`❌ Failed Sale ${sale.itemId}:`, e.message);
        }
    }

    process.exit(0);
})();
