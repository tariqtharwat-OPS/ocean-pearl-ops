const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkItems() {
  const snapshot = await db.collection('raw_materials').get();
  console.log('\n=== RAW MATERIALS ===\n');
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.active) {
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${data.name}`);
      console.log(`Name ID: ${data.name_id || '-'}`);
      console.log('---');
    }
  });
}

checkItems().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
