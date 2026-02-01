const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'oceanpearl-ops' });
}

async function purgeById() {
    const ids = ['TaYdvcAERaaENQDQnWL3Hx6lnEY2', 'sLKfRbiVPvbPQL1avYzlV5MoF542'];
    for (const uid of ids) {
        try {
            console.log(`🗑️ Deleting ${uid}...`);
            await admin.auth().deleteUser(uid);
            console.log(`✅ Deleted ${uid}`);
        } catch (e) {
            console.log(`❌ Failed to delete ${uid}: ${e.message}`);
        }
    }
    process.exit(0);
}

purgeById();
