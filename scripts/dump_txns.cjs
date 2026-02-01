const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    const s = await db.collection('transactions').get();
    const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
})();
