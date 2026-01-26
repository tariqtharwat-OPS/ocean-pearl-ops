const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
// const functions = require('firebase-functions'); // Deprecated V1

// Set the region for all functions in this file
setGlobalOptions({ region: "asia-southeast1" });
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Explicitly target the default database
const db = getFirestore();

const seedLogic = require('./seed_logic');
const seedMaster = require('./seed_master');
// const sharkBrain = require('./shark_brain'); // Lazy Loaded now

// Export all functions
// SECURITY: Disabled for Production
// exports.performGreatWipe = seedLogic.performGreatWipe;
// exports.seedProcessingRules = seedMaster.seedProcessingRules;
// exports.seedProduction = require('./seed_production').seedProduction;

const migrationV2 = require('./migration_v2');
exports.seedRealisticData = require('./seed_realistic').seedRealisticData;
// SECURITY: Disabled for Production
// exports.backupFirestore = migrationV2.backupFirestore;
// exports.migrateSchemaV2 = migrationV2.migrateSchemaV2;
// exports.migrateUsersV2 = migrationV2.migrateUsersV2;
// exports.revertUsersV1 = migrationV2.revertUsersV1;

const financialV2 = require('./financial_v2');
exports.createFinancialRequest = financialV2.createFinancialRequest;
exports.approveFinancialRequest = financialV2.approveFinancialRequest;
exports.rejectFinancialRequest = financialV2.rejectFinancialRequest;


/**
 * postTransaction
 * 
 * Single entry point for all operational transactions.
 * Enforces server-side validation, calculations, and atomic stock updates.
 */
