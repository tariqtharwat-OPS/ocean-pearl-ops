const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const txnIds = [
    'yYCZVVQ7SNmugle7qS2X',
    'YG1BrpN8H7u7xWV2uwkK',
    'mQ5CLzv6iqxRXyb9dQEI',
    'BnxML7eG6yYMh80az03H',
    'qWEMuZQa6PJUG4S6a4v2',
    'cWJO6my714jWDPzwK0mM'
];

const stockPaths = [
    'locations/kaimana/units/gudang_ikan_teri/stock/COLD_teri_grade_a_NA',
    'locations/jakarta/units/office/stock/COLD_teri_grade_a_NA'
];

const walletPaths = [
    'site_wallets/kaimana_gudang_ikan_teri',
    'site_wallets/jakarta_office'
];

async function dump() {
    console.log("--- RAW TRANSACTIONS ---");
    for (const id of txnIds) {
        const snap = await db.doc(`transactions/${id}`).get();
        console.log(`Document: transactions/${id}`);
        console.log(JSON.stringify(snap.data(), (key, value) =>
            value && value.toDate ? value.toDate().toISOString() : value, 2));
        console.log("---");
    }

    console.log("\n--- RAW STOCK DOCUMENTS ---");
    for (const path of stockPaths) {
        const snap = await db.doc(path).get();
        console.log(`Document: ${path}`);
        console.log(JSON.stringify(snap.data(), (key, value) =>
            value && value.toDate ? value.toDate().toISOString() : value, 2));
        console.log("---");
    }

    console.log("\n--- RAW WALLET DOCUMENTS ---");
    for (const path of walletPaths) {
        const snap = await db.doc(path).get();
        console.log(`Document: ${path}`);
        console.log(JSON.stringify(snap.data(), (key, value) =>
            value && value.toDate ? value.toDate().toISOString() : value, 2));
        console.log("---");
    }
}

dump();
