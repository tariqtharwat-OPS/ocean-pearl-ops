/**
 * Ocean Pearl OPS V2 - Seed Script
 * Phase 1: Idempotent seeding of core data
 * Phase 3: Supports --reset for Day-0 Clean State
 * 
 * Run with: npm run seed -- [--reset]
 */

import admin from 'firebase-admin';
import { UNIT_TYPES, USER_ROLES } from './types.js';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// ============================================================================
// SEED DATA DEFINITIONS
// ============================================================================

const LOCATIONS = [
    { id: 'jakarta', name: 'Jakarta', isActive: true },
    { id: 'surabaya', name: 'Surabaya', isActive: true },
    { id: 'kaimana', name: 'Kaimana', isActive: true },
    { id: 'saumlaki', name: 'Saumlaki', isActive: true },
];

const UNITS = [
    // Jakarta
    { id: 'jakarta-hq', locationId: 'jakarta', unitType: 'OFFICE', name: 'Headquarters' },
    { id: 'jakarta-cold', locationId: 'jakarta', unitType: 'COLD_STORAGE', name: 'Cold Storage Jakarta' },

    // Surabaya
    { id: 'surabaya-warehouse', locationId: 'surabaya', unitType: 'WAREHOUSE', name: 'Warehouse Surabaya' },

    // Kaimana - Factories
    { id: 'kaimana-factory-1', locationId: 'kaimana', unitType: 'FACTORY', name: 'Freezing & Processing Plant #1' },
    { id: 'kaimana-factory-2', locationId: 'kaimana', unitType: 'FACTORY', name: 'Freezing & Processing Plant #2' },
    { id: 'kaimana-drying', locationId: 'kaimana', unitType: 'DRYING_FACTORY', name: 'Anchovy Drying Unit' },
    { id: 'kaimana-fishmeal', locationId: 'kaimana', unitType: 'FISH_MEAL_PLANT', name: 'Fish Meal Plant' },

    // Kaimana - Transport Boats
    { id: 'kaimana-transport-1', locationId: 'kaimana', unitType: 'TRANSPORT_BOAT', name: 'Transport Boat #1' },
    { id: 'kaimana-transport-2', locationId: 'kaimana', unitType: 'TRANSPORT_BOAT', name: 'Transport Boat #2' },
    { id: 'kaimana-transport-3', locationId: 'kaimana', unitType: 'TRANSPORT_BOAT', name: 'Transport Boat #3' },

    // Kaimana - Fishing Boats (20)
    ...Array.from({ length: 20 }, (_, i) => ({
        id: `kaimana-fishing-${i + 1}`,
        locationId: 'kaimana',
        unitType: 'FISHING_BOAT',
        name: `Fishing Boat #${i + 1}`,
    })),

    // Kaimana - Collector Boats (13)
    ...Array.from({ length: 13 }, (_, i) => ({
        id: `kaimana-collector-${i + 1}`,
        locationId: 'kaimana',
        unitType: 'COLLECTOR_BOAT',
        name: `Collector Boat #${i + 1}`,
    })),

    // Saumlaki
    { id: 'saumlaki-factory', locationId: 'saumlaki', unitType: 'FACTORY', name: 'Processing & Freezing Plant' },
];

const USERS = [
    {
        uid: 'CEO001',
        role: 'CEO',
        displayName: 'Tariq Tharwat (CEO)',
        email: 'tariq@oceanpearl.id',
        allowedLocationIds: [], // CEO has access to all
        allowedUnitIds: [],
    },
    {
        uid: 'HQ_ADMIN001',
        role: 'HQ_ADMIN',
        displayName: 'Admin HQ',
        email: 'admin@oceanpearl.id',
        allowedLocationIds: [],
        allowedUnitIds: [],
    },
    {
        uid: 'HQ_FINANCE001',
        role: 'HQ_FINANCE',
        displayName: 'Finance Manager',
        email: 'finance@oceanpearl.id',
        allowedLocationIds: [],
        allowedUnitIds: [],
    },
    {
        uid: 'LOC_MGR_KAIMANA',
        role: 'LOC_MANAGER',
        displayName: 'Budi (Location Manager - Kaimana)',
        email: 'budi@oceanpearl.id',
        allowedLocationIds: ['kaimana'],
        allowedUnitIds: [], // Implied by location
    },
    {
        uid: 'UNIT_OP_FACTORY1',
        role: 'UNIT_OP',
        displayName: 'Factory Operator #1',
        email: 'operator.factory1@oceanpearl.id',
        allowedLocationIds: ['kaimana'],
        allowedUnitIds: ['kaimana-factory-1'],
    },
    {
        uid: 'INVESTOR001',
        role: 'INVESTOR',
        displayName: 'Investor Read-Only',
        email: 'investor@oceanpearl.id',
        allowedLocationIds: ['jakarta', 'kaimana'],
        allowedUnitIds: [],
    },
];

