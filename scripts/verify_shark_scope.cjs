const admin = require('firebase-admin');

try {
    const serviceAccount = require("d:/OPS/serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    if (admin.apps.length === 0) admin.initializeApp();
}
const db = admin.firestore();

async function runTest() {
    console.log("=== SHARK RBAC & SCOPE VERIFICATION ===");

    // 1. Get UIDs
    const tariqRef = await db.collection('users').where('email', '==', 'tariq@oceanpearlseafood.com').get();
    const budiRef = await db.collection('users').where('email', '==', 'budi@oceanpearlseafood.com').get();

    if (tariqRef.empty || budiRef.empty) {
        console.error("Users not found! Seeding might be incomplete.");
        return;
    }
    const tariqUid = tariqRef.docs[0].id;
    const budiUid = budiRef.docs[0].id;

    console.log(`Tariq UID: ${tariqUid} (Expect GLOBAL)`);
    console.log(`Budi UID: ${budiUid} (Expect LOCAL)`);

    // 2. Send Messages
    const tests = [
        { uid: tariqUid, name: 'Tariq', text: 'How much Red Snapper do we have everywhere?' },
        { uid: budiUid, name: 'Budi', text: 'How much Red Snapper do we have?' },
        { uid: budiUid, name: 'Budi', text: 'Show me wallet balance in Jakarta' } // Should fail/be empty
    ];

    const messageIds = [];

    for (const t of tests) {
        const docRef = await db.collection('messages').add({
            text: t.text,
            senderId: t.uid,
            sender: t.name,
            recipientId: 'system_shark',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'USER_QUERY',
            read: false
        });
        messageIds.push({ id: docRef.id, ...t });
        console.log(`Sent [${t.name}]: "${t.text}" -> ${docRef.id}`);
    }

    console.log("\nWaiting 15s for Shark to bite...");
    await new Promise(r => setTimeout(r, 15000));

    // 4. Check Replies
    console.log("\n--- RESULTS ---");
    for (const t of messageIds) {
        // Simple Query to avoid Index Issues
        // Fetch last 10 messages for this user and filter for Shark's reply
        const replySnap = await db.collection('messages')
            .where('recipientId', '==', t.uid)
            .get();

        // Client side filtering & sorting
        const replies = replySnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => d.senderId === 'shark-ai' && d.text && d.timestamp)
            .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

        if (replies.length === 0) {
            console.log(`[${t.name}] NO REPLY FOUND.`);
            continue;
        }

        const reply = replies[0]; // Newest
        console.log(`\n[${t.name}] Q: "${t.text}"`);
        console.log(`[Shark] A: "${reply.text}"`);

        // Validation Logic
        if (t.name === 'Tariq') {
            const passed = reply.text.includes('GLOBAL') && (reply.text.includes('100kg') || reply.text.includes('Kaimana'));
            if (passed) {
                console.log("✅ VERIFIED: Global Scope Active");
            } else {
                console.warn("❌ FAILED: Global scope missing or data not found.");
            }
        }

        if (t.name === 'Budi' && t.text.includes('Jakarta')) {
            if (reply.text.includes('LOCAL') || reply.text.includes('No specific') || reply.text.includes('Unassigned')) {
                console.log("✅ VERIFIED: Budi restricted to Local Scope.");
            } else if (reply.text.includes('Wallet') && reply.text.includes('Jakarta')) {
                console.warn("⚠️ POTENTIAL LEAK: Should not see Jakarta Wallet.");
            } else {
                console.log("✅ VERIFIED: No Jakarta Data shown.");
            }
        }
    }
}

runTest();
