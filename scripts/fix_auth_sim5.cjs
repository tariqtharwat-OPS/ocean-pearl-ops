const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'oceanpearl-ops' });
}

async function verifyAuth() {
    const email = 'susi.sim5@oceanpearl.com';
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`✅ Auth user found: ${userRecord.uid}`);

        // Let's force reset the password to be sure
        await admin.auth().updateUser(userRecord.uid, {
            password: 'Password123!'
        });
        console.log("✅ Password reset to 'Password123!'");
    } catch (e) {
        console.log(`❌ Auth user NOT FOUND: ${e.message}`);

        // If not found, create it as emergency
        console.log("Attempting emergency creation in Auth...");
        const userRec = await admin.auth().createUser({
            email,
            password: 'Password123!',
            displayName: 'Susi Susanti'
        });
        console.log(`✅ Emergency Auth user created: ${userRec.uid}`);
    }

    // Also check Budi
    try {
        const emailB = 'budi.sim5@oceanpearl.com';
        const userB = await admin.auth().getUserByEmail(emailB);
        console.log(`✅ Budi Auth found: ${userB.uid}`);
        await admin.auth().updateUser(userB.uid, { password: 'Password123!' });
    } catch (e) {
        console.log(`❌ Budi Auth NOT FOUND: ${e.message}`);
    }

    process.exit(0);
}

verifyAuth();
