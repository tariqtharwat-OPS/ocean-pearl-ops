const admin = require('firebase-admin');

async function checkUser3() {
    console.log("🕵️ CHECKING SUSI SIM3 PROFILE");
    if (!admin.apps.length) admin.initializeApp({ projectId: 'oceanpearl-ops' });
    const db = admin.firestore();

    const usersSnap = await db.collection('users').where('email', '==', 'susi.sim3@oceanpearl.com').get();
    if (usersSnap.empty) {
        console.log("❌ Susi Sim3 Profile NOT FOUND in Firestore.");
    } else {
        const d = usersSnap.docs[0].data();
        console.log("✅ Susi Sim3 Profile Found:");
        console.log(JSON.stringify(d, null, 2));
    }
    process.exit(0);
}
checkUser3();
