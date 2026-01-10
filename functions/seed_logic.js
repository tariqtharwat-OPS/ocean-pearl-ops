const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Do NOT initialize app here globally if index.js does it.
// However, ensure we have an app context if accessed in isolation (which shouldn't happen in Cloud Functions env as index.js is entry).
// We will access Firestore lazily inside the function.

exports.performGreatWipe = functions.region('asia-southeast2').https.onRequest(async (req, res) => {
    // Lazy load DB to ensure App is initialized by index.js by the time this runs
    const db = getFirestore('ops1');

    try {
        const batch = db.batch();

        // 1. SEED LOCATIONS
        const LOCATIONS = {
            'jakarta': {
                label: 'Jakarta HO',
                units: [{ id: 'head_office', label: 'Head Office' }]
            },
            'kaimana': {
                label: 'Kaimana',
                units: [
                    { id: 'gudang', label: 'Gudang' },
                    { id: 'frozen_fish', label: 'Frozen Fish' }
                ]
            },
            'saumlaki': {
                label: 'Saumlaki',
                units: [{ id: 'frozen_fish', label: 'Frozen Fish' }]
            }
        };

        for (const [locId, locData] of Object.entries(LOCATIONS)) {
            const locRef = db.collection('locations').doc(locId);
            batch.set(locRef, {
                label: locData.label,
                active: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            for (const unit of locData.units) {
                const unitRef = locRef.collection('units').doc(unit.id);
                batch.set(unitRef, {
                    label: unit.label,
                    active: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        // 3. SEED USERS (Golden List)
        const USERS = [
            // Level 3: System Admin
            { email: 'tariq@oceanpearlseafood.com', role: 'admin', loc: null, unit: null, name: 'Tariq (CEO)' },
            { email: 'info@oceanpearlseafood.com', role: 'admin', loc: null, unit: null, name: 'System Info' },

            // Level 2: Location Admin
            { email: 'admin_kaimana@ops.com', role: 'manager', loc: 'kaimana', unit: null, name: 'Admin Kaimana' },
            { email: 'admin_saumlaki@ops.com', role: 'manager', loc: 'saumlaki', unit: null, name: 'Admin Saumlaki' },

            // Level 1: Unit User
            { email: 'user_jakarta_ho@ops.com', role: 'staff', loc: 'jakarta', unit: 'head_office', name: 'Staff Jakarta' },
            { email: 'user_kaimana_gudang@ops.com', role: 'staff', loc: 'kaimana', unit: 'gudang', name: 'Staff Kaimana Gudang' },
            { email: 'user_kaimana_frozen@ops.com', role: 'staff', loc: 'kaimana', unit: 'frozen_fish', name: 'Staff Kaimana Frozen' },
            { email: 'user_saumlaki_frozen@ops.com', role: 'staff', loc: 'saumlaki', unit: 'frozen_fish', name: 'Staff Saumlaki' }
        ];

        for (const u of USERS) {
            // A. Update/Create Auth
            let uid;
            try {
                const userRecord = await admin.auth().getUserByEmail(u.email);
                uid = userRecord.uid;
                await admin.auth().updateUser(uid, {
                    password: 'OceanPearl2026!',
                    displayName: u.name,
                    emailVerified: true
                });
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    const newUser = await admin.auth().createUser({
                        email: u.email,
                        password: 'OceanPearl2026!',
                        displayName: u.name,
                        emailVerified: true
                    });
                    uid = newUser.uid;
                } else {
                    throw e;
                }
            }

            // B. Update/Create Firestore Profile
            const userRef = db.collection('users').doc(uid);
            batch.set(userRef, {
                email: u.email,
                displayName: u.name,
                role: u.role,
                locationId: u.loc,
                unitId: u.unit,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                phase: '9.5'
            });
        }

        await batch.commit();
        res.status(200).send({ success: true, message: "Great Wipe & Seed Complete." });

    } catch (err) {
        console.error("Wipe Error", err);
        res.status(500).send({ error: err.message });
    }
});
