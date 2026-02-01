const admin = require('firebase-admin');

async function fixUsers() {
    console.log("🔧 FIXING USER ROLES 🔧");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();
    const auth = admin.auth();

    const usersToFix = [
        {
            email: 'susi@oceanpearl.com',
            role_v2: 'UNIT_OP',
            locationId: 'kaimana',
            unitId: 'proc-kaimana',
            name: 'Susi Susanti'
        },
        {
            email: 'budi@oceanpearl.com',
            role_v2: 'LOC_MANAGER',
            locationId: 'kaimana',
            unitId: null, // Managers are location level usually
            name: 'Pak Budi'
        }
    ];

    for (const u of usersToFix) {
        try {
            const userRecord = await auth.getUserByEmail(u.email);
            const uid = userRecord.uid;

            await db.collection('users').doc(uid).set({
                email: u.email,
                role_v2: u.role_v2,
                locationId: u.locationId,
                unitId: u.unitId || null,
                displayName: u.name,
                enabled: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`✅ Fixed User: ${u.email} (${u.role_v2})`);
        } catch (e) {
            console.error(`❌ Error fixing ${u.email}:`, e.message);
        }
    }

    console.log("✅ User Fixes Complete.");
    process.exit(0);
}

fixUsers().catch(console.error);
