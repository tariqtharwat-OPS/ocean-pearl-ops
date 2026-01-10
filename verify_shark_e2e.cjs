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

async function testSharkLatency() {
    const testId = `TEST_${Date.now()}`;
    const userDocRef = db.collection('users').doc(testId);

    // 1. Create a dummy user to ensure context lookup works
    await userDocRef.set({
        displayName: "Test Verifier",
        role: "operator",
        locationId: "KAI_LOC",
        unitId: "KAI_UNIT_1"
    });

    console.log(`[${new Date().toISOString()}] Starting Shark AI E2E Latency Test...`);
    console.log(`User ID: ${testId}`);

    const start = Date.now();

    // 2. Send Message
    const msgRef = await db.collection('messages').add({
        senderId: testId,
        sender: "Test Verifier",
        text: "What is the stock situation in Kaimana?",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'USER_QUERY'
    });

    console.log(`[${new Date().toISOString()}] Message sent (ID: ${msgRef.id}). Waiting for reply...`);

    // 3. Listen for Reply
    const unsubscribe = db.collection('messages')
        .where('recipientId', '==', testId)
        .where('type', '==', 'AI_REPLY')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const end = Date.now();
                    const reply = change.doc.data();
                    const duration = end - start;

                    console.log(`\n✅ REPLY RECEIVED in ${duration}ms!`);
                    console.log(`----------------------------------------`);
                    console.log(`Shark Said: "${reply.text}"`);
                    console.log(`----------------------------------------`);

                    // Cleanup
                    unsubscribe();
                    process.exit(0);
                }
            });
        }, err => {
            console.error("Listen error:", err);
            process.exit(1);
        });

    // Timeout safety
    setTimeout(() => {
        console.error("\n❌ TIMEOUT: No reply received within 30 seconds.");
        process.exit(1);
    }, 30000);
}

testSharkLatency();
