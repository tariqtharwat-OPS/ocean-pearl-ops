const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}
const db = getFirestore();

async function wipe() {
    console.log("🧹 Wiping personnel (keeping super-admins)...");
    const snap = await db.collection('users').get();
    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.email === 'info@oceanpearlseafood.com' || data.email === 'tariq@oceanpearlseafood.com') {
            console.log(`Skipping super-admin: ${data.email}`);
            continue;
        }
        await admin.auth().deleteUser(doc.id).catch(e => console.log(`Auth delete failed for ${data.email}: ${e.message}`));
        await doc.ref.delete();
        console.log(`Deleted: ${data.email}`);
    }
    console.log("✅ Personnel cleanup complete.");
}

wipe();
