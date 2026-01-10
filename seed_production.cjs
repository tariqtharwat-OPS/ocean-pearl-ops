const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize App
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'oceanpearl-ops'
    });
}

const db = getFirestore();

async function seedProduction() {
    console.log("🚀 Starting Production Seeding...");
    const batch = db.batch();

    // ==========================================
    // 1. LOCATIONS & UNITS
    // ==========================================
    console.log("📍 Seeding Locations...");
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

            // Initialize Wallet for each unit to prevent null pointer errors
            const walletRef = db.doc(`site_wallets/${unit.id}`);
            batch.set(walletRef, {
                balance: 0,
                locationId: locId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }

    // ==========================================
    // 2. ITEMS (The Taxonomy)
    // ==========================================
    console.log("🐟 Seeding Taxonomy...");
    const ITEMS = [
        // RAW ANCHOVIES
        { id: 'teri_raw_s', name: 'Anchovy Raw (Small)', category: 'FISH', localName: 'Ikan Teri Kecil', uom: 'kg' },
        { id: 'teri_raw_m', name: 'Anchovy Raw (Medium)', category: 'FISH', localName: 'Ikan Teri Sedang', uom: 'kg' },
        { id: 'teri_raw_l', name: 'Anchovy Raw (Large)', category: 'FISH', localName: 'Ikan Teri Besar', uom: 'kg' },

        // DRIED ANCHOVIES (Outputs)
        { id: 'teri_dried_super', name: 'Dried Anchovy (Super)', category: 'DRIED_FISH', localName: 'Teri Kering Super', uom: 'kg' },
        { id: 'teri_dried_std', name: 'Dried Anchovy (Standard)', category: 'DRIED_FISH', localName: 'Teri Kering Standard', uom: 'kg' },
        { id: 'teri_dried_broken', name: 'Dried Anchovy (Broken)', category: 'DRIED_FISH', localName: 'Teri Kering Pecah', uom: 'kg' },

        // FROZEN FISH RAW
        { id: 'yf_tuna_whole', name: 'Yellowfin Tuna (Whole)', category: 'FISH', localName: 'Madidihang Utuh', uom: 'kg' },
        { id: 'kakap_merah_whole', name: 'Red Snapper (Whole)', category: 'FISH', localName: 'Kakap Merah Utuh', uom: 'kg' },

        // FROZEN FISH PROCESSED
        { id: 'yf_tuna_loin', name: 'YF Tuna Loin', category: 'PROCESSED_FISH', localName: 'Loin Tuna', uom: 'kg' },
        { id: 'yf_tuna_saku', name: 'YF Tuna Saku', category: 'PROCESSED_FISH', localName: 'Saku Tuna', uom: 'kg' },
        { id: 'yf_tuna_steak', name: 'YF Tuna Steak', category: 'PROCESSED_FISH', localName: 'Steak Tuna', uom: 'kg' },
        { id: 'kakap_merah_fillet', name: 'Red Snapper Fillet', category: 'PROCESSED_FISH', localName: 'Fillet Kakap', uom: 'kg' }
    ];

    for (const item of ITEMS) {
        batch.set(db.collection('items').doc(item.id), {
            ...item,
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // ==========================================
    // 3. PARTNERS (Suppliers/Customers)
    // ==========================================
    console.log("🤝 Seeding Partners...");
    const PARTNERS = [
        { id: 'sup_local_fishermen', name: 'Local Fishermen (Cash)', type: 'supplier', category: 'RAW_MATERIAL' },
        { id: 'sup_logistics_indo', name: 'Indo Logistics PT', type: 'supplier', category: 'SERVICE' },
        { id: 'cust_global_export', name: 'Global Seafoods Ltd', type: 'customer', category: 'WHOLESALE' },
        { id: 'cust_local_market', name: 'Pasar Lokal', type: 'customer', category: 'RETAIL' }
    ];

    for (const p of PARTNERS) {
        batch.set(db.collection('partners').doc(p.id), {
            ...p,
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // ==========================================
    // 4. USERS
    // ==========================================
    console.log("👥 Seeding Users...");
    const USERS = [
        // GLOBAL ADMIN
        {
            email: 'tariq@oceanpearlseafood.com',
            name: 'Tariq (CEO)',
            role: 'admin',
            loc: null,
            unit: null
        },
        // HQ JAKARTA
        {
            email: 'staff_jakarta_office@ops.com',
            name: 'Staff Jakarta Office',
            role: 'staff',
            loc: 'jakarta',
            unit: 'office'
        },
        {
            email: 'staff_jakarta_cs@ops.com',
            name: 'Staff Jakarta Cold Storage',
            role: 'staff',
            loc: 'jakarta',
            unit: 'cold_storage'
        },
        // KAIMANA
        {
            email: 'head_kaimana_teri@ops.com',
            name: 'Head Kaimana Teri',
            role: 'manager',
            loc: 'kaimana',
            unit: 'gudang_ikan_teri'
        },
        {
            email: 'head_kaimana_frozen@ops.com',
            name: 'Head Kaimana Frozen',
            role: 'manager',
            loc: 'kaimana',
            unit: 'frozen_fish'
        },
        // SAUMLAKI
        {
            email: 'head_saumlaki_frozen@ops.com',
            name: 'Head Saumlaki Frozen',
            role: 'manager',
            loc: 'saumlaki',
            unit: 'frozen_fish'
        }
    ];

    // Commit batch for data first
    await batch.commit();
    console.log("✅ Master Data Committed.");

    // Now handle Auth (cannot fail properly in batch)
    for (const u of USERS) {
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(u.email);
            uid = userRecord.uid;
            // Force reset details
            await admin.auth().updateUser(uid, {
                displayName: u.name,
                password: 'OceanPearl2026!', // Resetting password for consistency
                emailVerified: true
            });
            console.log(`Updated Auth: ${u.email}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                const newUser = await admin.auth().createUser({
                    email: u.email,
                    password: 'OceanPearl2026!',
                    displayName: u.name,
                    emailVerified: true
                });
                uid = newUser.uid;
                console.log(`Created Auth: ${u.email}`);
            } else {
                console.error(`Error Auth ${u.email}:`, e);
                continue;
            }
        }

        // Set Firestore Profile
        await db.collection('users').doc(uid).set({
            email: u.email,
            displayName: u.name,
            role: u.role,
            locationId: u.loc, // Can be null for admin
            unitId: u.unit,    // Can be null
            phone: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            setupVersion: 'production_prep_v1'
        }, { merge: true });
    }

    console.log("✅ All Users synced.");
    console.log("🚀 Production Preparation Complete.");
    process.exit(0);
}

seedProduction().catch(e => {
    console.error(e);
    process.exit(1);
});
