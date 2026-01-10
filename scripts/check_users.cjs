const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

async function checkUsers() {
    const emails = [
        'tariq@oceanpearlseafood.com',
        'head.kaimana@oceanpearlseafood.com',
        'staff.kaimana@oceanpearlseafood.com'
    ];

    console.log("Checking Firestore Users...");
    for (const email of emails) {
        const snap = await db.collection('users').where('email', '==', email).get();
        if (snap.empty) {
            console.log(`[MISSING] ${email} - No Firestore Doc`);
        } else {
            const data = snap.docs[0].data();
            console.log(`[FOUND] ${email}: Role=${data.role}, RoleV2=${data.role_v2}, Scope=${data.locationId}/${data.unitId}`);

            // Fix if missing V2 roles or scopes
            const updates = {};
            if (email.startsWith('tariq') && (!data.role_v2 || data.role_v2 !== 'HQ_ADMIN')) updates.role_v2 = 'HQ_ADMIN';
            if (email.startsWith('head') && (!data.role_v2 || data.role_v2 !== 'LOC_MANAGER')) updates.role_v2 = 'LOC_MANAGER';
            if (email.startsWith('staff') && (!data.role_v2 || data.role_v2 !== 'UNIT_OP')) updates.role_v2 = 'UNIT_OP';

            if (Object.keys(updates).length > 0) {
                console.log(`   -> Updating ${email} with `, updates);
                await db.collection('users').doc(snap.docs[0].id).update(updates);
            }
        }
    }
}

checkUsers().catch(console.error).then(() => process.exit(0));
