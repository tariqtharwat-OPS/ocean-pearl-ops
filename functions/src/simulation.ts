/**
 * Ocean Pearl OPS V2 - 7-Day Simulation Script
 * Phase 3: End-to-End Simulation
 * 
 * Usage: npm run simulation -- [--day <1-7>]
 */

import admin from 'firebase-admin';
import { receivingLogic } from './handlers/receivingHandler.js';
import { productionLogic } from './handlers/productionHandler.js';
import { wasteSaleLogic } from './handlers/wasteSaleHandler.js';
import { salesLogic } from './handlers/salesHandler.js';
import { transferLogic } from './handlers/transferHandler.js';
import { walletTransactionLogic } from './handlers/walletTransactionHandler.js';

// Initialize Firebase Admin (Default Credentials)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
admin.firestore().settings({ ignoreUndefinedProperties: true });

// Data Constants (From Seed.ts)
const LOCATION_KAIMANA = 'kaimana';
const UNIT_FACTORY_1 = 'kaimana-factory-1';
const UNIT_COLD_STORAGE = 'kaimana-cold-storage-1';
// Note: Cold Storage 1 was not in seed.ts explicit unit list? 
// Seed.ts has: 'jakarta-cold'. Kaimana has 'kaimana-factory-1', 'kaimana-drying', 'kaimana-fishmeal'.
// Kaimana Cold Storage was used in T6 test, but might not exist in Master Data?
// Let's check seed.ts content again (Step 1542).
// UNITS array:
// ... 'kaimana-factory-1', 'kaimana-factory-2', 'kaimana-drying', 'kaimana-fishmeal'.
// NO 'kaimana-cold-storage-1'.
// T6 test likely passed because T6 handler logic didn't validate Unit Existence (or T6 setup created it mocked?).
// Actually T6 setup created lot at Factory. Transfer target 'kaimana-cold-storage-1'.
// If T6 runs against Real DB (seeded), and unit missing, it might work if strict checks missing.
// But for Simulation, I should use EXISTING units.
// I will use 'kaimana-factory-2' as target? Or 'jakarta-cold'?
// Moving Fish from Kaimana to Jakarta is LOGICAL (Transfer). 
// Let's use 'jakarta-cold'.

const TARGET_UNIT = 'jakarta-cold'; // Cross-location transfer?
// If Cross-location, handler logic might need location update.
// Transfer Input: `targetLocationId`.
// So Kaimana -> Jakarta is valid.

const BOATS = ['kaimana-fishing-1', 'kaimana-fishing-2', 'kaimana-fishing-3', 'kaimana-fishing-4', 'kaimana-fishing-5'];
const RAW_ITEM = 'sardine-raw';
const FISHER_PARTNER = 'partner-fisher1';
const FROZEN_ITEM = 'sardine-frozen';
const WASTE_ITEM = 'waste-mix';
const EXPENSE_ICE = 'ice';
const VENDOR_ICE = 'partner-vendor1';
const BUYER_EXPORT = 'partner-customer-export1';

// State Tracking (To pass IDs between days)
interface SimState {
    day1_LotIds: string[];
    day2_FrozenLotIds: string[];
    day2_WasteLotIds: string[];
    day3_TransferLotIds: string[];
    day4_InvoiceIds: string[];
}
const state: SimState = {
    day1_LotIds: [],
    day2_FrozenLotIds: [],
    day2_WasteLotIds: [],
    day3_TransferLotIds: [],
    day4_InvoiceIds: []
};
// Note: In a real simulation script running separate commands, state needs persistence (file/db).
// Here we assume running "all days" in one process, OR we query DB to find recent lots if running per day.
// For Simplicity: Run ALL DAYS sequential in one go.

// Helpers
const mockAuth = (uid: string) => ({ auth: { uid } });

async function runDay0_Funding() {
    console.log('\n🌅 Day 0: Initial Funding');
    // Fund Factory 1 Wallet
    const amount = 100_000_000; // 100M IDR
    const res = await walletTransactionLogic({
        ...mockAuth('HQ_FINANCE001'),
        data: {
            operationId: `sim-day0-fund-${Date.now()}`,
            transactionType: 'FUNDING',
            locationId: LOCATION_KAIMANA,
            unitId: UNIT_FACTORY_1,
            amountIdr: amount,
            sourceAccount: 'BANK_BCA', // Mock
            equityAccount: 'OWNER_EQUITY',
            actorUserId: 'HQ_FINANCE001',
            notes: 'Day 0 Capital Injection'
        }
    } as any);
    console.log(`   ✅ Funded Factory 1: ${res.amountIdr} IDR`);
}

async function runDay1_Receive() {
    console.log('\n🎣 Day 1: Catch & Receive (5 Boats)');
    // 5 Boats land 1000kg each
    for (const boatId of BOATS) {
        const res = await receivingLogic({
            ...mockAuth('UNIT_OP_FACTORY1'),
            data: {
                operationId: `sim-day1-recv-${boatId}-${Date.now()}`,
                locationId: LOCATION_KAIMANA,
                unitId: UNIT_FACTORY_1,
                boatId: boatId,
                itemId: RAW_ITEM,
                quantityKg: 1000,
                pricePerKgIdr: 15000,
                fisherId: FISHER_PARTNER,
                actorUserId: 'UNIT_OP_FACTORY1'
            }
        } as any);
        console.log(`   ✅ Received 1000kg from ${boatId} -> Lot ${res.lotId}`);
        state.day1_LotIds.push(res.lotId);
    }
}

