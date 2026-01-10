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

async function runV2Test() {
    console.log("--- V2 EXECUTION VERIFICATION ---");
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    // Explicitly using the region
    const functions = getFunctions(app, 'asia-southeast2');

    // TEST 1: LOC_MANAGER Direct Execution (Should Succeed)
    console.log("\n[TEST 1] LOC_MANAGER Direct Expense");
    try {
        await signInWithEmailAndPassword(auth, 'admin_kaimana@ops.com', 'OceanPearl2026!');
        console.log("Logged in as Manager: admin_kaimana@ops.com");

        const postTransaction = httpsCallable(functions, 'postTransaction');
        const res = await postTransaction({
            type: 'EXPENSE',
            amount: 5000,
            description: 'V2 Test Script - Manager Direct',
            paymentMethod: 'cash',
            locationId: 'kaimana',
            unitId: 'gudang_utama', // Assuming this unit exists
            // Need to provide minimal context fields if the function relies on client for logic (it validates, but V6 patch injects them on client)
            // Function reads Auth Token for permission.
        });
        console.log("✅ Manager Execution SUCCESS:", res.data);
    } catch (e) {
        console.error("❌ Manager Execution FAILED:", e.message);
    }

    // TEST 2: UNIT_OP Financial Request (Should Succeed)
    console.log("\n[TEST 2] UNIT_OP Financial Request");
    try {
        await signInWithEmailAndPassword(auth, 'staff_jakarta_cs@ops.com', 'OceanPearl2026!');
        console.log("Logged in as Operator: staff_jakarta_cs@ops.com");

        // 2a. Get User Scope to ensure valid request
        const { getFirestore, doc, getDoc } = require('firebase/firestore');
        const db = getFirestore(app);
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const userData = userDoc.data();
        console.log(`User Scope: Loc=${userData.locationId}, Unit=${userData.unitId || userData.target_id}`);

        const createReq = httpsCallable(functions, 'createFinancialRequest');
        const res = await createReq({
            type: 'EXPENSE',
            amount: 7000,
            description: 'V2 Test Script - Op Request',
            locationId: userData.locationId,
            unitId: userData.unitId || userData.target_id // Handle both formats
        });
        console.log("✅ Operator Request SUCCESS:", res.data);
    } catch (e) {
        console.error("❌ Operator Request FAILED:", e.message);
    }

    // TEST 3: UNIT_OP Direct Execution (Should FAIL)
    console.log("\n[TEST 3] UNIT_OP Direct Execution (Negative Test)");
    try {
        // Already logged in as OP
        const postTransaction = httpsCallable(functions, 'postTransaction');
        await postTransaction({
            type: 'EXPENSE',
            amount: 999,
            description: 'Should Fail',
            paymentMethod: 'cash',
            locationId: 'jakarta',
            unitId: 'cold_storage_1'
        });
        console.log("❌ FAILURE: Operator Execute SUCCEEDED (Should have been blocked)");
    } catch (e) {
        console.log("✅ Operator Execute BLOCKED:", e.message);
    }

    process.exit(0);
}

runV2Test();
