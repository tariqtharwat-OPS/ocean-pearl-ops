const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}
const db = getFirestore();

async function fix() {
    const snap = await db.collection('users').where('email', '==', 'tariq@oceanpearlseafood.com').get();
    if (snap.empty) {
        console.log("Tariq not found");
        return;
    }
    const doc = snap.docs[0];
    await doc.ref.update({
        role: 'ceo',
        role_v2: 'HQ_ADMIN'
    });
    console.log("✅ Fixed Tariq's role.");
}

fix();
