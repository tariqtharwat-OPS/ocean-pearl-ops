import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Initialize Admin SDK with explicit project ID
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'oceanpearl-ops' });
}

// TARGET THE OPS1 DATABASE
const db = admin.app().firestore('ops1');

const USERS = [
    { email: 'admin_test@ops.com', password: 'Test123456!', role: 'admin' },
    { email: 'kaimana_site@ops.com', password: 'Test123456!', role: 'site_user', locationId: 'kaimana', unitId: 'ikan_teri_gudang' },
    { email: 'hq_sales@ops.com', password: 'Test123456!', role: 'hq' },
    { email: 'viewer_test@ops.com', password: 'Test123456!', role: 'report_viewer' },
    { email: 'info@oceanpearlseafood.com', password: 'Test123456!', role: 'admin' }
];

const LOCATIONS = [
    {
        id: 'kaimana',
        label: 'Kaimana',
        units: [
            { id: 'ikan_teri_gudang', label: 'Unit A (Ikan Teri)' },
            { id: 'unit_b', label: 'Unit B' }
        ]
    },
    {
        id: 'saumlaki',
        label: 'Saumlaki',
        units: [
            { id: 'unit_c', label: 'Unit C' }
        ]
    }
];

const ITEMS = [
    { id: 'tuna_loin', name: 'Tuna Loin (Yellowfin)', category: 'fish' },
    { id: 'shrimp_vaname', name: 'Shrimp Vaname', category: 'shrimp' },
    { id: 'ice_block', name: 'Ice Block', category: 'supply' }
];

const PARTNERS = [
    { id: 'supplier_ali', name: 'Ali Supplier', type: 'supplier' },
    { id: 'buyer_global_foods', name: 'Global Foods Inc', type: 'buyer' }
];

async function seed() {
    console.log("Starting Migration to 'ops1'...");

    // 1. SEED USERS
    for (const u of USERS) {
        try {
            let userRecord;
            try {
                userRecord = await getAuth().getUserByEmail(u.email);
                await getAuth().updateUser(userRecord.uid, { password: u.password });
                console.log(`Updated Auth: ${u.email}`);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    userRecord = await getAuth().createUser({
                        email: u.email,
                        password: u.password,
                        emailVerified: true
                    });
                    console.log(`Created Auth: ${u.email}`);
                } else {
                    throw error;
                }
            }

            const userDoc = {
                email: u.email,
                role: u.role,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (u.locationId) userDoc.locationId = u.locationId;
            if (u.unitId) userDoc.unitId = u.unitId;

            // WRITE TO ops1 DATABASE
            await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
            console.log(`Seeded Firestore (ops1): ${u.email}`);

        } catch (err) {
            console.error(`Error processing ${u.email}:`, err);
        }
    }

    // 2. SEED LOCATIONS
    for (const loc of LOCATIONS) {
        await db.collection('locations').doc(loc.id).set({ label: loc.label });
        for (const unit of loc.units) {
            await db.doc(`locations/${loc.id}/units/${unit.id}`).set({ label: unit.label, isActive: true });
        }
        console.log(`Seeded Location: ${loc.id}`);
    }

    // 3. SEED ITEMS
    for (const item of ITEMS) {
        await db.collection('items').doc(item.id).set(item);
        console.log(`Seeded Item: ${item.id}`);
    }

    // 4. SEED PARTNERS
    for (const p of PARTNERS) {
        await db.collection('partners').doc(p.id).set(p);
        console.log(`Seeded Partner: ${p.id}`);
    }

    console.log("Migration Complete.");
    process.exit(0);
}

seed();
