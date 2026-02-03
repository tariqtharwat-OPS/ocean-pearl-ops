// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBmHSr7huWpMZa9RnKNBgV6fnXltmvsxcc",
    authDomain: "oceanpearl-ops.firebaseapp.com",
    projectId: "oceanpearl-ops",
    storageBucket: "oceanpearl-ops.firebasestorage.app",
    messagingSenderId: "784571080866",
    appId: "1:784571080866:web:61bacaf38ea90f81d1f7fb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functionsInstances = {};

export const getFunctionsForRegion = (region) => {
    if (!functionsInstances[region]) {
        functionsInstances[region] = getFunctions(app, region);
        /*
        if (location.hostname === "localhost") {
            connectFunctionsEmulator(functionsInstances[region], 'localhost', 5001);
        }
        */
    }
    return functionsInstances[region];
};
const auth = getAuth(app);

// Use emulators in development
// Emulator connection disabled for production verification
/*
if (location.hostname === "localhost") {
    connectFirestoreEmulator(db, 'localhost', 8080);
    
    connectAuthEmulator(auth, 'http://localhost:9099');
} else {
*/
// Only enable persistence if NOT using emulators to avoid conflicts
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Persistence failed: Not supported');
    }
});
// }

// Default functions instance for backward compatibility
const functions = getFunctionsForRegion('asia-southeast1');

export { db, auth, functions };
if (typeof window !== 'undefined') {
    window._debug_firebase = { app, db, functions, auth };
}
