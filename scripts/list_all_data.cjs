const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'oceanpearl-ops' });
const db = admin.firestore();

async function listTx() {
    console.log("--- TRANSACTIONS ---");
    const snap = await db.collection('transactions').get();
    snap.docs.forEach(d => {
        const data = d.data();
        console.log(`[${d.id}] ${data.type} - ${data.amount} IDR - ${data.description}`);
    });

    console.log("--- FINANCIAL REQUESTS ---");
    const rSnap = await db.collection('financial_requests').get();
    rSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`[${d.id}] ${data.type} - ${data.amount} - ${data.status} - ${data.description}`);
    });
    process.exit(0);
}
listTx();
