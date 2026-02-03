import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [originalUser, setOriginalUser] = useState(null); // CEO's original identity
    const [ceoMode, setCeoMode] = useState(null); // null | 'VIEW_AS' | 'OPERATE_AS'
    const [loading, setLoading] = useState(true);
    const [actionConfirmed, setActionConfirmed] = useState(false); // Session-based confirmation

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch extra user details from Firestore (Role, Location, Unit)
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();

                        // SANITIZATION: Ensure IDs are strings, not objects (Fixes React Error #31)
                        if (userData.locationId && typeof userData.locationId === 'object') {
                            userData.locationId = userData.locationId.id || '';
                        }
                        if (userData.unitId && typeof userData.unitId === 'object') {
                            userData.unitId = userData.unitId.id || '';
                        }

                        // BACKFILL: Ensure role_v2 exists from legacy role if missing
                        if (!userData.role_v2 && userData.role) {
                            const r = userData.role.toLowerCase();
                            if (r === 'admin' || r === 'ceo' || r === 'hq') userData.role_v2 = 'HQ_ADMIN';
                            else if (r === 'manager' || r === 'location_admin' || r === 'loc_manager') userData.role_v2 = 'LOC_MANAGER';
                            else if (r === 'operator' || r === 'site_user' || r === 'unit_admin' || r === 'unit_op') userData.role_v2 = 'UNIT_OP';
                        }

                        const fullUser = { uid: user.uid, email: user.email, ...userData };
                        setCurrentUser(fullUser);
                        setOriginalUser(fullUser); // Store original identity
                    } else if (user.email.toLowerCase() === 'info@oceanpearlseafood.com') {
                        // EMERGENCY BOOTSTRAP: Allow root admin without DB entry
                        console.warn('Emergency Admin Login Detected');
                        const bootstrapUser = {
                            uid: user.uid,
                            email: user.email,
                            role: 'admin',
                            role_v2: 'HQ_ADMIN',
                            locationId: 'jakarta',
                            displayName: 'CEO'
                        };
                        setCurrentUser(bootstrapUser);
                        setOriginalUser(bootstrapUser);
                    } else {
                        console.error('User profile not found');
                        setCurrentUser(null);
                        setOriginalUser(null);
                    }
                } catch (err) {
                    console.error('Error fetching user profile', err);
                    setCurrentUser(null);
                    setOriginalUser(null);
                }
            } else {
                setCurrentUser(null);
                setOriginalUser(null);
                setCeoMode(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // DIAGNOSTIC LOGGING (TEMPORARY)
    useEffect(() => {
        if (!currentUser) return;

        console.group("🔍 AuthContext State Change");
        console.log("Active Location:", currentUser.locationId);
        console.log("Active Unit:", currentUser.unitId);
        console.log("Effective Role:", currentUser.role_v2);
        console.log("CEO Mode:", ceoMode);
        console.groupEnd();

        // Expose to window for manual checking if needed
        window.__OPS_DEBUG = {
            activeLocationId: currentUser.locationId,
            activeUnitId: currentUser.unitId,
            effectiveRole: currentUser.role_v2,
            mode: ceoMode,
            currentUser
        };
    }, [currentUser, ceoMode]);

    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Login Error:", error);
            throw new Error(`Login failed: ${error.message}`);
        }
    };

    const logout = async () => {
        await signOut(auth);
        setCeoMode(null);
        setActionConfirmed(false);
    };

    // Check if user is CEO/Global Admin
    const isCEO = () => {
        return originalUser?.role === 'admin' || originalUser?.role_v2 === 'GLOBAL_ADMIN' ||
            originalUser?.role_v2 === 'HQ_ADMIN';
    };

    // Allow Admin to switch context locally (Legacy - Simple mode)
    const updateViewContext = (locationId, unitId) => {
        if (!currentUser) return;
        setCurrentUser(prev => ({ ...prev, locationId, unitId }));
    };

    // CEO MODE: View As (Read-Only)
    const setViewAsMode = (locationId, unitId, roleV2) => {
        if (!isCEO()) {
            console.error('Only CEO can use View As mode');
            return;
        }

        setCurrentUser({
            ...originalUser,
            locationId,
            unitId,
            role_v2: roleV2,
            _isViewAs: true // Flag for read-only enforcement
        });
        setCeoMode('VIEW_AS');
        setActionConfirmed(false);

        // Update document title
        updateDocumentTitle('VIEW_AS', locationId, roleV2);
    };

    // CEO MODE: Operate As (Write-Enabled)
    const setOperateAsMode = (locationId, unitId, roleV2) => {
        if (!isCEO()) {
            console.error('Only CEO can use Operate As mode');
            return;
        }

        setCurrentUser({
            ...originalUser,
            locationId,
            unitId,
            role_v2: roleV2,
            _isOperateAs: true // Flag for tracking
        });
        setCeoMode('OPERATE_AS');
        setActionConfirmed(false); // Reset confirmation for new mode

        // Update document title
        updateDocumentTitle('OPERATE_AS', locationId, roleV2);
    };

    // Exit CEO Mode - Return to original identity
    const exitCEOMode = () => {
        setCurrentUser(originalUser);
        setCeoMode(null);
        setActionConfirmed(false);

        // Reset document title
        document.title = 'OPS — CEO (Global Admin)';
    };

    // Update document title based on mode
    const updateDocumentTitle = (mode, locationId, roleV2) => {
        const locLabel = locationId ? locationId.toUpperCase() : 'GLOBAL';
        const roleLabel = roleV2 ? roleV2.replace('_', ' ') : 'ADMIN';

        if (mode === 'VIEW_AS') {
            document.title = `OPS — VIEW AS: ${locLabel} / ${roleLabel}`;
        } else if (mode === 'OPERATE_AS') {
            document.title = `OPS — OPERATE AS: ${locLabel} / ${roleLabel}`;
        } else {
            document.title = 'OPS — CEO (Global Admin)';
        }
    };

    // Confirm action in Operate As mode (session-based)
    const confirmAction = () => {
        setActionConfirmed(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            currentUser,
            originalUser,
            ceoMode,
            actionConfirmed,
            login,
            logout,
            loading,
            updateViewContext,
            isCEO,
            setViewAsMode,
            setOperateAsMode,
            exitCEOMode,
            confirmAction
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
