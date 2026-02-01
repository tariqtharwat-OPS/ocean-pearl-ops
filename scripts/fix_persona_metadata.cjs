const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("🛠️ FIXING PERSONA METADATA (target_id) 🛠️");

    const emails = [
        { email: 'budi.sim5.official@oceanpearl.com', target: 'kaimana' },
        { email: 'susi.sim5.official@oceanpearl.com', target: 'gudang_ikan_teri' }
    ];

    for (const item of emails) {
        const snap = await db.collection('users').where('email', '==', item.email).get();
        if (!snap.empty) {
            const docId = snap.docs[0].id;
            await db.collection('users').doc(docId).update({
                target_id: item.target
            });
            console.log(`✅ Updated ${item.email} with target_id: ${item.target}`);
        } else {
            console.log(`⚠️ User not found: ${item.email}`);
        }
    }

    process.exit(0);
})();