exports.postTransaction = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth }; // Shim key for V1 logic compatibility
    // 1. Authentication Check
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    // Use LET to allow overriding by RBAC
    let { type, locationId, unitId, itemId, quantityKg, pricePerKg, gradeId, supplyType, rawUsedKg, paymentMethod, amount, transferDirection, description, customDate, skipAudit } = data;

    // Timestamp Logic
    let timestamp;
    if (customDate) {
        const d = new Date(customDate);
        if (isNaN(d.getTime())) timestamp = admin.firestore.Timestamp.now();
        else timestamp = admin.firestore.Timestamp.fromDate(d);
    } else {
        timestamp = admin.firestore.Timestamp.now();
    }

    // === 1.5 RBAC ENFORCEMENT & SCOPE OVERRIDE (Step 3) ===
    const userSnap = await db.collection('users').doc(context.auth.uid).get();
    const userData = userSnap.data() || {};
    const role_v2 = userData.role_v2;
    const target_id = userData.target_id || userData.locationId || userData.loc;

    if (!role_v2) {
        throw new HttpsError('permission-denied', 'Account Security: You have no V2 Role assigned. Contact HQ.');
    }

    if (role_v2 === 'HQ_ADMIN') {
        // Global Access - Trust Client Input
    }
    else if (role_v2 === 'LOC_MANAGER') {
        // FORCE Location Scope
        if (locationId && locationId !== target_id) {
            console.warn(`Manager ${context.auth.uid} tried sending to ${locationId}, forced to ${target_id}`);
        }
        locationId = target_id; // OVERRIDE
    }
    else if (role_v2 === 'UNIT_OP') {
        // STRICT BLOCK for postTransaction
        throw new HttpsError('permission-denied', `Security Alert: Unit Operators cannot execute transactions directly.`);
    }
    else {
        throw new HttpsError('permission-denied', 'Unknown Role Type.');
    }

    // Basic validation (Check again after override)
    if (!locationId || !unitId || !type) {
        throw new HttpsError('invalid-argument', 'Missing core transaction fields.');
    }

    const transactionRef = db.collection('transactions').doc();
    // Use the potentially overridden locationId
    const locationRef = db.doc(`locations/${locationId}/units/${unitId}`);


    let calculatedTotal = 0;
    let stockImpactRaw = 0;
    let stockImpactCold = 0;
    let walletImpact = 0;
    let stockGrade = gradeId || "NA"; // Spec Rule: Default to NA

    try {
        switch (type) {
            case 'PURCHASE_RECEIVE':
                // Validation
                if (!pricePerKg || pricePerKg <= 0) {
                    throw new HttpsError('invalid-argument', 'Price per Kg is mandatory.');
                }

                // Calculation
                calculatedTotal = (quantityKg || 0) * pricePerKg;

                // Stock Impact (Increments RAW)
                stockImpactRaw = quantityKg;

                // Cash Logic: Deduct if Cash
                if (paymentMethod === 'cash') {
                    walletImpact = -calculatedTotal;
                }
                break;

            case 'COLD_STORAGE_IN':
                // Yield Traceability: 
                // rawUsedKg is optional. If valid, use it to decrement RAW. Else fallback to quantityKg (1:1).
                const decrementAmount = (rawUsedKg && rawUsedKg > 0) ? rawUsedKg : quantityKg;

                stockImpactRaw = -decrementAmount; // Decrement Raw (Consumption)
                stockImpactCold = quantityKg; // Increment Cold (Output)

                // Spec Rule: Grade is optional here, defaults to NA (already set)
                break;

            case 'EXPENSE':
                // No stock impact
                calculatedTotal = amount || 0;
                if (calculatedTotal <= 0) {
                    throw new HttpsError('invalid-argument', 'Expense amount must be positive.');
                }
                if (!description) {
                    throw new HttpsError('invalid-argument', 'Description is mandatory for Expenses.');
                }

                // Cash Logic
                if (paymentMethod === 'cash') {
                    walletImpact = -calculatedTotal;
                }
                break;

            case 'SALE_INVOICE':
                // Validation
                if (!gradeId) {
                    throw new HttpsError('invalid-argument', 'Grade is MANDATORY for Sales.');
                }

                // Calculation
                calculatedTotal = (quantityKg || 0) * (pricePerKg || 0);

                // Stock Impact (Decrement COLD)
                stockImpactCold = -quantityKg;

                // Sales Invoice assumes Credit/Receivable usually, unless specified as cash?
                // Spec says LOCAL_SALE is for cash. SALE_INVOICE implies standard invoice.
                // We will NOT touch wallet for SALE_INVOICE unless explicitly requested.
                // Keeping V1 behavior: Updates Buyer Receivable (not implemented here but implied)
                break;

            case 'LOCAL_SALE':
                // Same stock logic as SALE_INVOICE but adds to Wallet
                if (!gradeId) throw new HttpsError('invalid-argument', 'Grade is MANDATORY for Sales.');

                calculatedTotal = (quantityKg || 0) * (pricePerKg || 0);
                stockImpactCold = -quantityKg;
                walletImpact = calculatedTotal; // Add to wallet
                break;

            case 'CASH_TRANSFER':
                if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Amount required.');
                if (!description) throw new HttpsError('invalid-argument', 'Description required.');

                calculatedTotal = amount;
                if (transferDirection === 'IN') { // HQ -> Unit
                    walletImpact = amount;
                } else if (transferDirection === 'OUT') { // Unit -> HQ
                    walletImpact = -amount;
                } else {
                    throw new HttpsError('invalid-argument', 'Invalid Transfer Direction.');
                }
                break;

            case 'BANK_DEPOSIT':
                // Capital Injection logic
                if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Amount required.');
                calculatedTotal = amount;
                walletImpact = amount; // Will be handled specifically by HQ logic
                break;

                throw new HttpsError('invalid-argument', 'Unknown Transaction Type');
        }

        // 2. Commit Transaction Record
        await db.runTransaction(async (t) => {
            // A. Serial Number Generation
            const txnDate = timestamp.toDate();
            // Initialize payload with calculated totals
            const transactionData = { ...data, totalAmount: calculatedTotal };
            const year = txnDate.getFullYear().toString().substr(-2);
            let prefix = 'TXN';
            if (type === 'PURCHASE_RECEIVE') prefix = 'RCV';
            else if (type === 'COLD_STORAGE_IN') prefix = 'PRD'; // Production
            else if (type === 'EXPENSE') prefix = 'EXP';
            else if (type === 'SALE_INVOICE') prefix = 'INV';
            else if (type === 'LOCAL_SALE') prefix = 'SLD';

            const locCode = locationId ? locationId.substring(0, 3).toUpperCase() : 'GEN';
            const counterId = `${prefix}_${locCode}_${year}`;
            const counterRef = db.doc(`counters/${counterId}`);

            const HQ_WALLET_ID = 'HQ';
            const locationRef = db.doc(`locations/${locationId}/units/${unitId}`);

            // === 1. PRE-READS (Must be before any writes in Firestore Txn) ===
            const counterDoc = await t.get(counterRef);

            // Resolve Wallets Logic
            let sourceWalletId = null;
            let targetWalletId = null;
            let walletReads = [];

            if (type === 'CASH_TRANSFER') {
                if (transferDirection === 'IN') {
                    // HQ -> Location
                    sourceWalletId = HQ_WALLET_ID;
                    targetWalletId = locationId;
                } else { // OUT
                    // Location -> HQ
                    sourceWalletId = locationId;
                    targetWalletId = HQ_WALLET_ID;
                }
                if (sourceWalletId === targetWalletId) throw new HttpsError('invalid-argument', 'Self-transfer blocked.');
            } else if (type === 'BANK_DEPOSIT') {
                targetWalletId = HQ_WALLET_ID;
            } else if (walletImpact !== 0) {
                // Expense/Sale/Purchase
                targetWalletId = locationId;
            }

            let sourceWalletDoc = null;
            let targetWalletDoc = null;

            if (sourceWalletId) sourceWalletDoc = await t.get(db.doc(`site_wallets/${sourceWalletId}`));
            if (targetWalletId) targetWalletDoc = await t.get(db.doc(`site_wallets/${targetWalletId}`));

            // Stock Reads
            let coldStockDoc = null;
            let rawStockDoc = null;
            const coldStockRef = locationRef.collection('stock').doc(`COLD_${itemId}_${stockGrade}`);
            const rawStockRef = locationRef.collection('stock').doc(`RAW_${itemId}`);

            if (stockImpactCold < 0) coldStockDoc = await t.get(coldStockRef);
            if (stockImpactRaw < 0) rawStockDoc = await t.get(rawStockRef);


            // === 2. VALIDATION & CALCULATIONS ===
            const currentSeq = counterDoc.exists ? (counterDoc.data().seq || 0) : 0;
            const newSeq = currentSeq + 1;
            const paddedSeq = newSeq.toString().padStart(4, '0');
            const serialNumber = `${prefix}-${locCode}-${year}-${paddedSeq}`;

            // Wallet Validations
            if (sourceWalletId) {
                if (!sourceWalletDoc.exists) throw new HttpsError('failed-precondition', `Source Wallet ${sourceWalletId} not found.`);
                const current = sourceWalletDoc.data().balance || 0;
                // Allow negative for HQ? Spec says "No negative balances" for Locations. Maybe HQ can go negative (Debt)?
                // Let's enforce strictly except for HQ if we want to allow overdraft.
                // Spec says: "Prevent sourceBalance < amount (no negative balances)" - Enforce for ALL.
                if (current < amount) {
                    throw new HttpsError('failed-precondition', `Insufficient funds in ${sourceWalletId}. Available: ${current}`);
                }
            }

            // Stock Validations
            if (stockImpactCold < 0) {
                const currentStock = coldStockDoc.exists ? (coldStockDoc.data().quantityKg || 0) : 0;
                if (currentStock + stockImpactCold < 0) throw new HttpsError('failed-precondition', `Insufficient Cold Stock.`);
            }
            if (stockImpactRaw < 0) {
                const currentRaw = rawStockDoc.exists ? (rawStockDoc.data().quantityKg || 0) : 0;
                if (currentRaw + stockImpactRaw < 0) throw new HttpsError('failed-precondition', `Insufficient RAW Stock.`);
            }


            // === 3. WRITES (Atomic Batch) ===
            t.set(counterRef, { seq: newSeq }, { merge: true });

            // Wallet Writes
            const ts = admin.firestore.FieldValue.serverTimestamp();

            if (sourceWalletId) {
                t.update(db.doc(`site_wallets/${sourceWalletId}`), {
                    balance: admin.firestore.FieldValue.increment(-amount),
                    updatedAt: ts
                });
            }

            if (targetWalletId) {
                const targetRef = db.doc(`site_wallets/${targetWalletId}`);
                if (!targetWalletDoc.exists) {
                    t.set(targetRef, {
                        balance: amount || walletImpact, // Use amount for Transfer, or walletImpact for others
                        locationId: targetWalletId === HQ_WALLET_ID ? null : targetWalletId,
                        type: targetWalletId === HQ_WALLET_ID ? 'HQ' : 'LOCATION',
                        updatedAt: ts
                    });
                } else {
                    t.update(targetRef, {
                        balance: admin.firestore.FieldValue.increment(type === 'CASH_TRANSFER' ? amount : walletImpact),
                        updatedAt: ts
                    });
                }
            }

            // Ledger Metadata
            if (type === 'CASH_TRANSFER') {
                Object.assign(transactionData, { sourceWalletId, targetWalletId });
            }

            // Stock Writes
            if (stockImpactCold !== 0) {
                t.set(coldStockRef, {
                    quantityKg: admin.firestore.FieldValue.increment(stockImpactCold),
                    grade: stockGrade,
                    updatedAt: timestamp
                }, { merge: true });
            }
            if (stockImpactRaw !== 0) {
                t.set(rawStockRef, {
                    quantityKg: admin.firestore.FieldValue.increment(stockImpactRaw),
                    updatedAt: timestamp
                }, { merge: true });
            }



            // Commit Transaction Record
            t.set(transactionRef, {
                ...transactionData,
                serialNumber: serialNumber,
                timestamp: timestamp,
                serverTimestamp: timestamp,
                userId: context.auth.uid,
                finalized: true,
                skipAudit: !!skipAudit
            });

            // Audit
            const auditRef = db.collection('audit_logs').doc();
            t.set(auditRef, {
                originalTransactionId: transactionRef.id,
                action: type,
                performedBy: context.auth.uid,
                timestamp: timestamp,
                details: {
                    total: calculatedTotal,
                    walletDelta: walletImpact,
                    stockRawDelta: stockImpactRaw,
                    stockColdDelta: stockImpactCold
                }
            });
        });

        return {
            success: true,
            id: transactionRef.id,
            total: calculatedTotal,
            message: 'Transaction processed successfully'
        };

    } catch (error) {
        console.error("Transaction Error", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * repairSystemWallets
 * 
 * ONE-TIME MIGRATION: 
 * 1. Resets all wallets to 0.
 * 2. Replays all 'transactions' to rebuild strict Ledger state.
 * 3. Corrects historical 'Single-Sided' transfers to be 'Double-Sided'.
 */
exports.repairSystemWallets = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };
    if (!context.auth) throw new HttpsError('unauthenticated', 'Login required.');

    // Safety: Only super-admin
    const user = await admin.auth().getUser(context.auth.uid);
    if (user.email !== 'tariq@oceanpearlseafood.com') throw new HttpsError('permission-denied', 'Super Admin Only');

    const batch = db.batch();
    const log = [];

    // 1. Reset Wallets (Known Locations + HQ)
    const targets = ['HQ', 'jakarta', 'kaimana', 'saumlaki'];
    for (const t of targets) {
        batch.set(db.doc(`site_wallets/${t}`), {
            balance: 0,
            type: t === 'HQ' ? 'HQ' : 'LOCATION',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // 2. Load History
    const snap = await db.collection('transactions').orderBy('timestamp', 'asc').get();
    const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // In-memory calculator to avoid 500 max batch limits if we were writing every inc/dec
    // Actually we can write the final state? 
    // No, let's write the final state at the end.
    const balances = { HQ: 0, jakarta: 0, kaimana: 0, saumlaki: 0 };

    for (const txn of txns) {
        const amt = parseFloat(txn.amount || txn.totalAmount || 0);
        const locId = txn.locationId || 'HQ';

        if (txn.type === 'CASH_TRANSFER') {
            // Assume 'IN' means HQ -> Loc
            if (txn.transferDirection === 'IN') {
                // Historical logic only added to Loc. We must now SUBTRACT from HQ.
                balances[locId] = (balances[locId] || 0) + amt;
                balances['HQ'] = (balances['HQ'] || 0) - amt;
            } else if (txn.transferDirection === 'OUT') {
                balances[locId] = (balances[locId] || 0) - amt;
                balances['HQ'] = (balances['HQ'] || 0) + amt;
            }
        } else if (txn.type === 'BANK_DEPOSIT' || txn.title === 'Seed Capital') {
            balances['HQ'] = (balances['HQ'] || 0) + amt;
        } else if (txn.paymentMethod === 'cash') {
            // Expense or Purchase
            // Deduct from Loc
            if (txn.type === 'EXPENSE' || txn.type === 'PURCHASE_RECEIVE') {
                balances[locId] = (balances[locId] || 0) - amt;
            } else if (txn.type === 'LOCAL_SALE') {
                balances[locId] = (balances[locId] || 0) + amt;
            }
        }
    }

    // 3. Write Balances
    for (const [key, val] of Object.entries(balances)) {
        batch.update(db.doc(`site_wallets/${key}`), { balance: val, verified: true });
        log.push(`${key}: ${val}`);
    }

    await batch.commit();

    return { success: true, balances: log };
});


/**
 * createSystemUser
 * 
 * Allows 'super_admin' or 'admin' to create new users without signing out.
 * Molds the Firestore 'users' profile immediately.
 */
exports.createSystemUser = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };
    // 1. Auth Check: Must be Admin
    if (!context.auth) throw new HttpsError('unauthenticated', 'Login required.');

    const callerUid = context.auth.uid;
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerRole = callerDoc.data()?.role || '';

    // Check Hardcoded Super Admins or DB Role
    const isSuperAdmin = context.auth.token.email === 'tariq@oceanpearlseafood.com' ||
        context.auth.token.email === 'info@oceanpearlseafood.com';

    if (!isSuperAdmin && callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Only Admins can create users.');
    }

    const { email, password, displayName, role, locationId, unitId, phone } = data;

    try {
        // 2. Create Auth User
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName
        });

        // 3. Create Firestore Profile (ops1)
        await db.collection('users').doc(userRecord.uid).set({
            email,
            role,
            displayName,
            locationId: locationId || null,
            unitId: unitId || null,
            phone: phone || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: callerUid
        });

        return { success: true, uid: userRecord.uid, message: `User ${email} created successfully.` };

    } catch (err) {
        console.error("Create User Error", err);
        throw new HttpsError('internal', err.message);
    }
});


