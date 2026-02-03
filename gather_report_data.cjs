const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const ids = [
    'yYCZVVQ7SNmugle7qS2X',
    'YG1BrpN8H7u7xWV2uwkK',
    'mQ5CLzv6iqxRXyb9dQEI',
    'BnxML7eG6yYMh80az03H',
    'qWEMuZQa6PJUG4S6a4v2',
    'cWJO6my714jWDPzwK0mM'
];

async function gather() {
    console.log("--- TRANSACTIONS ---");
    for (const id of ids) {
        const snap = await db.doc(`transactions/${id}`).get();
        if (snap.exists) {
            const d = snap.data();
            console.log(`ID: ${id} | Type: ${d.type} | Qty: ${d.quantityKg || 0} | Amt: ${d.totalAmount || 0} | Loc: ${d.locationId}/${d.unitId} -> ${d.targetLocationId || 'NONE'}/${d.targetUnitId || 'NONE'}`);
        }
    }

    console.log("\n--- RECONCILIATION ---");
    const paths = {
        kaimana_stock: 'locations/kaimana/units/gudang_ikan_teri/stock/COLD_teri_grade_a_NA',
        jakarta_stock: 'locations/jakarta/units/office/stock/COLD_teri_grade_a_NA',
        kaimana_wallet: 'site_wallets/kaimana_gudang_ikan_teri',
        jakarta_wallet: 'site_wallets/jakarta_office'
    };

    for (const [key, path] of Object.entries(paths)) {
        const snap = await db.doc(path).get();
        console.log(`${key}: ${snap.exists ? (snap.data().quantityKg ?? snap.data().balance) : 'MISSING'}`);
    }
}

gather();
