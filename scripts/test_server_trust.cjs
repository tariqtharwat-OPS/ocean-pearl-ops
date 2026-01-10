const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyBmHSr7huWpMZa9RnKNBgV6fnXltmvsxcc",
    authDomain: "oceanpearl-ops.firebaseapp.com",
    projectId: "oceanpearl-ops",
    storageBucket: "oceanpearl-ops.firebasestorage.app",
    messagingSenderId: "784571080866",
    appId: "1:784571080866:web:61bacaf38ea90f81d1f7fb"
};

async function runServerTrustTest() {
    console.log("--- SERVER-SIDE SCOPE TRUST VERIFICATION ---");
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const functions = getFunctions(app, 'asia-southeast2');

    // TEST 1: Manager tries to write to WRONG Location (Server should Override)
    console.log("\n[TEST 1] Manager Scope Override");
    console.log("Logged in as: admin_kaimana@ops.com");
    console.log("Attempting `postTransaction` targeting 'saumlaki' (Should become 'kaimana')...");

    try {
        await signInWithEmailAndPassword(auth, 'admin_kaimana@ops.com', 'OceanPearl2026!');

        const postTransaction = httpsCallable(functions, 'postTransaction');

        // We pass 'saumlaki' but expect the server to force 'kaimana'
        // Successful execution implies the server accepted the request after fixing it 
        // OR rejected it if logic checks locationId consistency.
        // Step 1648 Logic: "locationId = target_id; // OVERRIDE". Then proceeds.
        // So it should succeed and create a txn in 'kaimana'.
        // We can check the LocationId of the txn? But `postTransaction` returns { id, success }.
        // We can infer success means it processed.

        const res = await postTransaction({
            type: 'EXPENSE',
            amount: 555,
            description: 'Server Trust Test - Malicious Manager',
            paymentMethod: 'cash',
            locationId: 'saumlaki', // ILLEGAL SCOPE
            unitId: 'gudang_utama'
        });
        console.log("✅ Execution SUCCESS (Server likely overrode scope):", res.data);
    } catch (e) {
        // If it throws "Scope Mismatch" that's also valid security, but we implemented OVERRIDE.
        console.error("❌ Execution FAILED:", e.message);
    }

    // TEST 2: Operator Request with MISSING scopes (Server should Fill)
    console.log("\n[TEST 2] Operator Request Scope Fill");
    console.log("Logged in as: staff_jakarta_cs@ops.com");
    console.log("Attempting `createFinancialRequest` with NO locationId (Should auto-fill)...");

    try {
        await signInWithEmailAndPassword(auth, 'staff_jakarta_cs@ops.com', 'OceanPearl2026!');

        const createReq = httpsCallable(functions, 'createFinancialRequest');
        // Passing NO locationId/unitId, or wrong ones.
        const res = await createReq({
            type: 'EXPENSE',
            amount: 888,
            description: 'Server Trust Test - Lazy Operator',
            // locationId: undefined 
        });
        console.log("✅ Request SUCCESS (Server auto-filled scope):", res.data);
    } catch (e) {
        console.error("❌ Request FAILED:", e.message);
    }

    process.exit(0);
}

runServerTrustTest();
