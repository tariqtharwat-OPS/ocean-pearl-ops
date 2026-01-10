const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBmHSr7huWpMZa9RnKNBgV6fnXltmvsxcc",
    authDomain: "oceanpearl-ops.firebaseapp.com",
    projectId: "oceanpearl-ops",
    storageBucket: "oceanpearl-ops.firebasestorage.app",
    messagingSenderId: "784571080866",
    appId: "1:784571080866:web:61bacaf38ea90f81d1f7fb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'asia-southeast2');

async function getWalletBalance(id) {
    const d = await getDoc(doc(db, 'site_wallets', id));
    return d.exists() ? (d.data().balance || 0) : 0;
}

async function runMoneyPathTest() {
    console.log("--- V2 MONEY PATH VERIFICATION ---");

    // 1. SETUP: Kaimana Operator
    console.log("\n[STEP A] UNIT_OP (Kaimana) Creates Expense Request");
    await signInWithEmailAndPassword(auth, 'user_kaimana_gudang@ops.com', 'OceanPearl2026!');

    // Check Initial Wallet
    const startBalance = await getWalletBalance('kaimana');
    console.log(`Initial Kaimana Balance: ${startBalance}`);

    const createReq = httpsCallable(functions, 'createFinancialRequest');
    const reqRes = await createReq({
        type: 'EXPENSE',
        amount: 500,
        description: 'V2 Money Path Test - Item A',
        locationId: 'kaimana', // Will be enforced by server anyway
        unitId: 'gudang_utama'
    });
    const requestId = reqRes.data.requestId;
    console.log(`Request Created: ${requestId}`);

    // Verify No Wallet Change
    const midBalance = await getWalletBalance('kaimana');
    if (midBalance !== startBalance) {
        console.error(`❌ FAILURE: Wallet changed immediately! ${startBalance} -> ${midBalance}`);
        // process.exit(1); 
    } else {
        console.log(`✅ SUCCESS: Wallet Unchanged (Pending Approval).`);
    }

    await signOut(auth);

    // 2. APPROVAL: Kaimana Manager
    console.log("\n[STEP B] LOC_MANAGER (Kaimana) Approves Request");
    await signInWithEmailAndPassword(auth, 'admin_kaimana@ops.com', 'OceanPearl2026!');

    const approveReq = httpsCallable(functions, 'approveFinancialRequest');
    await approveReq({ requestId });
    console.log("Request Approved.");

    // Verify Wallet Deducted
    const postApproveBalance = await getWalletBalance('kaimana');
    console.log(`Post-Approval Balance: ${postApproveBalance}`);
    if (Math.abs((startBalance - 500) - postApproveBalance) < 0.1) {
        console.log("✅ SUCCESS: Wallet Deducted correctly (-500).");
    } else {
        console.error(`❌ FAILURE: Incorrect Deduction. Expected ${startBalance - 500}, got ${postApproveBalance}`);
    }

    // 3. FUNDING: Manager Requests 1000 from HQ
    console.log("\n[STEP C] LOC_MANAGER Requests Funding (1000)");
    const fundReqRes = await createReq({
        type: 'FUNDING',
        amount: 1000,
        description: 'V2 Funding Test',
        locationId: 'kaimana'
    });
    const fundRequestId = fundReqRes.data.requestId;
    console.log(`Funding Request Created: ${fundRequestId}`);

    await signOut(auth);

    // 4. HQ APPROVAL: Tariq
    console.log("\n[STEP D] HQ_ADMIN Approves Funding");
    await signInWithEmailAndPassword(auth, 'tariq@oceanpearlseafood.com', 'OceanPearl2026!');

    const hqStart = await getWalletBalance('HQ');
    console.log(`Initial HQ Balance: ${hqStart}`);

    await approveReq({ requestId: fundRequestId });
    console.log("Funding Approved.");

    // Verify Transfer
    const hqEnd = await getWalletBalance('HQ');
    const kaimanaFinal = await getWalletBalance('kaimana');

    console.log(`Final HQ: ${hqEnd} (Expected ${hqStart - 1000})`);
    console.log(`Final Kaimana: ${kaimanaFinal} (Expected ${postApproveBalance + 1000})`);

    if (Math.abs((hqStart - 1000) - hqEnd) < 0.1 && Math.abs((postApproveBalance + 1000) - kaimanaFinal) < 0.1) {
        console.log("✅ SUCCESS: HQ Transfer Complete (Zero Sum).");
    } else {
        console.error("❌ FAILURE: Wallet mismatch.");
    }

    process.exit(0);
}

runMoneyPathTest();