const MASTER_DATA = {
    species: {
        items: [
            { id: 'sardine', name: 'Sardine', category: 'FISH', isActive: true },
            { id: 'mixed-pelagic', name: 'Mixed Small Pelagic', category: 'FISH', isActive: true },
            { id: 'tuna-scraps', name: 'Tuna Scraps', category: 'FISH', isActive: true },
            { id: 'anchovy', name: 'Anchovy', category: 'FISH', isActive: true },
        ],
    },
    items: {
        items: [
            { id: 'sardine-raw', name: 'Sardine (RAW)', category: 'RAW', isActive: true },
            { id: 'sardine-frozen', name: 'Sardine (Frozen)', category: 'FINISHED', isActive: true },
            { id: 'mixed-raw', name: 'Mixed Pelagic (RAW)', category: 'RAW', isActive: true },
            { id: 'waste-mix', name: 'Waste Mix', category: 'REJECT_SELLABLE', isActive: true },
            { id: 'fish-meal', name: 'Fish Meal', category: 'FINISHED', isActive: true },
            { id: 'fish-oil', name: 'Fish Oil', category: 'FINISHED', isActive: true },
            { id: 'anchovy-dried', name: 'Dried Anchovy', category: 'FINISHED', isActive: true },
        ],
    },
    expense_types: {
        items: [
            { id: 'diesel', name: 'Diesel', category: 'OPEX', isActive: true },
            { id: 'ice', name: 'Ice', category: 'OPEX', isActive: true },
            { id: 'oil', name: 'Oil/Lubricants', category: 'OPEX', isActive: true },
            { id: 'maintenance', name: 'Maintenance & Repairs', category: 'OPEX', isActive: true },
            { id: 'salaries', name: 'Salaries & Wages', category: 'OPEX', isActive: true },
            { id: 'port-fees', name: 'Port Fees', category: 'OPEX', isActive: true },
        ],
    },
    partners: {
        items: [
            { id: 'partner-customer1', name: 'Customer Example 1', type: 'CUSTOMER', isActive: true },
            { id: 'partner-customer-export1', name: 'Export Customer', type: 'CUSTOMER', isActive: true },
            { id: 'partner-vendor1', name: 'Ice Supplier', type: 'VENDOR', isActive: true },
            { id: 'partner-fisher1', name: 'Fisher Crew #1', type: 'FISHER', isActive: true },
        ],
    },
    boats: {
        // Metadata for boats (referenced in units)
        items: [
            { id: 'kaimana-fishing-1', unitId: 'kaimana-fishing-1', captain: 'Captain A', isActive: true },
            { id: 'kaimana-fishing-2', unitId: 'kaimana-fishing-2', captain: 'Captain B', isActive: true },
            // ... more boat metadata can be added as needed
        ],
    },
    settings: {
        currency: 'IDR',
        timezone: 'Asia/Jakarta',
        fiscalYearStart: '2026-01-01',
    },
};

const COLLECTIONS_TO_WIPE = [
    'inventory_lots',
    'ledger_entries',
    'trace_links',
    'invoices',
    'wallets',
    'payments', // Add payments just in case
    'ledger_periods',
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function wipeOperationalData() {
    console.log('🧹 Wiping OPERATIONAL data (Day-0 Reset)...');

    for (const collectionName of COLLECTIONS_TO_WIPE) {
        console.log(`   Deleting collection: ${collectionName}...`);
        // Using batch fallback for safety if recursiveDelete specific behavior varies
        const batchSize = 100;
        const collectionRef = db.collection(collectionName);
        const query = collectionRef.orderBy('__name__').limit(batchSize);

        return new Promise((resolve, reject) => {
            deleteQueryBatch(db, query, resolve).catch(reject);
        });

        // Note: For large datasets, use firestore-tools CLI, but for sim/dev this is fine.
        // We'll use a recursive helper.
    }
}

async function deleteQueryBatch(db: any, query: any, resolve: any) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}
// Actually, let's use the bulk writer or recursive delete if possible.
// Implementing a simple manual wiper for now to be framework-agnostic.
async function robustWipe() {
    console.log('🧹 Wiping OPERATIONAL data...');
    for (const col of COLLECTIONS_TO_WIPE) {
        const ref = db.collection(col);
        const sn = await ref.limit(500).get(); // Sim Safe Limit
        if (!sn.empty) {
            const batch = db.batch();
            sn.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            console.log(`   Deleted ${sn.size} docs from ${col}`);
            // If more needed, rerun. For Test/Sim, 500 is usually enough. 
            // If persistent local env, might need recursion.
        }
    }
    console.log('✅ Wipe Complete');
}


