const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testWrite() {
    try {
        const res = await db.collection('messages').add({
            text: 'Admin SDK Test',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Admin Write Success:', res.id);
    } catch (e) {
        console.error('Admin Write Failed:', e);
    }
}

testWrite();
