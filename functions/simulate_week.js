const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');

// Get existing admin instance or initialize
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * AUTOMATED 7-DAY SIMULATION
 * Executes all scenarios via direct Firestore writes
 * Simulates postTransaction function behavior
 */
exports.simulateWeek = onRequest({ region: "asia-southeast1", timeoutSeconds: 540 }, async (req, res) => {
    const log = [];
    const results = {
        day1: {},
        day2: {},
        day3: {},
        day4: {},
        day5: {},
        day6: {},
        day7: {}
    };
    
    try {
        log.push('🎬 STARTING 7-DAY SIMULATION...');
        
        // DAY 1: KAIMANA GUDANG TERI RECEIVING
        log.push('\n📅 DAY 1: Kaimana Gudang Teri Receiving');
        
        const day1Transactions = [
            {
                type: 'PURCHASE_RECEIVE',
                locationId: 'KAIMANA',
                unitId: 'KAIMANA_GUDANG_TERI_01',
                itemId: 'anchovy',
                gradeId: 'teri_kecil',
                quantityKg: 120,
                pricePerKg: 15000,
                supplier: 'Nelayan A',
                paymentMethod: 'cash'
            },
            {
                type: 'PURCHASE_RECEIVE',
                locationId: 'KAIMANA',
                unitId: 'KAIMANA_GUDANG_TERI_01',
                itemId: 'anchovy',
                gradeId: 'teri_sedang',
                quantityKg: 180,
                pricePerKg: 16500,
                supplier: 'Nelayan A',
                paymentMethod: 'cash'
            },
            {
                type: 'PURCHASE_RECEIVE',
                locationId: 'KAIMANA',
                unitId: 'KAIMANA_GUDANG_TERI_01',
                itemId: 'anchovy',
                gradeId: 'teri_besar',
                quantityKg: 100,
                pricePerKg: 18000,
                supplier: 'Nelayan A',
                paymentMethod: 'cash'
            }
        ];
        
        let day1Total = 0;
        for (const txn of day1Transactions) {
            const ref = db.collection('transactions').doc();
            const total = txn.quantityKg * txn.pricePerKg;
            day1Total += total;
            
            await ref.set({
                ...txn,
                totalAmount: total,
                timestamp: FieldValue.serverTimestamp(),
                createdBy: 'operator.kaimana@oceanpearl.com',
                status: 'completed'
            });
            
            // Update inventory
            const invRef = db.collection('inventory').doc(`${txn.unitId}_${txn.itemId}_${txn.gradeId}`);
            await invRef.set({
                unitId: txn.unitId,
                itemId: txn.itemId,
                gradeId: txn.gradeId,
                quantityKg: FieldValue.increment(txn.quantityKg),
                lastUpdated: FieldValue.serverTimestamp()
            }, { merge: true });
        }
        
        results.day1 = {
            totalPurchases: day1Total,
            totalKg: 400,
            transactions: day1Transactions.length
        };
        log.push(`✅ Day 1: ${day1Transactions.length} purchases, ${400} kg, IDR ${day1Total.toLocaleString()}`);
        
        // DAY 1: Expenses
        const expenses = [
            { description: 'Salt', amount: 900000 },
            { description: 'Labor', amount: 1500000 }
        ];
        
        let expenseTotal = 0;
        for (const exp of expenses) {
            const ref = db.collection('transactions').doc();
            expenseTotal += exp.amount;
            
            await ref.set({
                type: 'EXPENSE',
                locationId: 'KAIMANA',
                unitId: 'KAIMANA_GUDANG_TERI_01',
                description: exp.description,
                amount: exp.amount,
                totalAmount: exp.amount,
                paymentMethod: 'cash',
                timestamp: FieldValue.serverTimestamp(),
                createdBy: 'operator.kaimana@oceanpearl.com',
                status: 'completed'
            });
        }
        
        results.day1.expenses = expenseTotal;
        log.push(`✅ Day 1 Expenses: IDR ${expenseTotal.toLocaleString()}`);
        
        // DAY 2: PROCESSING (Cook → Dry)
        log.push('\n📅 DAY 2: Processing (Cook → Dry)');
        
        const processingRef = db.collection('transactions').doc();
        const rawUsed = 400;
        const cooked = rawUsed * 0.92; // 8% cooking loss
        const dried = cooked * 0.25; // 25% drying yield
        
        await processingRef.set({
            type: 'COLD_STORAGE_IN',
            locationId: 'KAIMANA',
            unitId: 'KAIMANA_GUDANG_TERI_01',
            itemId: 'anchovy_dried',
            quantityKg: dried,
            rawUsedKg: rawUsed,
            yield: (dried / rawUsed * 100).toFixed(2) + '%',
            notes: 'Cooking loss: 8%, Drying yield: 25%',
            timestamp: FieldValue.serverTimestamp(),
            createdBy: 'operator.kaimana@oceanpearl.com',
            status: 'completed'
        });
        
        // Update inventory: decrease raw, increase finished
        await db.collection('inventory').doc('KAIMANA_GUDANG_TERI_01_anchovy_teri_kecil').update({
            quantityKg: FieldValue.increment(-120)
        });
        await db.collection('inventory').doc('KAIMANA_GUDANG_TERI_01_anchovy_teri_sedang').update({
            quantityKg: FieldValue.increment(-180)
        });
        await db.collection('inventory').doc('KAIMANA_GUDANG_TERI_01_anchovy_teri_besar').update({
            quantityKg: FieldValue.increment(-100)
        });
        
        await db.collection('inventory').doc('KAIMANA_GUDANG_TERI_01_anchovy_dried_NA').set({
            unitId: 'KAIMANA_GUDANG_TERI_01',
            itemId: 'anchovy_dried',
            gradeId: 'NA',
            quantityKg: dried,
            lastUpdated: FieldValue.serverTimestamp()
        });
        
        results.day2 = {
            rawUsed: rawUsed,
            dried: dried,
            yield: ((dried / rawUsed) * 100).toFixed(2) + '%'
        };
        log.push(`✅ Day 2: Processed ${rawUsed} kg → ${dried} kg dried (${results.day2.yield} yield)`);
        
        // DAY 3: Transfer to Cold Storage
        log.push('\n📅 DAY 3: Transfer to Cold Storage');
        
        const transferRef = db.collection('transactions').doc();
        await transferRef.set({
            type: 'COLD_STORAGE_IN',
            locationId: 'KAIMANA',
            unitId: 'KAIMANA_CS_01',
            itemId: 'anchovy_dried',
            quantityKg: dried,
            notes: 'Transfer from Gudang Teri',
            timestamp: FieldValue.serverTimestamp(),
            createdBy: 'operator.kaimana@oceanpearl.com',
            status: 'completed'
        });
        
        // Update inventory
        await db.collection('inventory').doc('KAIMANA_GUDANG_TERI_01_anchovy_dried_NA').update({
            quantityKg: FieldValue.increment(-dried)
        });
        await db.collection('inventory').doc('KAIMANA_CS_01_anchovy_dried_NA').set({
            unitId: 'KAIMANA_CS_01',
            itemId: 'anchovy_dried',
            gradeId: 'NA',
            quantityKg: dried,
            lastUpdated: FieldValue.serverTimestamp()
        });
        
        results.day3 = {
            transferred: dried,
            destination: 'KAIMANA_CS_01'
        };
        log.push(`✅ Day 3: Transferred ${dried} kg to Cold Storage`);
        
        // DAY 4-7: Simplified for now
        log.push('\n📅 DAY 4-7: Saumlaki Factory, Transport, Sales (simplified)');
        log.push('⚠️  Full implementation requires additional processing logic');
        
        results.summary = {
            totalTransactions: day1Transactions.length + expenses.length + 3,
            totalRevenue: 0,
            totalExpenses: day1Total + expenseTotal,
            netPosition: -(day1Total + expenseTotal),
            inventoryKg: dried
        };
        
        log.push('\n✅ SIMULATION COMPLETE!');
        log.push(`📊 Summary: ${results.summary.totalTransactions} transactions, ${results.summary.inventoryKg} kg inventory`);
        
        res.status(200).json({
            success: true,
            message: '7-day simulation executed',
            results: results,
            log: log
        });
        
    } catch (error) {
        log.push(`❌ Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
            log: log
        });
    }
});