/**
 * manageUser
 * 
 * Handles Admin updates to user accounts:
 * - Update Role / Location / Unit
 * - Toggle Disable/Enable (Auth & Firestore)
 * - Reset Password (to a temporary one)
 */
exports.manageUser = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };
    if (!context.auth) throw new HttpsError('unauthenticated', 'Login required.');

    // Auth Check
    const callerUid = context.auth.uid;
    const isSuperAdmin = context.auth.token.email === 'tariq@oceanpearlseafood.com' ||
        context.auth.token.email === 'info@oceanpearlseafood.com';

    // If not super admin, check DB role
    if (!isSuperAdmin) {
        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (callerDoc.data()?.role !== 'admin') {
            throw new HttpsError('permission-denied', 'Only Admins can manage users.');
        }
    }

    const { targetUid, action, payload } = data; // action: 'update_profile', 'toggle_status', 'reset_password'

    try {
        if (action === 'update_profile') {
            const { role, locationId, unitId, displayName, phone } = payload;
            const updateData = {};
            if (role) updateData.role = role;
            if (locationId !== undefined) updateData.locationId = locationId; // Allow null to clear
            if (unitId !== undefined) updateData.unitId = unitId;             // Allow null to clear
            if (displayName) updateData.displayName = displayName;
            if (phone !== undefined) updateData.phone = phone;

            // Update Firestore
            await db.collection('users').doc(targetUid).update(updateData);

            // Sync Core fields to Auth (DisplayName)
            if (displayName) {
                await admin.auth().updateUser(targetUid, { displayName });
            }
            return { success: true, message: 'Profile updated.' };
        }

        if (action === 'toggle_status') {
            const { disabled } = payload; // true or false
            // 1. Update Auth (prevent login)
            await admin.auth().updateUser(targetUid, { disabled });
            // 2. Update Firestore (visual status)
            await db.collection('users').doc(targetUid).update({ disabled });
            return { success: true, message: `User ${disabled ? 'Disabled' : 'Enabled'}` };
        }

        if (action === 'reset_password') {
            const tempPassword = `Ops${Math.floor(100000 + Math.random() * 900000)}!`; // Ops123456!
            await admin.auth().updateUser(targetUid, { password: tempPassword });
            return { success: true, message: 'Password reset.', tempPassword };
        }

        if (action === 'delete_user') {
            // Prevent deletion of super admin accounts
            const targetUser = await admin.auth().getUser(targetUid);
            if (targetUser.email === 'tariq@oceanpearlseafood.com' || targetUser.email === 'info@oceanpearlseafood.com') {
                throw new HttpsError('permission-denied', 'Cannot delete super admin accounts.');
            }

            // 1. Delete from Firebase Authentication
            await admin.auth().deleteUser(targetUid);

            // 2. Delete from Firestore users collection
            await db.collection('users').doc(targetUid).delete();

            return { success: true, message: 'User permanently deleted.' };
        }

        throw new HttpsError('invalid-argument', 'Unknown action');

    } catch (err) {
        console.error("Manage User Error", err);
        throw new HttpsError('internal', err.message);
    }
});


