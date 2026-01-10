const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// App is initialized in index.js generally, but we can access it via admin
const db = getFirestore();

exports.seedProduction = functions.region('asia-southeast2').https.onRequest(async (req, res) => {
    // 1. LOCATIONS & UNITS
    const batch = db.batch();

    // ... (Logic from previous step) ...
    const LOCATIONS = {
        'jakarta': {
            label: 'HQ Jakarta',
            units: [
                { id: 'office', label: 'Office' },
                { id: 'cold_storage', label: 'Cold Storage' }
            ]
        },
        'kaimana': {
            label: 'Kaimana',
            units: [
                { id: 'gudang_ikan_teri', label: 'Gudang Ikan Teri' },
                { id: 'frozen_fish', label: 'Frozen Fish' }
            ]
        },
        'saumlaki': {
            label: 'Saumlaki',
            units: [
                { id: 'frozen_fish', label: 'Frozen Fish' }
            ]
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

            const walletRef = db.doc(`site_wallets/${unit.id}`);
            batch.set(walletRef, {
                balance: 0,
                locationId: locId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }

    // 2. ITEMS
    const ITEMS = [
        { id: 'teri_raw_s', name: 'Anchovy Raw (Small)', category: 'FISH', localName: 'Ikan Teri Kecil', uom: 'kg' },
        { id: 'teri_raw_m', name: 'Anchovy Raw (Medium)', category: 'FISH', localName: 'Ikan Teri Sedang', uom: 'kg' },
        { id: 'teri_raw_l', name: 'Anchovy Raw (Large)', category: 'FISH', localName: 'Ikan Teri Besar', uom: 'kg' },
        { id: 'teri_dried_super', name: 'Dried Anchovy (Super)', category: 'DRIED_FISH', localName: 'Teri Kering Super', uom: 'kg' },
        { id: 'teri_dried_std', name: 'Dried Anchovy (Standard)', category: 'DRIED_FISH', localName: 'Teri Kering Standard', uom: 'kg' },
        { id: 'teri_dried_broken', name: 'Dried Anchovy (Broken)', category: 'DRIED_FISH', localName: 'Teri Kering Pecah', uom: 'kg' },
        { id: 'yf_tuna_whole', name: 'Yellowfin Tuna (Whole)', category: 'FISH', localName: 'Madidihang Utuh', uom: 'kg' },
        { id: 'kakap_merah_whole', name: 'Red Snapper (Whole)', category: 'FISH', localName: 'Kakap Merah Utuh', uom: 'kg' },
        { id: 'yf_tuna_loin', name: 'YF Tuna Loin', category: 'PROCESSED_FISH', localName: 'Loin Tuna', uom: 'kg' },
        { id: 'yf_tuna_saku', name: 'YF Tuna Saku', category: 'PROCESSED_FISH', localName: 'Saku Tuna', uom: 'kg' },
        { id: 'yf_tuna_steak', name: 'YF Tuna Steak', category: 'PROCESSED_FISH', localName: 'Steak Tuna', uom: 'kg' },
        { id: 'kakap_merah_fillet', name: 'Red Snapper Fillet', category: 'PROCESSED_FISH', localName: 'Fillet Kakap', uom: 'kg' }
    ];

    for (const item of ITEMS) {
        batch.set(db.collection('items').doc(item.id), { ...item, active: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    // 3. PARTNERS (REALISTIC PH 8)
    const PARTNERS = [
        { id: 'sup_cv_nelayan_makmur', name: 'CV. Nelayan Makmur', type: 'supplier', category: 'RAW_MATERIAL' },
        { id: 'sup_pt_shark_abadi', name: 'PT. Shark Abadi Logistics', type: 'supplier', category: 'SERVICE' },
        { id: 'sup_toko_berkah', name: 'Toko Berkah Jaya', type: 'supplier', category: 'SUPPLIES' },
        { id: 'sup_pertamina_local', name: 'SPBU Pertamina Local', type: 'supplier', category: 'FUEL' },
        { id: 'cust_global_export', name: 'Global Seafoods Ltd', type: 'customer', category: 'WHOLESALE' },
        { id: 'cust_local_market', name: 'Pasar Lokal', type: 'customer', category: 'RETAIL' }
    ];

    for (const p of PARTNERS) {
        batch.set(db.collection('partners').doc(p.id), { ...p, active: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    // UPDATE WALLETS
    const WALLETS = {
        'gudang_ikan_teri': 50000000,
        'frozen_fish': 75000000,
        'saumlaki_frozen': 25000000,
        'HQ': 1000000000
    };
    for (const [unitId, bal] of Object.entries(WALLETS)) {
        batch.set(db.doc(`site_wallets/${unitId}`), { balance: bal, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    // Commit Data Batch
    await batch.commit();

    // 4. USERS (REALISTIC PH 8)
    const USERS = [
        { email: 'tariq@oceanpearlseafood.com', name: 'Tariq (CEO)', role: 'admin', role_v2: 'HQ_ADMIN', loc: null, unit: null },
        { email: 'admin_hq_sarah@ops.com', name: 'Sarah (HQ Admin)', role: 'admin', role_v2: 'HQ_ADMIN', loc: 'jakarta', unit: 'office' },
        { email: 'manager_kaimana_budi@ops.com', name: 'Pak Budi (Manager Kaimana)', role: 'manager', role_v2: 'LOC_MANAGER', loc: 'kaimana', unit: 'frozen_fish' },
        { email: 'op_teri_usi@ops.com', name: 'Usi (Admin Teri)', role: 'staff', role_v2: 'UNIT_OP', loc: 'kaimana', unit: 'gudang_ikan_teri' },
        { email: 'investor_view@ops.com', name: 'Lukas (Investor)', role: 'viewer', role_v2: 'READ_ONLY', loc: null, unit: null },

        // Legacy/Existing (Keep for compatibility)
        { email: 'head_kaimana_teri@ops.com', name: 'Head Kaimana Teri', role: 'manager', role_v2: 'UNIT_OP', loc: 'kaimana', unit: 'gudang_ikan_teri' }
    ];

    let log = [];

    for (const u of USERS) {
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(u.email);
            uid = userRecord.uid;
            // Ensure password and name are set
            await admin.auth().updateUser(uid, {
                displayName: u.name,
                password: 'OceanPearl2026!',
                emailVerified: true
            });
            log.push(`Updated Auth: ${u.email}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                const newUser = await admin.auth().createUser({
                    email: u.email,
                    password: 'OceanPearl2026!',
                    displayName: u.name,
                    emailVerified: true
                });
                uid = newUser.uid;
                log.push(`Created Auth: ${u.email}`);
            } else {
                log.push(`Error Auth ${u.email}: ${e.message}`);
                continue;
            }
        }

        await db.collection('users').doc(uid).set({
            email: u.email,
            displayName: u.name,
            role: u.role,          // V1 Compatibility
            role_v2: u.role_v2,    // V2 RBAC
            locationId: u.loc,
            unitId: u.unit,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            setupVersion: 'phase_8_ready'
        }, { merge: true });
    }

    res.status(200).send({ success: true, log });
});
