const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

/**
 * DAY 0 SEED FUNCTION
 * Clears operational data and seeds all master data for 7-day simulation
 */
exports.seedDay0 = onRequest({ region: "asia-southeast1", timeoutSeconds: 540 }, async (req, res) => {
    const log = [];
    
    try {
        log.push('🧹 DAY 0 CLEAN STATE - Starting...');
        
        // Step 1: Clear operational collections
        const operationalCollections = ['transactions', 'inventory', 'stockMovements', 'admin_notifications', 'financial_requests', 'shark_insights', 'audit_logs'];
        
        for (const collName of operationalCollections) {
            try {
                const snapshot = await db.collection(collName).limit(500).get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                if (snapshot.size > 0) {
                    await batch.commit();
                    log.push(`✅ Cleared ${snapshot.size} documents from ${collName}`);
                }
            } catch (e) {
                log.push(`⚠️ Error clearing ${collName}: ${e.message}`);
            }
        }
        
        log.push('📦 MASTER DATA SEED - Starting...');
        
        // Step 2: Seed Users
        const USERS = [
            { email: 'tariq@oceanpearlseafood.com', name: 'Tariq (CEO)', role: 'ceo', language: 'en', loc: 'HQ_JAKARTA', unit: 'office' },
            { email: 'operator.kaimana@oceanpearl.com', name: 'Operator Kaimana', role: 'operator', language: 'id', loc: 'KAIMANA', unit: 'KAIMANA_GUDANG_TERI_01' },
            { email: 'manager.kaimana@oceanpearl.com', name: 'Manager Kaimana', role: 'manager', language: 'id', loc: 'KAIMANA', unit: 'KAIMANA_CS_01' },
            { email: 'operator.saumlaki@oceanpearl.com', name: 'Operator Saumlaki', role: 'operator', language: 'id', loc: 'SAUMLAKI', unit: 'SAUMLAKI_FACTORY_01' },
            { email: 'manager.saumlaki@oceanpearl.com', name: 'Manager Saumlaki', role: 'manager', language: 'id', loc: 'SAUMLAKI', unit: 'SAUMLAKI_CS_01' }
        ];
        
        for (const u of USERS) {
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
                }
            }
            
            await db.collection('users').doc(uid).set({
                email: u.email,
                displayName: u.name,
                role: u.role,
                language: u.language,
                defaultLocation: u.loc,
                defaultUnit: u.unit,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        log.push(`✅ Seeded ${USERS.length} users`);
        
        // Step 3: Seed Locations
        const LOCATIONS = [
            { id: 'HQ_JAKARTA', name_en: 'HQ Jakarta', name_id: 'HQ Jakarta', type: 'headquarters' },
            { id: 'KAIMANA', name_en: 'Kaimana', name_id: 'Kaimana', type: 'operations' },
            { id: 'SAUMLAKI', name_en: 'Saumlaki', name_id: 'Saumlaki', type: 'factory' },
            { id: 'JAKARTA_CS', name_en: 'Jakarta Cold Storage', name_id: 'Cold Storage Jakarta', type: 'storage' }
        ];
        
        for (const loc of LOCATIONS) {
            await db.collection('locations').doc(loc.id).set({
                ...loc,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        log.push(`✅ Seeded ${LOCATIONS.length} locations`);
        
        // Step 4: Seed Units
        const UNITS = [
            { id: 'KAIMANA_GUDANG_TERI_01', locationId: 'KAIMANA', name_en: 'Gudang Ikan Teri 01', name_id: 'Gudang Ikan Teri 01', type: 'GUDANG_IKAN_TERI' },
            { id: 'KAIMANA_CS_01', locationId: 'KAIMANA', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' },
            { id: 'SAUMLAKI_FACTORY_01', locationId: 'SAUMLAKI', name_en: 'Factory 01', name_id: 'Pabrik 01', type: 'FACTORY' },
            { id: 'SAUMLAKI_CS_01', locationId: 'SAUMLAKI', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' },
            { id: 'TRANSPORT_BOAT_01', locationId: 'TRANSPORT', name_en: 'Transport Boat 01', name_id: 'Kapal Transport 01', type: 'TRANSPORT_BOAT' },
            { id: 'JAKARTA_CS_01', locationId: 'JAKARTA_CS', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' }
        ];
        
        for (const unit of UNITS) {
            await db.collection('units').doc(unit.id).set({
                ...unit,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        log.push(`✅ Seeded ${UNITS.length} units`);
        
        // Step 5: Seed Raw Materials
        const RAW_MATERIALS = [
            { id: 'anchovy', name_en: 'Anchovy', name_id: 'Ikan Teri', category: 'fish' },
            { id: 'yellowfin_tuna', name_en: 'Yellowfin Tuna', name_id: 'Tuna', category: 'fish' },
            { id: 'skipjack', name_en: 'Skipjack', name_id: 'Cakalang', category: 'fish' },
            { id: 'mahi_mahi', name_en: 'Mahi-mahi', name_id: 'Lemadang', category: 'fish' },
            { id: 'snapper', name_en: 'Snapper', name_id: 'Kakap Merah', category: 'fish' },
            { id: 'grouper', name_en: 'Grouper', name_id: 'Kerapu', category: 'fish' },
            { id: 'spanish_mackerel', name_en: 'Spanish Mackerel', name_id: 'Tenggiri', category: 'fish' },
            { id: 'trevally', name_en: 'Trevally', name_id: 'Kuwe', category: 'fish' },
            { id: 'wahoo', name_en: 'Wahoo', name_id: 'Tenggiri Papan', category: 'fish' },
            { id: 'barracuda', name_en: 'Barracuda', name_id: 'Alu-alu', category: 'fish' },
            { id: 'emperor', name_en: 'Emperor', name_id: 'Lencam', category: 'fish' }
        ];
        
        for (const item of RAW_MATERIALS) {
            await db.collection('raw_materials').doc(item.id).set({
                ...item,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        log.push(`✅ Seeded ${RAW_MATERIALS.length} raw materials`);
        
        // Step 6: Seed Finished Products
        const FINISHED_PRODUCTS = [
            { id: 'tuna_loin', name_en: 'Tuna Loin', name_id: 'Tuna Loin', category: 'tuna_products' },
            { id: 'tuna_saku', name_en: 'Tuna Saku', name_id: 'Tuna Saku', category: 'tuna_products' },
            { id: 'tuna_steak', name_en: 'Tuna Steak', name_id: 'Tuna Steak', category: 'tuna_products' },
            { id: 'tuna_cube', name_en: 'Tuna Cube', name_id: 'Tuna Cube', category: 'tuna_products' },
            { id: 'fish_fillet', name_en: 'Fish Fillet', name_id: 'Fillet Ikan', category: 'general_products' },
            { id: 'fish_portion', name_en: 'Fish Portion', name_id: 'Porsi Ikan', category: 'general_products' },
            { id: 'fish_steak', name_en: 'Fish Steak', name_id: 'Steak Ikan', category: 'general_products' },
            { id: 'anchovy_dried', name_en: 'Anchovy Dried (Packed)', name_id: 'Teri Kering (Kemasan)', category: 'anchovy_products' },
            { id: 'roe', name_en: 'Roe', name_id: 'Telur Ikan', category: 'byproducts' },
            { id: 'fish_maw', name_en: 'Fish Maw', name_id: 'Gelembung Ikan', category: 'byproducts' },
            { id: 'trimmings', name_en: 'Trimmings', name_id: 'Potongan', category: 'byproducts' },
            { id: 'frames_bones', name_en: 'Frames/Bones', name_id: 'Tulang/Rangka', category: 'byproducts' }
        ];
        
        for (const item of FINISHED_PRODUCTS) {
            await db.collection('finished_products').doc(item.id).set({
                ...item,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        log.push(`✅ Seeded ${FINISHED_PRODUCTS.length} finished products`);
        
        // Step 7: Seed Partners
        const PARTNERS = [
            { id: 'supplier_kaimana_01', name: 'Supplier Kaimana 01', type: 'supplier', location: 'KAIMANA' },
            { id: 'supplier_saumlaki_01', name: 'Supplier Saumlaki 01', type: 'supplier', location: 'SAUMLAKI' },
            { id: 'customer_jakarta_01', name: 'Customer Jakarta 01', type: 'customer', location: 'JAKARTA' },
            { id: 'customer_export_01', name: 'Export Customer 01', type: 'customer', location: 'EXPORT' }
        ];
        
        for (const partner of PARTNERS) {
            await db.collection('partners').doc(partner.id).set({
                ...partner,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        log.push(`✅ Seeded ${PARTNERS.length} partners`);
        
        log.push('✅ DAY 0 SEED COMPLETE!');
        
        res.status(200).json({
            success: true,
            message: 'DAY 0 clean state achieved and master data seeded',
            log: log
        });
        
    } catch (error) {
        log.push(`❌ Fatal error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
            log: log
        });
    }
});
