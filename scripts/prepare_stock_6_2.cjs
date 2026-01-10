const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkAndSeedStock() {
    console.log("=== CHECKING STOCK FOR PHASE 6.2 ===");

    // 1. Kaimana Teri (Unit: gudang_ikan_teri)
    const teriUnitPath = 'locations/kaimana/units/gudang_ikan_teri';
    const teriStockRef = db.doc(`${teriUnitPath}/stock/RAW_teri_raw_m`);

    // Check
    const teriSnap = await teriStockRef.get();
    if (!teriSnap.exists || teriSnap.data().quantityKg < 500) {
        console.log("Seeding RAW ANCHOVY for Kaimana Teri...");
        await teriStockRef.set({
            quantityKg: 1000,
            itemId: 'teri_raw_m',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } else {
        console.log(`Teri Stock OK: ${teriSnap.data().quantityKg} kg`);
    }

    // 2. Kaimana Frozen (Unit: frozen_fish)
    const frozenUnitPath = 'locations/kaimana/units/frozen_fish';
    const frozenStockRef = db.doc(`${frozenUnitPath}/stock/RAW_yf_tuna_whole`);

    // Check
    const frozenSnap = await frozenStockRef.get();
    if (!frozenSnap.exists || frozenSnap.data().quantityKg < 500) {
        console.log("Seeding RAW TUNA for Kaimana Frozen...");
        await frozenStockRef.set({
            quantityKg: 1000,
            itemId: 'yf_tuna_whole',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } else {
        console.log(`Frozen Stock OK: ${frozenSnap.data().quantityKg} kg`);
    }

    console.log("=== STOCK READY ===");
}

checkAndSeedStock().catch(console.error);
