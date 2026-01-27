const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (using default credentials)
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops', // Explicitly set project ID if needed
    });
}
const db = getFirestore();

async function checkTransaction() {
    console.log("Checking for transactions from 'Bapak Ryan'...");

    // Check 'transactions' collection
    // The user said the Total Amount is Rp 14,503,500
    // We can search by amount or vendor or timestamp

    const amount = 14503500;

    // Query 1: By Amount and Type
    const q1 = db.collection('transactions')
        .where('totalAmount', '==', amount);

    const snap1 = await q1.get();

    if (snap1.empty) {
        console.log("No transactions found with exact totalAmount:", amount);
    } else {
        console.log(`Found ${snap1.size} transaction(s) with amount ${amount}:`);
        snap1.forEach(doc => {
            console.log(`- ID: ${doc.id}, Type: ${doc.data().type}, Date: ${doc.data().timestamp?.toDate()}`);
        });
    }

    // Query 2: Recent transactions (last 24 hours) to see if anything weird happened
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const q2 = db.collection('transactions')
        .orderBy('timestamp', 'desc')
        .limit(10);

    const snap2 = await q2.get();
    console.log("\nRecent 10 Transactions:");
    snap2.forEach(doc => {
        const data = doc.data();
        console.log(`- [${data.timestamp?.toDate().toISOString()}] ${data.type} | Amount: ${data.totalAmount} | id: ${doc.id}`);
    });
}

checkTransaction().catch(console.error);
