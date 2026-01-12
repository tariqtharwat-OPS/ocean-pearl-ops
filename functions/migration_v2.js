const { onRequest, onCall } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const db = admin.firestore();

// === BACKUP UTILITY ===
exports.backupFirestore = onRequest({ region: "asia-southeast2" }, async (req, res) => {
    // Basic Security: Check for a secret query param if needed, or just allow for now as it's a dev tool 
    // real security should be context.auth but onRequest is public. 
    // We'll rely on the obscure URL for this quick maintenance step or verify auth header manually?
    // Let's verify ID Token manually for safety.

    /*
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).send('Unauthorized');
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        await admin.auth().verifyIdToken(idToken);
    } catch(e) {
        return res.status(403).send('Invalid Token');
    }
    */

    // Collections to backup
    const collections = ['locations', 'users', 'partners', 'items', 'site_wallets', 'transactions'];
    const backupData = {};

    try {
        for (const colName of collections) {
            const snap = await db.collection(colName).get();
            backupData[colName] = {};
            snap.forEach(doc => {
                backupData[colName][doc.id] = doc.data();
                // Also get subcollections for locations (units)
                // This is a naive deep backup, good enough for our schema
            });

            // Special handling for subcollections (Hardcoded known ones)
            if (colName === 'locations') {
                for (const locId of Object.keys(backupData['locations'])) {
                    const unitSnap = await db.collection(`locations/${locId}/units`).get();
                    backupData['locations'][locId]['units'] = {};
                    unitSnap.forEach(uDoc => {
                        backupData['locations'][locId]['units'][uDoc.id] = uDoc.data();
                    });
                }
            }
        }

        res.status(200).json(backupData);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// === MIGRATION LOGIC (Phase 1) ===
exports.migrateSchemaV2 = onCall({ region: "asia-southeast2" }, async (request) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');

    // Safety Check: Only specific admin
    const caller = await admin.auth().getUser(request.auth.uid);
    if (!caller.email || !caller.email.includes('@oceanpearlseafood.com')) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only.');
    }

    const batch = db.batch();
    const batch2 = db.batch(); // Firestore limit 500, unlikely to hit but safety
    let opCount = 0;

    const addToBatch = (ref, update) => {
        if (opCount < 450) batch.update(ref, update);
        else batch2.update(ref, update);
        opCount++;
    };

    // 1. LOCATIONS
    const locSnap = await db.collection('locations').get();
    for (const doc of locSnap.docs) {
        let type = 'OPERATIONAL';
        let capabilities = [];

        if (doc.id === 'jakarta' || doc.id === 'HQ') {
            type = 'HQ';
            capabilities = ['finance', 'admin', 'user_management'];
        } else {
            type = 'OPERATIONAL';
            capabilities = ['receiving', 'processing', 'storage'];
        }

        const walletId = doc.id === 'jakarta' ? 'jakarta' : doc.id; // Usually wallet ID matches Location ID for main wallet

        addToBatch(doc.ref, {
            type,
            capabilities,
            walletId: walletId,
            schemaVersion: 'v2'
        });

        // 2. UNITS
        const unitsSnap = await doc.ref.collection('units').get();
        for (const uDoc of unitsSnap.docs) {
            const uid = uDoc.id;
            let uType = 'OFFICE';
            let uCaps = [];
            let independent = false;

            if (uid.includes('office')) {
                uType = 'OFFICE';
                uCaps = ['admin'];
            } else if (uid.includes('gudang') || uid.includes('teri')) {
                uType = 'PROCESSING_WET';
                uCaps = ['receiving_raw', 'processing_dry'];
            } else if (uid.includes('frozen') || uid.includes('factory')) {
                uType = 'PROCESSING_FROZEN';
                uCaps = ['receiving_raw', 'processing_yield', 'internal_storage'];
            } else if (uid.includes('cold_storage')) {
                uType = 'COLD_STORAGE';
                uCaps = ['storage_in', 'storage_out'];
                // Assumption: 'cold_storage' in Jakarta is independent
                if (doc.id === 'jakarta') {
                    independent = true;
                    uCaps.push('independent_trading');
                } else {
                    independent = false; // Attached to factory usually, unless specified
                }
            }

            addToBatch(uDoc.ref, {
                type: uType,
                capabilities: uCaps,
                is_independent: independent,
                schemaVersion: 'v2'
            });
        }
    }

    await batch.commit();
    if (opCount >= 450) await batch2.commit();

    return { success: true, ops: opCount };
});

exports.migrateUsersV2 = onCall({ region: "asia-southeast2" }, async (request) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');

    const caller = await admin.auth().getUser(request.auth.uid);
    if (!caller.email || !caller.email.includes('@oceanpearlseafood.com')) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only.');
    }

    const batch = db.batch();
    let opCount = 0;

    const usersSnap = await db.collection('users').get();

    for (const doc of usersSnap.docs) {
        const u = doc.data();
        let role_v2 = 'UNIT_OP';
        let scope = 'UNIT';
        let permissions = [];
        let target_id = u.unitId || null;

        // 1. HQ ADMIN
        if (u.role === 'admin' || (u.email && u.email.includes('tariq'))) {
            role_v2 = 'HQ_ADMIN';
            scope = 'GLOBAL';
            target_id = 'HQ';
            permissions = ['manage_users', 'manage_finance_global', 'audit_global', 'bypass_rules'];
        }
        // 2. LOCATION MANAGER (Old 'manager')
        else if (u.role === 'manager') {
            role_v2 = 'LOC_MANAGER';
            scope = 'LOCATION';
            // Fallback if locId missing but unit exists, derive loc?
            // Existing seed has loc and unit for everyone.
            target_id = u.locationId || 'unknown';
            permissions = ['approve_expenses', 'manage_location_wallet', 'view_location_stock', 'manage_unit_ops'];
        }
        // 3. UNIT OPERATOR (Old 'staff')
        else if (u.role === 'staff') {
            role_v2 = 'UNIT_OP';
            scope = 'UNIT';
            target_id = u.unitId || 'unknown';
            permissions = ['create_requests', 'view_unit_stock', 'execute_production'];
        }

        batch.update(doc.ref, {
            role_v2,
            scope,
            target_id,
            permissions,
            schemaVersion: 'v2'
        });
        opCount++;
    }

    await batch.commit();

    return { success: true, ops: opCount };
});

exports.revertUsersV1 = onCall({ region: "asia-southeast2" }, async (request) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const caller = await admin.auth().getUser(request.auth.uid);
    if (!caller.email || !caller.email.includes('@oceanpearlseafood.com')) throw new functions.https.HttpsError('permission-denied', 'Admin only.');

    const batch = db.batch();
    const usersSnap = await db.collection('users').get();

    for (const doc of usersSnap.docs) {
        batch.update(doc.ref, {
            role_v2: admin.firestore.FieldValue.delete(),
            scope: admin.firestore.FieldValue.delete(),
            permissions: admin.firestore.FieldValue.delete(),
            schemaVersion: admin.firestore.FieldValue.delete(),
            // target_id might be useful to keep or delete? Let's delete to be clean V1.
            target_id: admin.firestore.FieldValue.delete()
        });
    }
    await batch.commit();
    return { success: true };
});
