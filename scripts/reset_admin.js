const admin = require('firebase-admin');
// Initialize (ADC)
if (admin.apps.length === 0) admin.initializeApp();

async function resetAdmin() {
    const email = 'info@oceanpearlseafood.com';
    const password = 'OceanPearl2026!';

    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(user.uid, { password });
        console.log(`✅ Password reset for ${email}`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            await admin.auth().createUser({
                email,
                password,
                displayName: 'System Admin',
                emailVerified: true
            });
            console.log(`✅ Created Admin User ${email}`);

            // Also ensure Firestore Profile exists
            const db = admin.firestore();
            const userRec = await admin.auth().getUserByEmail(email);
            await db.collection('users').doc(userRec.uid).set({
                email,
                role: 'admin',
                displayName: 'System Admin',
                locationId: 'hq',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log("✅ Created Firestore Profile");

        } else {
            console.error(e);
        }
    }
}

resetAdmin().then(() => process.exit(0));
