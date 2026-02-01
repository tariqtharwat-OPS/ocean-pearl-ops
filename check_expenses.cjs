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
        const snap = await db.collection('expenses').get();
        console.log(`Total Expenses: ${snap.size}`);
        snap.forEach(doc => {
            console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
        });
    } catch (e) {
        console.error(e);
    }
})();
