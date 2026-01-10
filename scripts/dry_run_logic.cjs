const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

async function dryRun(uid) {
    console.log("Dry Run for UID:", uid);

    // Simulate Request Data
    const data = {
        type: 'EXPENSE',
        amount: 75000,
        description: 'Dry Run Test',
        category: 'Test',
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri'
    };

    console.log("Input Data:", data);

    try {
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) throw new Error('User not found');

        const u = userSnap.data();
        console.log("User Fetched:", u.email, u.role_v2);

        // Permission Logic Copy-Paste
        if (u.role_v2 === 'UNIT_OP') {
            if (data.type === 'FUNDING') throw new Error('Unit Ops cannot request HQ Funding.');
            if (data.unitId !== u.target_id) throw new Error('Cannot request for another unit.'); // BUG HERE? target_id might be undefined in u
        } else if (u.role_v2 === 'LOC_MANAGER') {
            if (data.locationId !== u.target_id) throw new Error('Cannot request for another location.');
        }

        console.log("Permissions Passed");

        const requestData = {
            requesterId: uid,
            requesterName: u.displayName || 'Unknown',
            type: data.type,
            amount: parseFloat(data.amount),
            description: data.description,
            category: data.category || 'General',
            locationId: data.locationId,
            unitId: data.unitId || null,
            status: 'PENDING',
            proofImage: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            history: [{ action: 'CREATED', by: uid, at: new Date().toISOString() }]
        };

        const res = await db.collection('financial_requests').add(requestData);
        console.log("Success! Created Request ID:", res.id);

    } catch (e) {
        console.error("DRY RUN FAILED:", e);
    }
}

// UID from previous step
dryRun('RAz3GQCyA5Rh7j09OPpSQtaxd0k1').catch(console.error).then(() => process.exit(0));
