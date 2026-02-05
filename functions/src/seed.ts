/**
 * Ocean Pearl OPS V2 - Seed Script
 * Phase 1: Idempotent seeding of core data
 * 
 * Run with: npm run seed
 */

import admin from 'firebase-admin';
import { UNIT_TYPES, USER_ROLES } from './types.js';

// Initialize Firebase Admin
const app = admin.initializeApp();
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

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

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
        } else {
            console.log(`  ⏭️  Location exists: ${location.name}`);
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
        } else {
            console.log(`  ⏭️  Unit exists: ${unit.name}`);
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
            console.log(`  ✅ Created user: ${user.displayName} (${user.role})`);
        } else {
            console.log(`  ⏭️  User exists: ${user.displayName}`);
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
        } else {
            console.log(`  ⏭️  Master data exists: ${key}`);
        }
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('🌱 Ocean Pearl OPS V2 - Seed Script');
    console.log('=====================================\n');

    try {
        await seedLocations();
        await seedUnits();
        await seedUsers();
        await seedMasterData();

        console.log('\n✅ Seed completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`  - Locations: ${LOCATIONS.length}`);
        console.log(`  - Units: ${UNITS.length} (including ${UNITS.filter(u => u.unitType === 'FISHING_BOAT').length} fishing boats, ${UNITS.filter(u => u.unitType === 'COLLECTOR_BOAT').length} collector boats)`);
        console.log(`  - Users: ${USERS.length} role examples`);
        console.log(`  - Master data: ${Object.keys(MASTER_DATA).length} document types`);

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        await app.delete();
        process.exit(0);
    }
}

// Run the seed
main();

