const admin = require('firebase-admin');
const fs = require('fs');
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

async function generate() {
    let content = "# WEEKLY_SIMULATION_ACCEPTANCE_REPORT_ADDENDUM.md\n\n";

    content += "## 1) Transaction Documents (Raw)\n\n";
    for (const id of txnIds) {
        const snap = await db.doc(`transactions/${id}`).get();
        content += `### transactions/${id}\n` + "```json\n" + JSON.stringify(snap.data(), (k, v) => (v && v.toDate ? v.toDate().toISOString() : v), 2) + "\n```\n\n";
    }

    content += "## 2) Stock Proof\n\n";
    for (const path of stockPaths) {
        const snap = await db.doc(path).get();
        content += `### ${path}\n` + "```json\n" + JSON.stringify(snap.data(), (k, v) => (k === 'updatedAt' || (v && v.toDate) ? (v.toDate ? v.toDate().toISOString() : v) : v), 2) + "\n```\n\n";
    }

    content += "## 3) Wallet Proof\n\n";
    for (const path of walletPaths) {
        const snap = await db.doc(path).get();
        content += `### ${path}\n` + "```json\n" + JSON.stringify(snap.data(), (k, v) => (k === 'updatedAt' || (v && v.toDate) ? (v.toDate ? v.toDate().toISOString() : v) : v), 2) + "\n```\n\n";
    }

    content += "## 4) Idempotency Proof (TRANSPORT)\n";
    content += "- **Guard Condition**: All operations are wrapped in `db.runTransaction` in `transaction_engine.js`.\n";
    content += "- **State Locking**: The `finalized: true` field is set on the `transactions/{id}` document inside the atomic block. Any retry would fail if the unique ID is already present or if the transactional read of stock/wallet fails consistency checks.\n";
    content += "- **Stock/Wallet Guard**: In `TRANSPORT`, both source and target stock references are read (`t.get`) before any write is performed, ensuring the total kg balance is maintained and never double-debited.\n\n";

    fs.writeFileSync('d:/OPS/WEEKLY_SIMULATION_ACCEPTANCE_REPORT_ADDENDUM.md', content);
    console.log("Addendum generated.");
}

generate();
