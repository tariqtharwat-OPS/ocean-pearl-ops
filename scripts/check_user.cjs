const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function checkUser(email) {
    try {
        console.log(`🔍 Checking user: ${email}...`);
        const userRecord = await auth.getUserByEmail(email);
        console.log("✅ Auth Record Found:");
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Disabled: ${userRecord.disabled}`);
        console.log(`   EmailVerified: ${userRecord.emailVerified}`);

        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (userDoc.exists) {
            console.log("✅ Firestore Profile Found:");
            console.log(userDoc.data());
        } else {
            console.error("❌ Firestore Profile MISSING!");
        }

    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

checkUser('manager_kaimana_budi@ops.com').then(() => process.exit(0));
