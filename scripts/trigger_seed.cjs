const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyBmHSr7huWpMZa9RnKNBgV6fnXltmvsxcc",
    authDomain: "oceanpearl-ops.firebaseapp.com",
    projectId: "oceanpearl-ops",
    storageBucket: "oceanpearl-ops.firebasestorage.app",
    messagingSenderId: "784571080866",
    appId: "1:784571080866:web:61bacaf38ea90f81d1f7fb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function prepareStock() {
    console.log("=== PREPARE STOCK (CLIENT SDK) ===");

    // Login as Admin to write to anything (assuming admin has write access or we use a function? 
    // Actually, Admin CANNOT write directly to stock usually. 
    // BUT, 'admin' role might have bypass or we need to use 'createFinancialRequest' flow? 
    // No, for seeding we usually use Cloud Functions.
    // However, I can try to use the `seedProduction` function via HTTP if this fails.

    // Let's try to call the seedProduction function via FETCH!
    // That is safer and guaranteed to work if deployed.

    try {
        console.log("Triggering Seed Function...");
        const response = await fetch('https://asia-southeast2-oceanpearl-ops.cloudfunctions.net/seedProduction');
        const text = await response.text();
        console.log("Seed Result:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }

    process.exit();
}

prepareStock();