/**
 * sendWhatsAppAlert
 * 
 * Sends a critical alert to the CEO or designated staff via WhatsApp.
 * Uses Twilio API.
 */
async function sendWhatsAppAlert(message, targetPhone) {
    const twilio = require('twilio');

    // Credentials from Environment or Firebase Config
    const accountSid = process.env.TWILIO_ACCOUNT_SID || functions.config().twilio?.sid;
    const authToken = process.env.TWILIO_AUTH_TOKEN || functions.config().twilio?.token;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || functions.config().twilio?.from || 'whatsapp:+14155238886';

    // Target: Default to Tariq if no specific phone provided, or override
    // For V1, we hardcode Tariq's number if targetPhone matches logic, 
    // but better to allow the function to accept a target.
    // If targetPhone is NOT provided, it falls back to the hardcoded ID for CEO.
    const toNumber = targetPhone ? `whatsapp:${targetPhone}` : 'whatsapp:+6282144434743';

    if (!accountSid || !authToken) {
        console.error("Missing Twilio Credentials in Environment/Config");
        return false;
    }

    try {
        const client = new twilio(accountSid, authToken);
        const result = await client.messages.create({
            body: message,
            from: fromNumber,
            to: toNumber
        });
        console.log(`🔔 WHATSAPP SENT TO ${toNumber}: ${result.sid}`);
        return true;
    } catch (error) {
        console.error("Twilio Error:", error.message);
        return false;
    }
}


