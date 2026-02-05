const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with application default credentials
const app = initializeApp({
    projectId: 'oceanpearl-ops'
});

const auth = getAuth(app);
const db = getFirestore(app);

async function forceFix() {
    console.log("🛠️ Force Fixing Phase 2 Users...");

    const users = [
        {
            email: 'manager@kaimana.com',
            password: 'password123',
            role_v2: 'LOC_MANAGER',
            locationId: 'kaimana',
            unitId: 'all'
        },
        {
            email: 'investor@kaimana.com',
            password: 'password123',
            role_v2: 'INVESTOR',
            locationId: 'kaimana',
            unitId: 'gudang_teri'
        }
    ];

    for (const u of users) {
        try {
            console.log(`Processing ${u.email}...`);
            let uid;
            try {
                const existing = await auth.getUserByEmail(u.email);
                uid = existing.uid;
                console.log(`   Found UID: ${uid}`);
                await auth.updateUser(uid, {
                    password: u.password,
                    emailVerified: true,
                    disabled: false
                });
                console.log(`   ✅ Password Reset to ${u.password}`);
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    console.log(`   User not found, creating...`);
                    const created = await auth.createUser({
                        email: u.email,
                        password: u.password,
                        displayName: u.role_v2 === 'LOC_MANAGER' ? 'Budi Manager' : 'Investor Kaimana',
                        emailVerified: true
                    });
                    uid = created.uid;
                } else {
                    throw e;
                }
            }

            // Force Claims
            const claims = {
                role: 'viewer', // legacy fallback
                role_v2: u.role_v2,
                locationId: u.locationId,
                unitId: u.unitId
            };
            await auth.setCustomUserClaims(uid, claims);
            console.log(`   ✅ Claims Set:`, claims);

            // Force Firestore
            await db.collection('users').doc(uid).set({
                email: u.email,
                role: 'viewer',
                role_v2: u.role_v2,
                locationId: u.locationId,
                unitId: u.unitId,
                displayName: u.role_v2 === 'LOC_MANAGER' ? 'Budi Manager' : 'Investor Kaimana',
                status: 'enabled',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`   ✅ Firestore Profile Updated`);

        } catch (err) {
            console.error(`❌ Error processing ${u.email}:`, err);
        }
    }
    console.log("Done.");
    process.exit(0);
}

forceFix();
