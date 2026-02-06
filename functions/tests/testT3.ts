import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { productionLogic } from '../src/handlers/productionHandler.js';

// Initialize Firebase Admin (only once)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Test Scenario Data
const TEST_UNIT_ID = 'kaimana-factory-1'; // FACTORY unit (receives & produces)
const TEST_BOAT_ID = 'kaimana-fishing-1'; // Source boat
const RAW_ITEM_ID = 'shark-sardine';
const FROZEN_ITEM_ID = 'sardine-frozen';
const WASTE_ITEM_ID = 'waste-mix';

/**
 * Helper: Setup Input Lot via Receiving Handler
 * (To test T3 properly, we need an existing lot. 
 *  We use T1 receivingHandler logic to create it authentically.)
 */
async function setupInputLot() {
    console.log('\n🔧 Setup: Creating input lot at factory via receiving...');

    // Simulate Receiving: Boat delivers to Factory
    // Note: In Phase 2, we receive DIRECTLY at the factory for simplicity T3 test
    // or we receive at boat and transfer. 
    // For T3 "Production/Transformation", valid input is a lot at the production unit.

    const operationId = `setup-recv-${Date.now()}`;

    const receivePayload = {
        operationId,
        locationId: 'kaimana',
        unitId: TEST_UNIT_ID, // FACTORY receives raw material (not boat)
        boatId: TEST_BOAT_ID, // Track source boat
        itemId: RAW_ITEM_ID,
        quantityKg: 500, // 500 KG Raw
        pricePerKgIdr: 15000,
        fisherId: 'partner-123',
        actorUserId: 'SETUP_BOT',
        notes: 'Setup for T3 Production Test'
    };

    // Authentic execution via Logic function
    const mockRequest = {
        auth: { uid: 'SETUP_BOT' },
        data: receivePayload
    };

    const result = await receivingLogic(mockRequest as any); // Call LOGIC directly

    console.log(`✅ Input lot created: ${result.lotId} (500 kg)`);
    return result.lotId;
}

/**
 * Main Test: Production Handler
 */
async function runTest() {
    console.log('\n🧪 TEST T3: Production Handler');
    console.log('=====================================');

    try {
        // Step 1: Create Input Lot
        const inputLotId = await setupInputLot();

        // Step 2: Execute Production (Raw -> Frozen)
        // 500 kg Input -> 480 kg Frozen + 20 kg Waste
        // Yield: 96%

        console.log('\n▶️  Executing Production...');
        const operationId = `test-production-001-${Date.now()}`;

        const productionPayload = {
            operationId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID, // Must match input lot unit
            inputLots: [
                {
                    lotId: inputLotId,
                    quantityKg: 500 // Consume ALL
                }
            ],
            outputLots: [
                {
                    itemId: FROZEN_ITEM_ID,
                    quantityKg: 480,
                    grade: 'A',
                    status: 'FROZEN'
                },
                {
                    itemId: WASTE_ITEM_ID,
                    quantityKg: 20,
                    status: 'REJECT_SELLABLE'
                }
            ],
            costPerKgIdr: 15000, // Carry forward cost
            actorUserId: 'UNIT_OP_FACTORY1',
            notes: 'Test T3: Raw -> Frozen + Waste'
        };

        const mockRequest = {
            auth: { uid: 'UNIT_OP_FACTORY1' },
            data: productionPayload
        };

        // CALL HANDLER LOGIC
        const result = await productionLogic(mockRequest as any); // Call LOGIC directly

        console.log('\n✅ Production Success!');
        console.log(`   Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   Output Lots: ${result.outputLotIds.length}`);
        console.log(`   Trace Links: ${result.traceLinkIds.length}`);

        // Step 3: Verify Ledger
        console.log('\n🔍 Verifying Ledger...');
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        const ledgerData = ledgerDoc.data();

        if (!ledgerData) throw new Error('Ledger entry not found');

        const debits = ledgerData.lines.filter((l: any) => l.direction === 'DEBIT');
        const credits = ledgerData.lines.filter((l: any) => l.direction === 'CREDIT');

        const totalDebit = debits.reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        const totalCredit = credits.reduce((sum: number, l: any) => sum + l.amountIdr, 0);

        console.log(`   Total DEBIT: ${totalDebit}`);
        console.log(`   Total CREDIT: ${totalCredit}`);

        if (Math.abs(totalDebit - totalCredit) > 1) {
            throw new Error(`Ledger unbalanced! Diff: ${totalDebit - totalCredit}`);
        }
        console.log('✅ BALANCED: Debits == Credits');

        // Step 4: Verify Input Lot (Should be 0 remaining)
        console.log('\n🔍 Verifying Input Lot Consumption...');
        const inputLotDoc = await db.collection('inventory_lots').doc(inputLotId).get();
        const inputLotData = inputLotDoc.data();
        console.log(`   Input Remaining: ${inputLotData?.quantityKgRemaining} kg`);

        if (inputLotData?.quantityKgRemaining !== 0) {
            throw new Error('Input lot not fully consumed');
        }
        console.log('✅ Input Lot Updated');

        // Step 5: Verify Output Lots
        console.log('\n🔍 Verifying Output Lots...');
        console.log(`   Created ${result.outputLotIds.length} lots`);
        console.log('✅ Output Lots Created');

        // Step 6: Verify Trace Links
        // Expect 1 Input x 2 Outputs = 2 Trace Links
        const expectedTraceLinks = 1 * 2;
        console.log(`✅ Trace Links Created: ${result.traceLinkIds.length} (expected ${expectedTraceLinks})`);
        if (result.traceLinkIds.length !== expectedTraceLinks) {
            throw new Error(`Expected ${expectedTraceLinks} trace links, got ${result.traceLinkIds.length}`);
        }

        console.log('\n🎉 TEST T3: PASS');

        // Step 7: Idempotency Check
        console.log('\n🔄 Checking Idempotency...');
        const retryResult = await productionLogic(mockRequest as any); // Logic
        if (retryResult.ledgerEntryId === result.ledgerEntryId) {
            console.log('✅ IDEMPOTENCY: Same result returned');
        } else {
            throw new Error('Idempotency failed - different result returned');
        }

    } catch (error) {
        console.error('\n❌ FAIL:', error);
        process.exit(1);
    }
}

runTest();