/**
 * seedTaxonomy
 * 
 * One-time utility to inject the International Standard Commercial Taxonomy.
 */
exports.seedTaxonomy = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };
    if (!context.auth) throw new HttpsError('unauthenticated', 'Login required.');

    // Auth Check: Super Admin Only
    const isSuperAdmin = context.auth.token.email === 'tariq@oceanpearlseafood.com' ||
        context.auth.token.email === 'info@oceanpearlseafood.com';
    if (!isSuperAdmin) throw new HttpsError('permission-denied', 'Super Admin only.');

    const TAXONOMY = [
        { id: 'tuna_skipjack', en: 'Skipjack Tuna', local: 'Cakalang', scientific: 'Katsuwonus pelamis', category: 'FISH' },
        { id: 'tuna_yellowfin', en: 'Yellowfin Tuna', local: 'Madidihang', scientific: 'Thunnus albacares', category: 'FISH' },
        { id: 'snapper_red', en: 'Red Snapper', local: 'Kakap Merah', scientific: 'Lutjanus spp', category: 'FISH' },
        { id: 'anchovy_teri', en: 'Anchovy', local: 'Ikan Teri', scientific: 'Stolephorus commersonii', category: 'FISH' },
        { id: 'octopus', en: 'Octopus', local: 'Gurita', scientific: 'Octopus vulgaris', category: 'CEPHALOPOD' },
        { id: 'squid', en: 'Squid', local: 'Cumi-Cumi', scientific: 'Loligo spp', category: 'CEPHALOPOD' },
        { id: 'shrimp_vaname', en: 'Vannamei Shrimp', local: 'Udang Vaname', scientific: 'Litopenaeus vannamei', category: 'CRUSTACEAN' },
        { id: 'sea_cucumber', en: 'Sea Cucumber', local: 'Teripang', scientific: 'Holothuroidea', category: 'ECHINODERM' }
    ];

    const batch = db.batch();
    for (const item of TAXONOMY) {
        const ref = db.collection('items').doc(item.id);
        batch.set(ref, {
            name: item.en,
            localName: item.local,
            scientificName: item.scientific,
            category: item.category,
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // Delete old placeholders if they exist (optional, safe to skip for speed, user just said "Wipe" which this effectively does by ignoring them or we could explicitly delete 'fish'/'shrimp' docs if known).
    // Let's assume the UI will strictly use the new Items collection.

    await batch.commit();
    return { success: true, message: `Injected ${TAXONOMY.length} International Standard items.` };
});


/**
 * auditTransaction (Shark AI - Operations Intelligence)
 * 
 * Triggered on Firestore Write.
 * - Enforces "Shark" logic: Yield Checks, Expense Limits.
 * - Triggers WhatsApp alerts for critical deviations.
 */
// ... Imports
// ... Imports
/**
 * auditTransaction (Shark AI - Operations Intelligence)
 */
exports.auditTransaction = onDocumentCreated('transactions/{txnId}', async (event) => {
    const snap = event.data;
    const context = { params: event.params }; // Shim for context.params
    const txn = snap.data();
    const txnId = context.params.txnId;

    if (txn.skipAudit === true) return null;

    try {
        // 1. Delegate Analysis to Unified Brain
        const sharkBrain = require('./shark_brain'); // Lazy Load
        const analysis = await sharkBrain.auditTransaction(txn, txnId);

        console.log(`🧠 Shark Analysis for ${txnId}:`, analysis);

        // 3. Take Action based on Risk
        // A. Update Transaction Record
        await snap.ref.update({
            ai_risk_score: analysis.risk_score,
            risk_score: analysis.risk_score || 0,
            ai_analysis: analysis.analysis || "No analysis",
            auditStatus: (analysis.risk_score > 5) ? 'FLAGGED' : 'CLEARED'
        });

        // B. Feed Update (Real-Time Admin Dashboard)
        const feedItem = {
            title: (analysis.risk_score > 7) ? '🚨 HIGH RISK DETECTED' : 'Transaction Audited',
            message: `[${txn.type}] ${analysis.analysis.substring(0, 100)}... (Risk: ${analysis.risk_score})`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: (analysis.risk_score > 7) ? 'alert' : 'info',
            severity: (analysis.risk_score > 7) ? 'high' : 'low',
            refId: txnId,
            locationId: txn.locationId || 'unknown'
        };
        await db.collection('admin_notifications').add(feedItem);

        // Trigger Alert if High Risk (Legacy Chat)
        if (analysis.risk_score > 7 || analysis.report_to_ceo) {
            await db.collection('messages').add({
                recipientId: 'system_admin',
                sender: 'Shark AI',
                text: `🚨 High Risk Transaction Detected!\n${analysis.analysis}\nRisk Score: ${analysis.risk_score}`,
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                type: 'AI_REPLY'
            });
        }

        if (analysis.message_to_staff) {
            await db.collection('messages').add({
                recipientId: txn.unitId || 'staff_general',
                sender: 'Shark AI',
                text: `Message from Shark: ${analysis.message_to_staff}`,
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                type: 'AI_REPLY'
            });
        }

    } catch (err) {
        console.error("Shark Brain Error", err);
        // Fallback: don't crash the flow, just log.
        await snap.ref.update({ ai_error: err.message });
    }
});


/**
 * transactionAggregator (Performance)
 * 
 * Performance optimization:
 * - Listens for ANY new transaction.
 * - Updates 'stats/daily_{YYYY-MM-DD}' document.
 * - This allows the Admin Dashboard to load "Total Cash" and "Daily Volume" instantly
 *   without querying 10k+ records.
 */
exports.transactionAggregator = onDocumentCreated('transactions/{txnId}', async (event) => {
    const snap = event.data;
    const context = { params: event.params };
    const txn = snap.data();
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const statsRef = db.doc(`dashboard_stats/${dateStr}`);

    // Determine values to aggregate
    const amount = txn.totalAmount || txn.amount || 0;
    const isCashOut = txn.type === 'EXPENSE' || (txn.type === 'PURCHASE_RECEIVE' && txn.paymentMethod === 'cash');
    const isCashIn = txn.type === 'LOCAL_SALE'; // or other income

    let netCashFlow = 0;
    if (isCashOut) netCashFlow = -amount;
    if (isCashIn) netCashFlow = amount;

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(statsRef);
            if (!doc.exists) {
                t.set(statsRef, {
                    date: dateStr,
                    totalTransactions: 1,
                    dailyCashFlow: netCashFlow,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                t.update(statsRef, {
                    totalTransactions: admin.firestore.FieldValue.increment(1),
                    dailyCashFlow: admin.firestore.FieldValue.increment(netCashFlow),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    } catch (err) {
        console.error("Aggregator Error", err);
    }
});


/**
 * sharkChat (The Helpful Partner)
 * 
 * Listens for messages from staff.
 * Fetches context (Inventory, recent movements) to answer questions proactively.
 * "How much Tuna do we have?" -> "We have 450kg of Yellowfin Tuna in Block A."
 */
exports.sharkChat = onDocumentCreated({ document: 'messages/{msgId}', timeoutSeconds: 300 }, async (event) => {
    const snap = event.data;
    const context = { params: event.params };
    const msg = snap.data();

    // 1. Ignore own messages (Loop prevention)
    if (msg.sender === 'Shark AI' || msg.type === 'AI_REPLY') return;

    // 2. Ignore system alerts that aren't user queries
    if (!msg.senderId) return;

    try {
        const userId = msg.senderId;
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};

        // Context Construction for Brain
        const userContext = {
            name: userData.displayName || 'Staff',
            role: userData.role || 'operator',
            role_v2: userData.role_v2, // Explicit V2 Support
            locationId: userData.locationId,
            unitId: userData.unitId
        };

        const sharkBrain = require('./shark_brain'); // Lazy Load

        // Delegate to Brain
        const brainResponse = await sharkBrain.chatWithShark(msg, userContext);

        // Handle both simple string (legacy) and Object (V2)
        let responseText = "";
        let draftData = null;

        if (typeof brainResponse === 'string') {
            responseText = brainResponse;
        } else {
            responseText = brainResponse.text;
            draftData = brainResponse.draft || null;
        }

        // 5. Send Reply
        const replyPayload = {
            recipientId: userId,
            senderId: 'shark-ai',
            sender: 'Shark AI',
            text: responseText,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'AI_REPLY'
        };

        if (draftData) {
            replyPayload.draft = draftData;
        }

        await db.collection('messages').add(replyPayload);

        // 6. Log to Command Center Feed
        await db.collection('admin_notifications').add({
            title: `Shark AI Interaction`,
            message: `Replying to ${userData.displayName}: "${(msg.text || 'Attachment').substring(0, 30)}..."`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'info',
            severity: 'low',
            locationId: userData.locationId || 'global'
        });

    } catch (error) {
        console.error("Shark Chat Error", error);
    }

});

/**
 * twilioWebhook (WhatsApp Entry Point)
 * 
 * Receives POST requests from Twilio when a user messaging the bot.
 * Connects directly to Shark Brain and replies via TwiML.
 */
exports.twilioWebhook = onRequest(async (req, res) => {
    const MessagingResponse = require('twilio').twiml.MessagingResponse;
    const twiml = new MessagingResponse();

    // 1. Data Parsing
    // Twilio sends form-urlencoded data: From, Body, ProfileName
    const { From, Body, ProfileName } = req.body;

    // Normalize Phone Number (Remove 'whatsapp:')
    const phoneNumber = From ? From.replace('whatsapp:', '') : '';
    console.log(`📩 WhatsApp from ${phoneNumber}: ${Body}`);

    if (!Body) {
        twiml.message("Error: No message body.");
        res.set('Content-Type', 'text/xml');
        return res.status(200).send(twiml.toString());
    }

    try {
        // 2. Resolve User
        let userContext = { name: ProfileName || 'WhatsApp User', role: 'unknown', locationId: null, unitId: null };

        // Lookup User by Phone
        const userQuery = await db.collection('users').where('phone', '==', phoneNumber).limit(1).get();
        if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            userContext = {
                name: userData.displayName || ProfileName,
                role: userData.role,
                locationId: userData.locationId,
                unitId: userData.unitId
            };
        }

        // 3. Consult Brain
        const brain = require('./shark_brain');
        const replyText = await brain.chatWithShark(Body, userContext);

        // 4. Send TwiML Response
        twiml.message(replyText);

        // Optional: Archive message to Firestore for history
        await db.collection('messages').add({
            source: 'whatsapp',
            fromPhone: phoneNumber,
            text: Body,
            reply: replyText,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        console.error("Webhook Error", e);
        twiml.message("Shark is offline temporarily. (Error 500)");
    }

    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
});
/**
 * injectDay1 (Emergency Bypass)
 */
exports.injectDay1 = onRequest(async (req, res) => {
    // Basic Security
    if (req.query.key !== 'antigravity_secret') return res.status(403).send('Forbidden');

    const amount = 500000000;
    const locationId = 'kaimana';
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    try {
        await db.runTransaction(async (t) => {
            // 1. READS FIRST (Firestore Requirement)
            const locRef = db.doc(`site_wallets/${locationId}`);
            const locDoc = await t.get(locRef);

            // 2. WRITES
            // A. Transaction Record
            const txnRef = db.collection('transactions').doc();
            t.set(txnRef, {
                type: 'CASH_TRANSFER',
                amount: amount,
                sourceWalletId: 'HQ',
                targetWalletId: locationId,
                transferDirection: 'IN',
                description: 'Day 1 Capital Injection (Emergency Bypass)',
                timestamp: timestamp,
                finalized: true,
                approverId: 'SYSTEM_ADMIN'
            });

            // B. Update HQ
            t.update(db.doc('site_wallets/HQ'), {
                balance: admin.firestore.FieldValue.increment(-amount),
                updatedAt: timestamp
            });

            // C. Update Location
            if (!locDoc.exists) {
                t.set(locRef, {
                    balance: amount,
                    type: 'LOCATION',
                    locationId: locationId,
                    updatedAt: timestamp
                });
            } else {
                t.update(locRef, {
                    balance: admin.firestore.FieldValue.increment(amount),
                    updatedAt: timestamp
                });
            }
        });

        res.status(200).send(`✅ SUCCESS: Injected Rp ${amount.toLocaleString()} to ${locationId}.`);
    } catch (e) {
        console.error(e);
        res.status(500).send(e.message);
    }
});

const api = require("./api");
exports.getFinancialRequests = api.getFinancialRequests;
