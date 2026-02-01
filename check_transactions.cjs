const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}
const db = getFirestore();

(async () => {
    try {
        const snap = await db.collection('transactions').orderBy('createdAt', 'desc').limit(5).get();
        console.log(`Recent Transactions: ${snap.size}`);
        snap.forEach(doc => {
            console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
        });
    } catch (e) {
        console.error(e);
    }
})();
