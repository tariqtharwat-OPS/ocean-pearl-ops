const admin = require('firebase-admin');

async function wipeAuthUsers() {
    console.log("⚠️ WIPING AUTH USERS (PRE-SIMULATION CLEANUP) ⚠️");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }

    const usersToDelete = ['budi@oceanpearl.com', 'susi@oceanpearl.com'];

    for (const email of usersToDelete) {
        try {
            console.log(`Checking ${email}...`);
            const user = await admin.auth().getUserByEmail(email);
            console.log(`   Found UID: ${user.uid}. Deleting...`);
            await admin.auth().deleteUser(user.uid);
            console.log(`   ✅ Deleted ${email}`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`   ✅ ${email} already deleted (not found).`);
            } else {
                console.error(`   ❌ Failed to delete ${email}:`, error.message);
            }
        }
    }

    // Also verify Firestore docs are gone for them
    const db = admin.firestore();
    console.log("Verifying Firestore cleanup...");
    const snapshot = await db.collection('users').where('email', 'in', usersToDelete).get();
    if (!snapshot.empty) {
        console.log(`   Found ${snapshot.size} stale Firestore docs. Deleting...`);
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log("   ✅ Stale docs deleted.");
    } else {
        console.log("   ✅ Firestore clean.");
    }

    console.log("🎉 AUTH WIPE COMPLETE.");
    process.exit(0);
}

wipeAuthUsers();
