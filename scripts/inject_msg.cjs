const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

async function inject() {
    let uid;
    const targetEmail = 'tariq@oceanpearlseafood.com';
    let userSnap = await db.collection('users').where('email', '==', targetEmail).get();

    if (userSnap.empty) {
        console.error("TARGET USER NOT FOUND!");
        process.exit(1);
    }

    uid = userSnap.docs[0].id;
    const userData = userSnap.docs[0].data();
    console.log(`Targeting User: ${userData.email} (${uid})`);

    const res = await db.collection('messages').add({
        recipientId: uid,
        senderId: 'shark-ai',
        sender: 'Shark AI',
        text: "I have analyzed your request. Please confirm this Expense Request.",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        type: 'AI_REPLY',
        draft: {
            type: 'EXPENSE_REQUEST',
            payload: {
                amount: 75000,
                description: 'Emergency Ice Block',
                category: 'Ice',
                locationId: 'kaimana',
                unitId: 'gudang_ikan_teri'
            }
        }
    });

    console.log("Injected Draft Message for", uid);
    console.log("Message ID:", res.id);
}

inject().catch(console.error).then(() => process.exit(0));
