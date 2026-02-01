const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    console.log("🚀 SEEDING BUYER PARTNER 🚀");

    const partners = [
        {
            id: 'buyer-b',
            name: 'Buyer B (Seafood Export Ltd)',
            type: 'buyer',
            active: true,
            locationId: 'kaimana',
            contact: 'Pak Export',
            phone: '+6281122334455'
        },
        {
            id: 'buyer-c',
            name: 'Local Market Agent',
            type: 'sell_agent',
            active: true,
            locationId: 'kaimana',
            contact: 'Bu Pasar',
            phone: '+6281122334466'
        }
    ];

    for (const p of partners) {
        await db.collection('partners').doc(p.id).set(p);
        console.log(`✅ Seeded ${p.name}`);
    }

    process.exit(0);
})();
