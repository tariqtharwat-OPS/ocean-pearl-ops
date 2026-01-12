const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = getFirestore('ops1');

/**
 * seedProcessingRules
 * 
 * Seeding Phase 10 Master Data for Dynamic Commercial Core
 */
exports.seedProcessingRules = onRequest({ region: "asia-southeast2" }, async (req, res) => {
    try {
        const batch = db.batch();

        const RULES = [
            {
                id: 'tuna',
                label: 'Tuna',
                processes: ['Whole', 'GG', 'Loin', 'Steak', 'Cube', 'Slice', 'Ground', 'Fillet', 'Roe', 'Maw'],
                grades: ['A', 'B', 'C', 'R', 'Mixed'],
                packaging: ['IQF', 'IVP', 'Block', 'Layer Pack', 'Bulk']
            },
            {
                id: 'shrimp',
                label: 'Shrimp',
                processes: ['HOSO', 'HLSO', 'PUD', 'PTO', 'Butterfly'],
                grades: ['A', 'B', 'C', 'R'],
                packaging: ['Block', 'IQF', 'Bulk']
            },
            {
                id: 'octopus',
                label: 'Octopus',
                processes: ['Whole', 'Gutted', 'Cut', 'Ball'],
                grades: ['A', 'B', 'R'],
                packaging: ['Block', 'IQF']
            },
            {
                id: 'anchovy',
                label: 'Anchovy (Ikan Teri)',
                processes: ['Dried', 'Boiled', 'Salted'],
                grades: ['Super', 'Standard', 'Broken'],
                packaging: ['Sack (25kg)', 'Box (10kg)', 'Retail (1kg)']
            },
            {
                id: 'sea_cucumber',
                label: 'Sea Cucumber',
                processes: ['Dried', 'Wet', 'Gutted'],
                grades: ['Super', 'A', 'B'],
                packaging: ['Sack', 'Box']
            }
        ];

        for (const rule of RULES) {
            const ref = db.collection('processing_rules').doc(rule.id);
            batch.set(ref, rule);
        }

        await batch.commit();

        res.status(200).send({ success: true, message: "Phase 10 Processing Rules Seeded." });
    } catch (e) {
        console.error(e);
        res.status(500).send({ error: e.message });
    }
});
