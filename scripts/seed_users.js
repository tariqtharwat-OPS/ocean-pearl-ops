import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Initialize Admin SDK (assumes GOOGLE_APPLICATION_CREDENTIALS set or running in emulator)
// If running against live, ensure you have credentials.
// For now, we simulate or print instructions if credentials missing.
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) {
        console.log("Could not init default app, trying projectId");
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
}

const USERS = [
    {
        email: 'tariq@oceanpearlseafood.com',
        password: 'password123',
        role: 'HQ_ADMIN',
        displayName: 'Tariq (CEO)',
        locationId: 'global',
        role_v2: 'HQ_ADMIN'
    },
    {
        email: 'head.kaimana@oceanpearlseafood.com',
        password: 'password123',
        role: 'LOC_MANAGER',
        displayName: 'Head Kaimana',
        locationId: 'kaimana',
        role_v2: 'LOC_MANAGER'
    },
    {
        email: 'staff.kaimana@oceanpearlseafood.com',
        password: 'password123',
        role: 'UNIT_OP',
        displayName: 'Staff Kaimana Gudang',
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        role_v2: 'UNIT_OP'
    }
];

async function seed() {
    console.log("Starting User Seeding...");

    for (const u of USERS) {
        try {
            // 1. Create or Get User
            let userRecord;
            try {
                userRecord = await getAuth().getUserByEmail(u.email);
                console.log(`User ${u.email} exists. Updating password...`);
                await getAuth().updateUser(userRecord.uid, { password: u.password });
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    console.log(`Creating ${u.email}...`);
                    userRecord = await getAuth().createUser({
                        email: u.email,
                        password: u.password,
                        emailVerified: true
                    });
                } else {
                    throw error;
                }
            }

            // 2. Set Custom Claims / Firestore Role Doc
            // We use Firestore 'users' collection for role management in this app structure
            // as seen in AuthContext.jsx

            const userDoc = {
                email: u.email,
                role: u.role,
                role_v2: u.role_v2,
                displayName: u.displayName,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (u.locationId) userDoc.locationId = u.locationId;
            if (u.unitId) userDoc.unitId = u.unitId;

            await admin.firestore().collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
            console.log(`Verified Firestore profile for ${u.email}`);

        } catch (err) {
            console.error(`Failed to process ${u.email}:`, err);
        }
    }

    console.log("Seeding Complete.");
    process.exit(0);
}

seed();
