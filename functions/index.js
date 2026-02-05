/**
 * Ocean Pearl Ops V2 - Cloud Functions Entry Point
 * 
 * Standardized for professional structure and blueprint compliance.
 * All mutations (ledger, stock, wallet) ARE FORCED THROUGH HERE.
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

// Set the region for all functions
setGlobalOptions({ region: "asia-southeast1" });

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = getFirestore();

// -- MODULES --
const financialV2 = require('./financial_v2');
const { handleTransactionInternal } = require('./transaction_engine');
const { auditTransaction, chatWithShark } = require('./shark_brain');

// -- AI & CHAT --

/**
 * callShark
 * 
 * Direct interface to Shark AI for chat and report analysis.
 */
exports.callShark = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

    // Construct user context
    const userContext = {
        name: request.auth.token.name || request.auth.token.email.split('@')[0],
        role: request.auth.token.role_v2 || 'viewer',
        locationId: request.auth.token.locationId,
        unitId: request.auth.token.unitId,
        language: 'id' // Default to ID for now, or pass from frontend
    };

    return await chatWithShark(request.data.message, userContext);
});

// -- BACKGROUND TRIGGERS --

/**
 * onTransactionCreated
 * 
 * Automatically audits every transaction using Shark Brain.
 * Results are posted to system_feed for real-time visibility in Command Center.
 */
