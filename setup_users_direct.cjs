const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: 'oceanpearl-ops' });
}
const db = admin.firestore();
const auth = admin.auth();

const USERS = [
    {
        email: 'manager@kaimana.com',
        password: 'password123',
        displayName: 'Budi Manager',
        role: 'manager',
        role_v2: 'LOC_MANAGER',
        locationId: 'kaimana',
        unitId: 'all'
    },
    {
        email: 'operator@kaimana.com',
        password: 'password123',
        displayName: 'Teri Operator',
        role: 'operator',
        role_v2: 'UNIT_OP',
        locationId: 'kaimana',
        unitId: 'gudang_teri'
    },
    {
        email: 'investor@kaimana.com',
        password: 'password123',
        displayName: 'Investor Kaimana',
        role: 'viewer',
        role_v2: 'INVESTOR',
        locationId: 'kaimana',
        unitId: 'gudang_teri',
        scope: ['kaimana_gudang_teri']
    }
];

async function setupUsers() {
    console.log("🚀 Setting up Phase 2 Test Users (Backend)...");

    for (const u of USERS) {
        try {
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(u.email);
                console.log(`   User ${u.email} exists, updating...`);
                // Update password to ensure it matches test expectations
                await auth.updateUser(userRecord.uid, { password: u.password });
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    console.log(`   Creating ${u.email}...`);
                    userRecord = await auth.createUser({
                        email: u.email,
                        password: u.password,
                        displayName: u.displayName
                    });
                } else {
                    throw e;
                }
            }

            // Set Custom Claims
            await auth.setCustomUserClaims(userRecord.uid, {
                role: u.role,
                role_v2: u.role_v2,
                locationId: u.locationId,
                unitId: u.unitId
            });

            // Set Firestore Profile
            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email: u.email,
                displayName: u.displayName,
                role: u.role,
                role_v2: u.role_v2,
                locationId: u.locationId,
                unitId: u.unitId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                active: true,
                disabled: false
            }, { merge: true });

            console.log(`✅ Set up ${u.role_v2} (${u.email})`);

        } catch (err) {
            console.error(`❌ Failed to setup ${u.email}:`, err);
        }
    }
    console.log("Done.");
    process.exit(0);
}

setupUsers();
