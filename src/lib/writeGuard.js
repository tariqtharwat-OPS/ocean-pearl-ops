/**
 * Write Guard - Centralized write permission enforcement for CEO Control Mode
 * 
 * This utility ensures that:
 * 1. View As mode is strictly read-only
 * 2. Operate As mode requires confirmation before first write
 * 3. All write attempts are logged for audit
 */

import { toast } from 'react-hot-toast';

let writeAttempts = [];
let sessionConfirmed = false;

/**
 * Check if a write operation is allowed
 * @param {Object} authContext - The auth context from useAuth()
 * @param {string} actionName - Name of the action being attempted
 * @param {Function} onConfirmNeeded - Callback to show confirmation dialog
 * @returns {Promise<boolean>} - True if write is allowed, false otherwise
 */
export async function guardWrite(authContext, actionName, onConfirmNeeded = null) {
    const { currentUser, ceoMode, actionConfirmed, confirmAction } = authContext;

    // Log all write attempts for debugging
    const attempt = {
        timestamp: new Date().toISOString(),
        action: actionName,
        mode: ceoMode,
        user: currentUser?.email,
        role: currentUser?.role_v2,
        location: currentUser?.locationId
    };
    writeAttempts.push(attempt);
    console.log('🔒 Write Guard:', attempt);

    // BLOCK: View As mode is strictly read-only
    if (ceoMode === 'VIEW_AS' || currentUser?._isViewAs) {
        console.warn(`❌ Write blocked in View As mode: ${actionName}`);
        toast.error(`Blocked: View As mode is read-only. Cannot perform: ${actionName}`, {
            duration: 4000,
            icon: '🔒'
        });
        return false;
    }

    // CONFIRM: First write in Operate As mode requires confirmation
    if (ceoMode === 'OPERATE_AS' || currentUser?._isOperateAs) {
        if (!actionConfirmed && !sessionConfirmed) {
            console.log(`⚠️ First write in Operate As mode, requesting confirmation: ${actionName}`);

            // If callback provided, use it to show confirmation dialog
            if (onConfirmNeeded) {
                const confirmed = await onConfirmNeeded(currentUser);
                if (confirmed) {
                    confirmAction();
                    sessionConfirmed = true;
                    return true;
                } else {
                    toast.error('Action cancelled', { icon: '🚫' });
                    return false;
                }
            }

            // Fallback: browser confirm
            const confirmed = window.confirm(
                `You are about to perform real actions as:\n\n` +
                `Location: ${currentUser?.locationId?.toUpperCase() || 'GLOBAL'}\n` +
                `Role: ${currentUser?.role_v2?.replace('_', ' ') || 'ADMIN'}\n\n` +
                `Action: ${actionName}\n\n` +
                `This will create real data and affect the business. Continue?`
            );

            if (confirmed) {
                confirmAction();
                sessionConfirmed = true;
                console.log('✅ Operate As confirmed for session');
                return true;
            } else {
                toast.error('Action cancelled', { icon: '🚫' });
                return false;
            }
        }
        // Already confirmed this session
        return true;
    }

    // ALLOW: Normal operations (no CEO mode active)
    return true;
}

/**
 * Assert that a write operation is allowed, throw if not
 * @param {Object} authContext - The auth context from useAuth()
 * @param {string} actionName - Name of the action being attempted
 */
export async function assertWritable(authContext, actionName) {
    const allowed = await guardWrite(authContext, actionName);
    if (!allowed) {
        throw new Error(`Write operation blocked: ${actionName}`);
    }
    return true;
}

/**
 * Check if current mode allows writes (synchronous check for UI)
 * @param {Object} authContext - The auth context from useAuth()
 * @returns {boolean}
 */
export function canWrite(authContext) {
    const { currentUser, ceoMode } = authContext;

    // View As is always read-only
    if (ceoMode === 'VIEW_AS' || currentUser?._isViewAs) {
        return false;
    }

    // Everything else allows writes
    return true;
}

/**
 * Get write attempt audit log
 * @returns {Array} - Array of write attempts
 */
export function getWriteAuditLog() {
    return [...writeAttempts];
}

/**
 * Clear session confirmation (for testing)
 */
export function resetSessionConfirmation() {
    sessionConfirmed = false;
}

/**
 * Component hook for easy write guarding
 */
export function useWriteGuard(authContext) {
    return {
        guardWrite: (actionName, onConfirmNeeded) => guardWrite(authContext, actionName, onConfirmNeeded),
        assertWritable: (actionName) => assertWritable(authContext, actionName),
        canWrite: () => canWrite(authContext),
        isReadOnly: !canWrite(authContext)
    };
}
