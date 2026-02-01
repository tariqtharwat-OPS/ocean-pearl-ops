const admin = require('firebase-admin');

async function cleanupAuth() {
    console.log("🧹 CLEANING SIMULATION USERS FROM AUTH 🧹");
    if (!admin.apps.length) admin.initializeApp({ projectId: 'oceanpearl-ops' });

    const TARGETS = [
        'susi.sim@oceanpearl.com',
        'budi.sim@oceanpearl.com'
    ];

    for (const email of TARGETS) {
        try {
            const user = await admin.auth().getUserByEmail(email);
            await admin.auth().deleteUser(user.uid);
            console.log(`✅ Deleted Auth User: ${email}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log(`   User not found (Clean): ${email}`);
            } else {
                console.error(`❌ Error deleting ${email}:`, e.message);
            }
        }
    }
    process.exit(0);
}

cleanupAuth();
