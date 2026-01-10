const admin = require('firebase-admin');
const { chatWithShark } = require('../functions/shark_brain');

const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function testSharkLogic() {
    console.log("=== TESTING SHARK AI LOGIC (PHASE 7) ===");

    // 1. Mock User Context (Unit Operator)
    const userContextEN = {
        name: 'Test Operator',
        role: 'UNIT_OP',
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        language: 'EN'
    };

    console.log("\n--- TEST 1: English Draft Request ---");
    const msg1 = "Draft expense 1.5M IDR for Packaging from CV Jaya";
    console.log(`User Input: "${msg1}"`);

    // Call Brain Directly
    const response1 = await chatWithShark(msg1, userContextEN);

    console.log("AI Response:", response1.text);
    if (response1.draft) {
        console.log("DRAFT GENERATED:", JSON.stringify(response1.draft, null, 2));
        if (response1.draft.type === 'EXPENSE_REQUEST' && response1.draft.payload.amount === 1500000) {
            console.log("✅ PASS: Draft structure valid.");
        } else {
            console.error("❌ FAIL: Draft content incorrect.");
        }
    } else {
        console.error("❌ FAIL: No draft generated.");
    }

    // 2. Mock User Context (Indonesian)
    const userContextID = {
        name: 'Staf Gudang',
        role: 'UNIT_OP',
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        language: 'ID'
    };

    console.log("\n--- TEST 2: Indonesian Draft Request ---");
    const msg2 = "Buatkan permintaan dana 500rb untuk beli solar";
    console.log(`User Input: "${msg2}"`);

    const response2 = await chatWithShark(msg2, userContextID);

    console.log("AI Response:", response2.text);
    if (response2.draft) {
        console.log("DRAFT GENERATED:", JSON.stringify(response2.draft, null, 2));
        if (response2.draft.type === 'EXPENSE_REQUEST' && response2.draft.payload.amount === 500000) {
            console.log("✅ PASS: ID Draft structure valid.");
        } else {
            console.error("❌ FAIL: ID Draft content incorrect.");
        }
    } else {
        console.error("❌ FAIL: No ID draft generated.");
    }
}

testSharkLogic().catch(console.error);
