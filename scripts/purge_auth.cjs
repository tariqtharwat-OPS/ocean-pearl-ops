const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'oceanpearl-ops' });
}

async function purgeAuth() {
    const emails = ['susi.sim5@oceanpearl.com', 'budi.sim5@oceanpearl.com'];
    for (const email of emails) {
        try {
            const user = await admin.auth().getUserByEmail(email);
            console.log(`🗑️ Deleting ${email} (${user.uid})...`);
            await admin.auth().deleteUser(user.uid);
            console.log(`✅ Deleted ${email}`);
        } catch (e) {
            console.log(`ℹ️ ${email} not found in Auth or already deleted.`);
        }
    }
    process.exit(0);
}

purgeAuth();
