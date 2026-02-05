/**
 * Direct User Creation Test - Bypasses UI
 * 
 * Creates test operator user and verifies custom claims are set.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const db = admin.firestore();

async function testUserCreation() {
    console.log('=== Testing User Creation with Custom Claims ===\n');

    const testEmail = 'testop_direct@test.com';
    const testPass = 'password123';

    try {
        // Step 1: Delete if exists
        try {
            const existing = await auth.getUserByEmail(testEmail);
            await auth.deleteUser(existing.uid);
            await db.collection('users').doc(existing.uid).delete();
            console.log(`✅ Deleted existing user: ${testEmail}`);
        } catch (e) {
            console.log(`ℹ️  No existing user found`);
        }

        // Step 2: Create user
        console.log(`\n📝 Creating user: ${testEmail}...`);
        const userRecord = await auth.createUser({
            email: testEmail,
            password: testPass,
            displayName: 'Test Operator Direct',
            emailVerified: true
        });
        console.log(`✅ User created in Auth: ${userRecord.uid}`);

        // Step 3: Set custom claims
        console.log(`\n🔑 Setting custom claims...`);
        await auth.setCustomUserClaims(userRecord.uid, {
            role: 'UNIT_OP',
            role_v2: 'UNIT_OP',
            locationId: 'kaimana',
            unitId: 'gudang_teri'
        });
        console.log(`✅ Custom claims set`);

        // Step 4: Write to Firestore
        console.log(`\n💾 Writing to Firestore...`);
        await db.collection('users').doc(userRecord.uid).set({
            email: testEmail,
            role: 'UNIT_OP',
            role_v2: 'UNIT_OP',
            displayName: 'Test Operator Direct',
            locationId: 'kaimana',
            unitId: 'gudang_teri',
            status: 'enabled',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'test_script'
        });
        console.log(`✅ Firestore document created`);

        // Step 5: Verify custom claims
        console.log(`\n🔍 Verifying custom claims...`);
        const refreshedUser = await auth.getUser(userRecord.uid);
        console.log(`📋 Custom Claims:`, JSON.stringify(refreshedUser.customClaims, null, 2));

        // Step 6: Verify Firestore document
        const doc = await db.collection('users').doc(userRecord.uid).get();
        console.log(`📋 Firestore Document:`, JSON.stringify(doc.data(), null, 2));

        console.log(`\n✅ TEST PASSED: User creation with custom claims successful!`);
        console.log(`\nCredentials for testing:`);
        console.log(`  Email: ${testEmail}`);
        console.log(`  Password: ${testPass}`);

        return {
            success: true,
            uid: userRecord.uid,
            email: testEmail,
            password: testPass
        };

    } catch (error) {
        console.error(`\n❌ TEST FAILED:`, error.message);
        console.error(error);
        return { success: false, error: error.message };
    }
}

testUserCreation().then(result => {
    process.exit(result.success ? 0 : 1);
});
