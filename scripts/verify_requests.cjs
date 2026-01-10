const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy } = require('firebase/firestore');
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

async function run() {
    try {
        // Login as HQ Admin to see all requests
        await signInWithEmailAndPassword(auth, 'tariq@oceanpearlseafood.com', 'OceanPearl2026!');
        console.log("Logged in as Tariq");

        const q = query(
            collection(db, 'financial_requests'),
            orderBy('createdAt', 'desc')
            // limit(5)
        );

        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} requests.`);

        let found = false;
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[${doc.id}] ${data.amount} - ${data.description} (${data.status}) [Loc: ${data.locationId}]`);
            if (data.description === 'Final V2 UI Check' && data.amount === 888) {
                found = true;
                console.log(">>> FOUND THE REQUEST! <<<");
            }
        });

        if (found) {
            console.log("SUCCESS: Request creation from UI was successful.");
        } else {
            console.log("FAILURE: Request not found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit();
}

run();
