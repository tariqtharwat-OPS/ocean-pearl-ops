const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

async function listUsers() {
    const snap = await db.collection('users').get();
    console.log(`Found ${snap.size} users in Firestore:`);
    snap.forEach(doc => {
        const d = doc.data();
        console.log(`- ${d.email} (Role: ${d.role}, V2: ${d.role_v2})`);
    });
}

listUsers().catch(console.error).then(() => process.exit(0));