async function runDay2_Production() {
    console.log('\n⚙️ Day 2: Production (Processing)');
    // Pool all Day 1 lots (5000kg) -> Produce Frozen + Waste
    // Yield: 90% Frozen (4500kg), 5% Waste (250kg), 5% Shrinkage (Implied math check)
    // T3 logic: Input 5000. Output 4500 + 250 = 4750. Variance 250kg.
    // 250kg shrinkage.

    // We process each lot individually or batch?
    // ProductionHandler supports multi-input.
    // Let's batch all 5 lots.

    const inputLots = state.day1_LotIds.map(id => ({ lotId: id, quantityKg: 1000 }));

    const res = await productionLogic({
        ...mockAuth('UNIT_OP_FACTORY1'),
        data: {
            operationId: `sim-day2-prod-${Date.now()}`,
            locationId: LOCATION_KAIMANA,
            unitId: UNIT_FACTORY_1,
            inputLots: inputLots,
            outputLots: [
                { itemId: FROZEN_ITEM, quantityKg: 4500, grade: 'A', status: 'FROZEN' },
                { itemId: WASTE_ITEM, quantityKg: 250, status: 'REJECT_SELLABLE' }
            ],
            costPerKgIdr: 15000, // Carry forward cost
            actorUserId: 'UNIT_OP_FACTORY1',
            notes: 'Day 2 Batch Processing'
        }
    } as any);

    console.log(`   ✅ Production Complete. Ledger: ${res.ledgerEntryId}`);
    res.outputLotIds.forEach((id, idx) => {
        if (idx === 0) state.day2_FrozenLotIds.push(id); // Frozen
        else state.day2_WasteLotIds.push(id); // Waste
    });
}

async function runDay3_Transfer() {
    console.log('\n🚚 Day 3: Transfer to Jakarta Cold Storage');
    // Move all 4500kg Frozen to Jakarta
    const frozenLotId = state.day2_FrozenLotIds[0];

    // Note: Jakarta Unit was seeded as 'jakarta-cold'. Location 'jakarta'.

    const res = await transferLogic({
        ...mockAuth('LOC_MGR_KAIMANA'),
        data: {
            operationId: `sim-day3-trans-${Date.now()}`,
            sourceLocationId: LOCATION_KAIMANA,
            sourceUnitId: UNIT_FACTORY_1,
            targetLocationId: 'jakarta',
            targetUnitId: 'jakarta-cold',
            items: [
                { lotId: frozenLotId, quantityKg: 4500 }
            ],
            actorUserId: 'LOC_MGR_KAIMANA',
            notes: 'Shipment to Jakarta'
        }
    } as any);

    console.log(`   ✅ Transfer Complete. New Lot: ${res.outputLotIds[0]}`);
    state.day3_TransferLotIds.push(res.outputLotIds[0]);
}

async function runDay4_Sales() {
    console.log('\n💰 Day 4: Export Sales (Jakarta)');
    // Sell 4500kg from Jakarta
    const jakartaLotId = state.day3_TransferLotIds[0];

    const res = await salesLogic({
        ...mockAuth('HQ_ADMIN001'), // Sales usually HQ
        data: {
            operationId: `sim-day4-sale-${Date.now()}`,
            locationId: 'jakarta',
            unitId: 'jakarta-cold',
            buyerId: BUYER_EXPORT,
            items: [
                { lotId: jakartaLotId, quantityKg: 4500, pricePerKgIdr: 85000 }
            ],
            actorUserId: 'HQ_ADMIN001',
            notes: 'Export Sale Full Container'
        }
    } as any);
    console.log(`   ✅ Sale Complete. Invoice: ${res.invoiceId}. Revenue: 4500 * 85000 = ${4500 * 85000}`);
}

async function runDay5_Expenses() {
    console.log('\n💸 Day 5: Operational Expenses (Ice)');
    // Buy Ice for Factory 1
    const res = await walletTransactionLogic({
        ...mockAuth('UNIT_OP_FACTORY1'),
        data: {
            operationId: `sim-day5-exp-${Date.now()}`,
            transactionType: 'EXPENSE',
            locationId: LOCATION_KAIMANA,
            unitId: UNIT_FACTORY_1,
            amountIdr: 5_000_000,
            expenseAccount: 'EXPENSE_ICE', // Maps to Ice
            paymentMethod: 'CASH', // From Wallet
            beneficiaryPartnerId: VENDOR_ICE,
            actorUserId: 'UNIT_OP_FACTORY1',
            notes: 'Weekly Ice Supply'
        }
    } as any);
    console.log(`   ✅ Expense Paid: ${res.amountIdr}`);
}

async function main() {
    console.log('🚀 Ocean Pearl OPS V2 - 7-Day Simulation');
    console.log('========================================');

    try {
        await runDay0_Funding();
        await runDay1_Receive();
        await runDay2_Production();
        await runDay3_Transfer();
        await runDay4_Sales();
        await runDay5_Expenses();

        console.log('\n✨ Simulation Completed Successfully!');

    } catch (error) {
        console.error('\n❌ Simulation Failed:', error);
        process.exit(1);
    }
}

main().then(() => process.exit(0));
