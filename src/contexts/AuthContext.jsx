import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

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

                        setCurrentUser({ uid: user.uid, email: user.email, ...userData });
                    } else if (user.email.toLowerCase() === 'info@oceanpearlseafood.com') {
                        // EMERGENCY BOOTSTRAP: Allow root admin without DB entry
                        console.warn('Emergency Admin Login Detected');
                        setCurrentUser({
                            uid: user.uid,
                            email: user.email,
                            role: 'admin',
                            locationId: 'hq'
                        });
                    } else {
                        console.error('User profile not found');
                        setCurrentUser(null);
                    }
                } catch (err) {
                    console.error('Error fetching user profile', err);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    // Allow Admin to switch context locally
    const updateViewContext = (locationId, unitId) => {
        if (!currentUser) return;
        setCurrentUser(prev => ({ ...prev, locationId, unitId }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, loading, updateViewContext }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
