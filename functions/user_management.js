const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

/**
 * createUser
 * 
 * Cloud Function to create a new user with email/password authentication
 * and assign role, location, and unit access.
 * 
 * Only HQ_ADMIN can call this function.
 * 
 * Idempotent: If email exists, updates role/access safely without duplicates.
 */
exports.createUser = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };

    // 1. Authentication check
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'Login required.');
    }

    // 2. Authorization check - only HQ_ADMIN can create users
    const db = getFirestore();
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();

    if (!callerData || (callerData.role_v2 !== 'HQ_ADMIN' && callerData.role !== 'HQ_ADMIN')) {
        throw new HttpsError('permission-denied', 'Only HQ_ADMIN can create users.');
    }

    // 3. Validate input
    const { email, password, displayName, role_v2, locationId, unitId } = data;

    if (!email || !password) {
        throw new HttpsError('invalid-argument', 'Email and password are required.');
    }

    if (!role_v2 || !['HQ_ADMIN', 'LOC_MANAGER', 'UNIT_OP', 'INVESTOR'].includes(role_v2)) {
        throw new HttpsError('invalid-argument', 'Valid role_v2 is required (HQ_ADMIN, LOC_MANAGER, UNIT_OP, INVESTOR).');
    }

    // 4. Create or update user in Firebase Authentication
    let userRecord;
    try {
        // Try to get existing user
        userRecord = await getAuth().getUserByEmail(email);
        console.log(`User ${email} exists. Updating...`);
        
        // Update password if provided
        if (password) {
            await getAuth().updateUser(userRecord.uid, { password: password });
        }
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            // Create new user
            console.log(`Creating new user ${email}...`);
            userRecord = await getAuth().createUser({
                email: email,
                password: password,
                emailVerified: true,
                displayName: displayName || email.split('@')[0]
            });
        } else {
            throw new HttpsError('internal', `Failed to create/update user: ${error.message}`);
        }
    }

    // 5. Create/update user profile in Firestore
    const userDoc = {
        email: email,
        role: role_v2, // For backward compatibility
        role_v2: role_v2,
        displayName: displayName || email.split('@')[0],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add location and unit if provided
    if (locationId) {
        userDoc.locationId = locationId;
    }
    if (unitId) {
        userDoc.unitId = unitId;
    }

    // If this is a new user, set createdAt
    const existingDoc = await db.collection('users').doc(userRecord.uid).get();
    if (!existingDoc.exists) {
        userDoc.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });

    console.log(`User ${email} created/updated successfully with role ${role_v2}`);

    return {
        success: true,
        uid: userRecord.uid,
        email: email,
        role_v2: role_v2,
        message: existingDoc.exists ? 'User updated successfully' : 'User created successfully'
    };
});

/**
 * listUsers
 * 
 * Cloud Function to list all users in the system.
 * Only HQ_ADMIN can call this function.
 */
exports.listUsers = onCall(async (request) => {
    const context = { auth: request.auth };

    // 1. Authentication check
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'Login required.');
    }

    // 2. Authorization check - only HQ_ADMIN can list users
    const db = getFirestore();
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();

    if (!callerData || (callerData.role_v2 !== 'HQ_ADMIN' && callerData.role !== 'HQ_ADMIN')) {
        throw new HttpsError('permission-denied', 'Only HQ_ADMIN can list users.');
    }

    // 3. Get all users from Firestore
    const usersSnap = await db.collection('users').get();
    const users = [];

    usersSnap.forEach(doc => {
        const userData = doc.data();
        users.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            role_v2: userData.role_v2,
            locationId: userData.locationId,
            unitId: userData.unitId,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt
        });
    });

    return {
        success: true,
        users: users
    };
});

/**
 * deleteUser
 * 
 * Cloud Function to delete a user from the system.
 * Only HQ_ADMIN can call this function.
 */
exports.deleteUser = onCall(async (request) => {
    const data = request.data;
    const context = { auth: request.auth };

    // 1. Authentication check
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'Login required.');
    }

    // 2. Authorization check - only HQ_ADMIN can delete users
    const db = getFirestore();
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();

    if (!callerData || (callerData.role_v2 !== 'HQ_ADMIN' && callerData.role !== 'HQ_ADMIN')) {
        throw new HttpsError('permission-denied', 'Only HQ_ADMIN can delete users.');
    }

    // 3. Validate input
    const { uid } = data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'User UID is required.');
    }

    // 4. Prevent self-deletion
    if (uid === context.auth.uid) {
        throw new HttpsError('invalid-argument', 'Cannot delete your own account.');
    }

    // 5. Delete user from Firebase Authentication
    try {
        await getAuth().deleteUser(uid);
    } catch (error) {
        throw new HttpsError('internal', `Failed to delete user from Authentication: ${error.message}`);
    }

    // 6. Delete user profile from Firestore
    await db.collection('users').doc(uid).delete();

    console.log(`User ${uid} deleted successfully`);

    return {
        success: true,
        message: 'User deleted successfully'
    };
});
