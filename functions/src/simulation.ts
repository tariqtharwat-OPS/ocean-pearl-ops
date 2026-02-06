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
const RAW_ITEM = 'sardine-raw';
const FISHER_PARTNER = 'partner-fisher1';
const FROZEN_ITEM = 'sardine-frozen';
const WASTE_ITEM = 'waste-mix';
const VENDOR_ICE = 'partner-vendor1';
const BUYER_EXPORT = 'partner-customer-export1';

// State Tracking (To pass IDs between days)
interface SimState {
    day1_LotIds: string[];
    day2_FrozenLotIds: string[];
    day2_WasteLotIds: string[];
    day3_TransferLotIds: string[];
}
const state: SimState = {
    day1_LotIds: [],
    day2_FrozenLotIds: [],
    day2_WasteLotIds: [],
    day3_TransferLotIds: []
};

// Helpers
const mockAuth = (uid: string) => ({ auth: { uid } });

async function runDay0_Funding() {
    console.log('\n🌅 Day 0: Initial Funding');
    const amount = 100_000_000; // 100M IDR
    const res = await walletTransactionLogic({
        ...mockAuth('HQ_FINANCE001'),
        data: {
            operationId: `sim-day0-fund-${Date.now()}`,
            transactionType: 'FUNDING',
            locationId: LOCATION_KAIMANA,
            unitId: UNIT_FACTORY_1,
            amountIdr: amount,
            sourceAccount: 'BANK_BCA',
            equityAccount: 'OWNER_EQUITY',
            actorUserId: 'HQ_FINANCE001',
            notes: 'Day 0 Capital Injection'
        }
    } as any);
    console.log(`   ✅ Funded Factory 1: ${res.amountIdr.toLocaleString('en-ID')} IDR`);
}

async function runDay1_Receive() {
    console.log('\n🎣 Day 1: Catch & Receive (5 Boats)');
    const BOATS = ['kaimana-fishing-1', 'kaimana-fishing-2', 'kaimana-fishing-3', 'kaimana-fishing-4', 'kaimana-fishing-5'];

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
        console.log(`   ✅ Rcv 1000kg from ${boatId} -> Lot ${res.lotId}`);
        state.day1_LotIds.push(res.lotId);
    }
}

async function runDay2_Production() {
    console.log('\n⚙️ Day 2: Production (Processing)');
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
            // Derived Cost
            actorUserId: 'UNIT_OP_FACTORY1',
            notes: 'Day 2 Batch Processing'
        }
    } as any);

    console.log(`   ✅ Prod Complete. Ledger: ${res.ledgerEntryId}`);
    res.outputLotIds.forEach((id, idx) => {
        if (idx === 0) {
            state.day2_FrozenLotIds.push(id);
            console.log(`   🧊 Frozen Lot: ${id}`);
        } else {
            state.day2_WasteLotIds.push(id);
            console.log(`   🗑️ Waste Lot:  ${id}`);
        }
    });
}

async function runDay3_Transfer() {
    console.log('\n🚚 Day 3: Transfer to Jakarta Cold Storage');
    const frozenLotId = state.day2_FrozenLotIds[0];

    // Transfer 4500kg to Jakarta Cold Storage
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
    const jakartaLotId = state.day3_TransferLotIds[0];

    const res = await salesLogic({
        ...mockAuth('HQ_ADMIN001'),
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
    console.log(`   ✅ Sale Complete. Invoice: ${res.invoiceId}. Revenue: ${4500 * 85000}`);
}

async function runDay5_Expenses() {
    console.log('\n💸 Day 5: Operational Expenses (Ice)');
    const res = await walletTransactionLogic({
        ...mockAuth('UNIT_OP_FACTORY1'),
        data: {
            operationId: `sim-day5-exp-${Date.now()}`,
            transactionType: 'EXPENSE',
            locationId: LOCATION_KAIMANA,
            unitId: UNIT_FACTORY_1,
            amountIdr: 5_000_000,
            expenseAccount: 'EXPENSE_ICE',
            paymentMethod: 'CASH',
            beneficiaryPartnerId: VENDOR_ICE,
            actorUserId: 'UNIT_OP_FACTORY1',
            notes: 'Weekly Ice Supply'
        }
    } as any);
    console.log(`   ✅ Expense Paid: ${res.amountIdr.toLocaleString('en-ID')} IDR`);
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
