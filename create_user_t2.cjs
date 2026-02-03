const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}
const db = getFirestore();

async function create() {
    const email = 'kaimana_op@example.com';
    const password = 'Password123!';
    const displayName = 'Kaimana Operator';
    const role_v2 = 'UNIT_OP';
    const locationId = 'kaimana';
    const unitId = 'kn_warehouse';

    try {
        console.log(`Creating user ${email}...`);
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName
        });

        await db.collection('users').doc(userRecord.uid).set({
            email,
            role: 'operator',
            role_v2,
            displayName,
            locationId,
            unitId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            active: true
        });

        console.log(`✅ User ${email} created successfully with UID ${userRecord.uid}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

create();