async function seedLocations() {
    console.log('📍 Seeding locations...');
    for (const location of LOCATIONS) {
        const docRef = db.collection('locations').doc(location.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            await docRef.set({
                ...location,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ Created location: ${location.name}`);
        }
    }
}

async function seedUnits() {
    console.log('🏭 Seeding units...');
    for (const unit of UNITS) {
        const docRef = db.collection('units').doc(unit.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            await docRef.set({
                ...unit,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ Created unit: ${unit.name}`);
        }
    }
}

async function seedWallets() {
    console.log('💰 Seeding wallets...');
    for (const unit of UNITS) {
        // Create wallet for Factories, Warehouses, Cold Storage, Office
        // Fishing boats usually don't have wallets in this sim scope unless needed.
        if (['FACTORY', 'FISH_MEAL_PLANT', 'DRYING_FACTORY', 'COLD_STORAGE', 'WAREHOUSE', 'OFFICE'].includes(unit.unitType)) {
            const walletId = `wallet-${unit.id}`;
            const docRef = db.collection('wallets').doc(walletId);
            const doc = await docRef.get();
            if (!doc.exists) {
                await docRef.set({
                    id: walletId,
                    unitId: unit.id,
                    locationId: unit.locationId,
                    balanceIdr: 0,
                    status: 'ACTIVE',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`  ✅ Created wallet for: ${unit.name}`);
            }
        }
    }
}

async function seedUsers() {
    console.log('👥 Seeding users...');
    for (const user of USERS) {
        const docRef = db.collection('users').doc(user.uid);
        const doc = await docRef.get();
        if (!doc.exists) {
            await docRef.set({
                ...user,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ Created user: ${user.displayName}`);
        }
    }
}

async function seedMasterData() {
    console.log('📊 Seeding master data...');
    for (const [key, value] of Object.entries(MASTER_DATA)) {
        const docRef = db.collection('master_data').doc(key);
        const doc = await docRef.get();
        if (!doc.exists) {
            await docRef.set(value);
            console.log(`  ✅ Created master_data/${key}`);
        }
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('🌱 Ocean Pearl OPS V2 - Seed Script');
    console.log('=====================================\n');

    const args = process.argv.slice(2);
    if (args.includes('--reset')) {
        await robustWipe();
    }

    try {
        await seedLocations();
        await seedUnits();
        await seedUsers();
        await seedWallets(); // NEW
        await seedMasterData();
        await seedPeriods(db);

        console.log('\n✅ Seed completed successfully!');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
    // No finally process.exit(0) here, let node handle it implies async completion
}


main().then(() => process.exit(0));

async function seedPeriods(db: admin.firestore.Firestore) {
    const periods = [
        { id: '2026-01', status: 'CLOSED', endDate: '2026-02-01' },
        { id: '2026-02', status: 'OPEN', endDate: '2026-03-01' },
        { id: '2026-03', status: 'OPEN', endDate: '2026-04-01' }
    ];

    for (const p of periods) {
        await db.collection('ledger_periods').doc(p.id).set({
            id: p.id,
            startDate: admin.firestore.Timestamp.fromDate(new Date(`${p.id}-01T00:00:00Z`)),
            endDate: admin.firestore.Timestamp.fromDate(new Date(`${p.endDate}T00:00:00Z`)),
            status: p.status,
            closedAt: p.status === 'CLOSED' ? admin.firestore.Timestamp.now() : null,
            closedByUid: p.status === 'CLOSED' ? 'system-seed' : null
        });
    }
}
