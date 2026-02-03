const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}
const db = getFirestore();

async function check() {
    try {
        const snap = await db.collection('users').get();
        console.log(`Found ${snap.size} users.`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`- ${data.email} (${data.role_v2})`);
        });
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
