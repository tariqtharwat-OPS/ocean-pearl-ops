const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'oceanpearl-ops' });
}
const db = admin.firestore();

async function check() {
    const email = 'susi.sim5@oceanpearl.com';
    console.log(`🕵️ CHECKING ${email} PROFILE`);
    const snap = await db.collection('users').where('email', '==', email).get();

    if (snap.empty) {
        console.log(`❌ ${email} Profile NOT FOUND in Firestore.`);
    } else {
        const data = snap.docs[0].data();
        console.log("✅ Profile Found:");
        console.log(JSON.stringify(data, null, 2));
    }
    process.exit(0);
}

check();
