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
const functions = getFunctions(app, 'asia-southeast2');
const auth = getAuth(app);

// Use emulators in development
if (location.hostname === "localhost") {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectAuthEmulator(auth, 'http://localhost:9099');
} else {
    // Only enable persistence if NOT using emulators to avoid conflicts
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence failed: Not supported');
        }
    });
}

export { db, functions, auth };
if (typeof window !== 'undefined') {
    window._debug_firebase = { app, db, functions, auth };
}