exports.onTransactionCreated = onDocumentCreated("transactions/{txnId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    const txn = snapshot.data();
    const txnId = event.params.txnId;

    if (txn.skipAudit) return null;

    try {
        const audit = await auditTransaction(txn, txnId);

        // Write to system_feed
        await db.collection('system_feed').doc(txnId).set({
            txnId,
            type: txn.type,
            locationId: txn.locationId,
            unitId: txn.unitId,
            risk_score: audit.risk_score || 0,
            analysis: audit.analysis || "Standard transaction processed.",
            message: audit.message_to_staff || `New ${txn.type} at ${txn.locationId}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            totalAmount: txn.totalAmount || 0,
            report_to_ceo: audit.report_to_ceo || ""
        });

        // Also update transaction with audit results
        await snapshot.ref.update({
            audit_score: audit.risk_score,
            audit_at: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (err) {
        console.error("Audit Background Error", err);
    }
});

// -- FINANCE & APPROVALS --
exports.createFinancialRequest = financialV2.createFinancialRequest;
exports.approveFinancialRequest = financialV2.approveFinancialRequest;
exports.rejectFinancialRequest = financialV2.rejectFinancialRequest;

// -- CORE TRANSACTION ENGINE --
/**
 * postTransaction
 * 
 * Single entry point for all operational transactions.
 * Enforces server-side validation, calculations, and atomic stock updates.
 */
exports.postTransaction = onCall(async (request) => {
    return await handleTransactionInternal(request.data, request.auth);
});

// -- USER MANAGEMENT (Administrative) --

/**
 * createSystemUser
 * 
 * Allows HQ_ADMIN to create new users without signing out.
 * Maps legacy roles to V2 roles (role_v2).
 */
exports.createSystemUser = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };
    if (!context.auth) throw new HttpsError('unauthenticated', 'Login required.');

    const callerUid = context.auth.uid;
    const isSuperAdmin = context.auth.token.email === 'tariq@oceanpearlseafood.com' ||
        context.auth.token.email === 'info@oceanpearlseafood.com';

    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerData = callerDoc.data() || {};

    const hasAdminPermission = isSuperAdmin ||
        callerData.role === 'admin' ||
        callerData.role === 'ceo' ||
        callerData.role_v2 === 'HQ_ADMIN';

    if (!hasAdminPermission) {
        throw new HttpsError('permission-denied', 'Only Admins can create users.');
    }

    const { email, password, displayName, role, role_v2, locationId, unitId, phone } = data;

    try {
        // Step 1: Create in Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: true
        });

        // Mapping Logic
        const targetRole = role || role_v2 || 'READ_ONLY';
        const finalRoleV2 = role_v2 || (
            (targetRole === 'ceo' || targetRole === 'admin' || targetRole === 'HQ_ADMIN') ? 'HQ_ADMIN' :
                (targetRole === 'manager' || targetRole === 'location_admin' || targetRole === 'loc_manager' || targetRole === 'LOC_MANAGER') ? 'LOC_MANAGER' :
                    (targetRole === 'investor' || targetRole === 'INVESTOR') ? 'INVESTOR' :
                        (targetRole === 'operator' || targetRole === 'site_user' || targetRole === 'unit_admin' || targetRole === 'unit_op' || targetRole === 'UNIT_OP') ? 'UNIT_OP' :
                            'READ_ONLY'
        );

        // Step 2: Set Custom Claims (CRITICAL - was missing!)
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: targetRole,
            role_v2: finalRoleV2,
            locationId: locationId || null,
            unitId: unitId || null
        });

        // Step 3: Write to Firestore
        await db.collection('users').doc(userRecord.uid).set({
            email,
            role: targetRole,
            role_v2: finalRoleV2,
            displayName,
            locationId: locationId || null,
            unitId: unitId || null,
            phone: phone || null,
            status: 'enabled',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: callerUid
        });

        console.log(`✅ User created: ${email} (${finalRoleV2}) - UID: ${userRecord.uid}`);

        return { success: true, uid: userRecord.uid, message: `User ${email} created successfully.` };

    } catch (err) {
        console.error("❌ Create User Error:", err);
        throw new HttpsError('internal', `Failed to create user: ${err.message}`);
    }
});

/**
 * manageUser
 * 
 * Handles Admin updates to user accounts.
 */
exports.manageUser = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };
    if (!context.auth) throw new HttpsError('unauthenticated', 'Login required.');

    const callerUid = context.auth.uid;
    const isSuperAdmin = context.auth.token.email === 'tariq@oceanpearlseafood.com' ||
        context.auth.token.email === 'info@oceanpearlseafood.com';

    if (!isSuperAdmin) {
        const callerDoc = await db.collection('users').doc(callerUid).get();
        const callerData = callerDoc.data() || {};
        const hasAdminPermission = callerData.role === 'admin' ||
            callerData.role === 'ceo' ||
            callerData.role_v2 === 'HQ_ADMIN';

        if (!hasAdminPermission) {
            throw new HttpsError('permission-denied', 'Only Admins can manage users.');
        }
    }

    const { targetUid, action, payload } = data; // action: 'update_profile', 'toggle_status', 'reset_password', 'delete_user'

    try {
        if (action === 'update_profile') {
            const { role, role_v2, locationId, unitId, displayName, phone } = payload;
            const updateData = {};
            if (role) updateData.role = role;
            if (role_v2) updateData.role_v2 = role_v2;
            if (locationId !== undefined) updateData.locationId = locationId;
            if (unitId !== undefined) updateData.unitId = unitId;
            if (displayName) updateData.displayName = displayName;
            if (phone !== undefined) updateData.phone = phone;

            await db.collection('users').doc(targetUid).update(updateData);
            if (displayName) await admin.auth().updateUser(targetUid, { displayName });

            return { success: true, message: 'Profile updated.' };
        }

        if (action === 'toggle_status') {
            const { disabled } = payload;
            await admin.auth().updateUser(targetUid, { disabled });
            await db.collection('users').doc(targetUid).update({ disabled });
            return { success: true, message: `User ${disabled ? 'disabled' : 'enabled'}.` };
        }

        if (action === 'reset_password') {
            const { newPassword } = payload;
            await admin.auth().updateUser(targetUid, { password: newPassword });
            return { success: true, message: 'Password reset successful.' };
        }

        if (action === 'delete_user') {
            await admin.auth().deleteUser(targetUid);
            await db.collection('users').doc(targetUid).delete();
            return { success: true, message: 'User permanently deleted.' };
        }

        throw new HttpsError('invalid-argument', 'Unknown action');

    } catch (err) {
        console.error("Manage User Error", err);
        throw new HttpsError('internal', err.message);
    }
});
