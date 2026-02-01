const admin = require('firebase-admin');

async function checkUser3() {
    console.log("🕵️ CHECKING BUDI SIM2 PROFILE");
    if (!admin.apps.length) admin.initializeApp({ projectId: 'oceanpearl-ops' });
    const db = admin.firestore();

    const usersSnap = await db.collection('users').where('email', '==', 'budi.sim2@oceanpearl.com').get();
    if (usersSnap.empty) {
        console.log("❌ Budi Sim2 Profile NOT FOUND in Firestore.");
    } else {
        const d = usersSnap.docs[0].data();
        console.log("✅ Budi Sim2 Profile Found:");
        console.log(JSON.stringify(d, null, 2));
    }
    process.exit(0);
}
checkUser3();
