const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Admin SDK - Logic to find creds or use default
try {
    const serviceAccount = require("d:/OPS/serviceAccountKey.json"); // Try common location
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.log("No serviceAccountKey.json found, trying default credentials...");
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
}

const db = getFirestore();

async function seed() {
    console.log("Starting Realistic Seeding...");
    const batch = db.batch();

    // ============================================
    // 1. CLEAR EXISTING DATA (Optional/Safe?)
    // ============================================
    // Keeping it additive/merge for safety, but resetting specific known items.

    // ============================================
    // 2. USERS (Canonical)
    // ============================================
    const USERS = [
        { email: 'tariq@oceanpearlseafood.com', name: 'Tariq (CEO)', role_v2: 'HQ_ADMIN', loc: 'jakarta', unit: 'office' },
        { email: 'sarah@oceanpearlseafood.com', name: 'Sarah (HQ Admin)', role_v2: 'HQ_ADMIN', loc: 'jakarta', unit: 'office' },
        { email: 'budi@oceanpearlseafood.com', name: 'Pak Budi (Manager)', role_v2: 'LOC_MANAGER', loc: 'kaimana', unit: 'frozen_fish' },
        { email: 'usi@oceanpearlseafood.com', name: 'Ibu Usi (Operator)', role_v2: 'UNIT_OP', loc: 'kaimana', unit: 'gudang_ikan_teri' },
        { email: 'investor@oceanpearlseafood.com', name: 'Lukas (Investor)', role_v2: 'READ_ONLY', loc: null, unit: null }
    ];

    for (const u of USERS) {
        console.log(`Processing User: ${u.email}`);
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(u.email);
            uid = userRecord.uid;
            await admin.auth().updateUser(uid, {
                displayName: u.name,
                password: 'OceanPearl2026!',
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
                console.error(`Error Auth ${u.email}: ${e.message}`);
                continue;
            }
        }

        batch.set(db.collection('users').doc(uid), {
            email: u.email,
            displayName: u.name,
            role_v2: u.role_v2,
            locationId: u.loc,
            unitId: u.unit,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // ============================================
    // 3. MASTER DATA
    // ============================================
    const locs = [
        { id: 'kaimana', label: 'Kaimana', units: ['frozen_fish', 'gudang_ikan_teri'] },
        { id: 'jakarta', label: 'HQ Jakarta', units: ['office', 'cold_storage'] }
    ];
    for (const loc of locs) {
        batch.set(db.collection('locations').doc(loc.id), { label: loc.label, active: true }, { merge: true });
        for (const unitId of loc.units) {
            batch.set(db.doc(`site_wallets/${unitId}`), {
                balance: 100000000,
                locationId: loc.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }

    const items = [
        { id: 'kakap_merah', name: 'Red Snapper (Whole)', uom: 'kg' },
        { id: 'tuna_whole', name: 'Yellowfin Tuna (Whole)', uom: 'kg' },
        { id: 'tuna_loin', name: 'YF Tuna Loin', uom: 'kg' },
        { id: 'kakap_fillet', name: 'Red Snapper Fillet', uom: 'kg' },
        { id: 'teri_raw', name: 'Anchovy (Raw)', uom: 'kg' },
        { id: 'teri_dry', name: 'Anchovy (Dried)', uom: 'kg' }
    ];
    for (const item of items) {
        batch.set(db.collection('items').doc(item.id), { ...item, active: true }, { merge: true });
    }

    // ============================================
    // 4. INVENTORY (Snapshot for Shark)
    // ============================================
    // Path: locations/{loc}/units/{unit}/stock/{docId}
    // Data: { quantityKg: number, ... }

    // Kaimana Frozen Fish Stock
    const kaimanaUnitRef = db.doc('locations/kaimana/units/frozen_fish');
    batch.set(kaimanaUnitRef, { label: 'Frozen Fish', active: true }, { merge: true }); // Parent Doc
    batch.set(kaimanaUnitRef.collection('stock').doc('RAW_kakap_merah'), {
        itemId: 'kakap_merah', quantityKg: 100, label: 'Red Snapper (Whole)', type: 'RAW'
    });
    batch.set(kaimanaUnitRef.collection('stock').doc('RAW_tuna_whole'), {
        itemId: 'tuna_whole', quantityKg: 300, label: 'Yellowfin Tuna (Whole)', type: 'RAW'
    });
    batch.set(kaimanaUnitRef.collection('stock').doc('COLD_tuna_loin'), {
        itemId: 'tuna_loin', quantityKg: 100, label: 'YF Tuna Loin', type: 'COLD'
    });

    // Kaimana Gudang Teri Stock
    const kaimanaTeriRef = db.doc('locations/kaimana/units/gudang_ikan_teri');
    batch.set(kaimanaTeriRef, { label: 'Gudang Ikan Teri', active: true }, { merge: true }); // Parent Doc
    batch.set(kaimanaTeriRef.collection('stock').doc('COLD_teri_dry'), {
        itemId: 'teri_dry', quantityKg: 40, label: 'Anchovy (Dried)', type: 'COLD'
    });

    // Clear old incorrect paths if they exist (optional, but good for hygiene)
    batch.delete(db.doc('inventory/kaimana_frozen_fish'));
    batch.delete(db.doc('inventory/kaimana_gudang_ikan_teri'));
    batch.delete(db.doc('inventory/jakarta_cold_storage'));

    await batch.commit();
    console.log("Seeding Complete!");
}

seed().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
