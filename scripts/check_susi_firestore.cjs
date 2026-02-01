const admin = require('firebase-admin');

async function checkUser() {
    console.log("🕵️ CHECKING SUSI USER PROFILE");
    if (!admin.apps.length) admin.initializeApp({ projectId: 'oceanpearl-ops' });
    const db = admin.firestore();

    const usersSnap = await db.collection('users').where('email', '==', 'susi.sim@oceanpearl.com').get();
    if (usersSnap.empty) {
        console.log("❌ Susi Profile NOT FOUND in Firestore.");
    } else {
        const d = usersSnap.docs[0].data();
        console.log("✅ Susi Profile Found:");
        console.log(JSON.stringify(d, null, 2));
    }
    process.exit(0);
}
checkUser();
