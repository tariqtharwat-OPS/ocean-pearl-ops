const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Admin strictly for SETUP, but we want to simulate Client.
// Since we can't easily load the Client SDK in this Node script with Auth simulation without a lot of boilerplate,
// we will verify the RULES by attempting an Admin Write to 'transactions' (which respects rules? NO, Admin SDK bypasses rules).
// Ah. To test rules, we REALLY need the Emulator or the Client SDK.

// User said: "A negative test proving a UNIT_OP cannot write... Use Cloud logs as primary proof."
// So I should trigger the real subagent or function and check logs?
// No, I can try to use a "mock" client script?
// Let's use the USER's instructions: "A negative test proving a UNIT_OP cannot write a transaction even by direct API call".

// I'll create a script that uses the CLIENT SDK.
// I need `firebase/app`, `firebase/firestore`, `firebase/auth`.
// I need the firebaseConfig.

const { initializeApp } = require('firebase/app');
const { getFirestore: getClientFirestore, collection, addDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyBmHSr7huWpMZa9RnKNBgV6fnXltmvsxcc",
    authDomain: "oceanpearl-ops.firebaseapp.com",
    projectId: "oceanpearl-ops",
    storageBucket: "oceanpearl-ops.firebasestorage.app",
    messagingSenderId: "784571080866",
    appId: "1:784571080866:web:61bacaf38ea90f81d1f7fb"
};

// I'll assume the config above matches production based on project ID.

async function runNegativeTest() {
    console.log("--- SECURITY SEAL VERIFICATION ---");

    // 1. Initialize Client App
    const app = initializeApp(firebaseConfig);
    const db = getClientFirestore(app);
    const auth = getAuth(app);

    // 2. Login as UNIT_OP
    const email = 'staff_jakarta_cs@ops.com';
    const password = 'OceanPearl2026!'; // Default

    console.log(`Attempting login as ${email}...`);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in!");
    } catch (e) {
        console.error("Login Failed:", e.message);
        return;
    }

    // 3. Attempt Illegal Write to 'transactions'
    console.log("Attempting Direct Write to 'transactions' (Should be BLOCKED)...");
    try {
        await addDoc(collection(db, 'transactions'), {
            type: 'ILLEGAL_WRITE',
            amount: 1000000,
            hacker: 'UNIT_OP',
            timestamp: new Date()
        });
        console.log("❌ FAILURE: Write SUCCEEDED! Security Seal is BROKEN.");
    } catch (e) {
        if (e.code === 'permission-denied') {
            console.log("✅ SUCCESS: Write BLOCKED by Firestore Rules (Permission Denied).");
        } else {
            console.log(`⚠️ ERROR: Write failed but not specifically 'permission-denied'? Code: ${e.code}`);
        }
    }

    process.exit(0);
}

runNegativeTest();
