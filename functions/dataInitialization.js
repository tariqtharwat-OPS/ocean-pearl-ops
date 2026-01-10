const functions = require("firebase-functions").region("asia-southeast1");
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Cleanup Database - Keep only users/passwords, delete all other data
 */
exports.cleanupDatabase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Only allow HQ Admin to cleanup
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'HQ_ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Only HQ Admin can cleanup database');
  }

  const collections = [
    'items',
    'suppliers',
    'locations',
    'wallets',
    'transactions',
    'financialRequests',
    'sharkAIInsights',
    'products',
    'stock',
    'processing'
  ];

  const deleteResults = {};

  for (const collection of collections) {
    try {
      const snapshot = await db.collection(collection).get();
      let count = 0;
      const batch = db.batch();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }
      deleteResults[collection] = `Deleted ${count} documents`;
    } catch (error) {
      deleteResults[collection] = `Error: ${error.message}`;
    }
  }

  return {
    status: 'Cleanup complete',
    results: deleteResults,
    timestamp: new Date().toISOString()
  };
});

/**
 * Populate Master Data - Fish Items, Products, Suppliers
 */
exports.populateMasterData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'HQ_ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Only HQ Admin can populate data');
  }

  const results = {
    items: 0,
    products: 0,
    suppliers: 0
  };

  // Fish Items from Saumlaki price list
  const fishItems = [
    // Tuna varieties
    { name: 'Cakalang (Tuna)', type: 'Tuna', size: '1-5 kg', wholesalePrice: 35000, retailPrice: 85000, unit: 'kg' },
    { name: 'Cakalang (Tuna)', type: 'Tuna', size: '5-10 kg', wholesalePrice: 38000, retailPrice: 90000, unit: 'kg' },
    { name: 'Yellowfin Tuna', type: 'Tuna', size: '1-5 kg', wholesalePrice: 45000, retailPrice: 110000, unit: 'kg' },
    { name: 'Yellowfin Tuna', type: 'Tuna', size: '5-10 kg', wholesalePrice: 48000, retailPrice: 120000, unit: 'kg' },
    
    // Grouper varieties
    { name: 'Kerapu', type: 'Grouper', size: '1-10 kg', wholesalePrice: 33000, retailPrice: 70000, unit: 'kg' },
    { name: 'Kerapu', type: 'Grouper', size: '10-20 kg', wholesalePrice: 33000, retailPrice: 70000, unit: 'kg' },
    { name: 'Kerapu Minyak', type: 'Grouper', size: '1-10 kg', wholesalePrice: 32000, retailPrice: 70000, unit: 'kg' },
    
    // Snapper varieties
    { name: 'Sunu Merah', type: 'Snapper', size: '0.5-1 kg', wholesalePrice: 33000, retailPrice: 135000, unit: 'kg' },
    { name: 'Sunu Merah', type: 'Snapper', size: '1+ kg', wholesalePrice: 49000, retailPrice: 150000, unit: 'kg' },
    { name: 'Sunu Poppa', type: 'Snapper', size: '0.5-1 kg', wholesalePrice: 28000, retailPrice: 135000, unit: 'kg' },
    
    // Mackerel varieties
    { name: 'Tenggiri Batang', type: 'Mackerel', size: '3+ kg', wholesalePrice: 39000, retailPrice: 60000, unit: 'kg' },
    { name: 'Tenggiri Waho', type: 'Mackerel', size: '1-3 kg', wholesalePrice: 20000, retailPrice: 35000, unit: 'kg' },
    
    // Squid and Octopus
    { name: 'Sontong (Squid)', type: 'Cephalopod', size: '0.5+ kg', wholesalePrice: 21000, retailPrice: 50000, unit: 'kg' },
    { name: 'Gurita (Octopus)', type: 'Cephalopod', size: '0.5-1 kg', wholesalePrice: 26000, retailPrice: 45000, unit: 'kg' },
    { name: 'Gurita (Octopus)', type: 'Cephalopod', size: '1+ kg', wholesalePrice: 38000, retailPrice: 60000, unit: 'kg' },
    
    // Local varieties
    { name: 'Ikan Campur (Mixed Fish)', type: 'Mixed', size: '0.3+ kg', wholesalePrice: 3000, retailPrice: 15000, unit: 'kg' },
    { name: 'Lencam', type: 'Local', size: '0.5-1 kg', wholesalePrice: 8000, retailPrice: 43000, unit: 'kg' },
    { name: 'Kaci-kaci', type: 'Local', size: '0.5-1 kg', wholesalePrice: 8000, retailPrice: 25000, unit: 'kg' },
    
    // Dry Anchovies (for Kaimana operation)
    { name: 'Teri Kering (Dry Anchovies)', type: 'Dry Fish', size: 'Bulk', wholesalePrice: 45000, retailPrice: 75000, unit: 'kg' }
  ];

  // Create fish items
  for (const item of fishItems) {
    try {
      await db.collection('items').add({
        ...item,
        category: 'Fish',
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid
      });
      results.items++;
    } catch (error) {
      console.error('Error creating item:', error);
    }
  }

  // Products (processed items)
  const products = [
    { name: 'Tuna Fillet', baseItem: 'Cakalang (Tuna)', yieldPercentage: 65, processingCost: 5000, unit: 'kg' },
    { name: 'Tuna Steak', baseItem: 'Cakalang (Tuna)', yieldPercentage: 70, processingCost: 3000, unit: 'kg' },
    { name: 'Grouper Fillet', baseItem: 'Kerapu', yieldPercentage: 60, processingCost: 4000, unit: 'kg' },
    { name: 'Smoked Tuna', baseItem: 'Cakalang (Tuna)', yieldPercentage: 75, processingCost: 8000, unit: 'kg' },
    { name: 'Dried Squid', baseItem: 'Sontong (Squid)', yieldPercentage: 35, processingCost: 6000, unit: 'kg' },
    { name: 'Salted Anchovies', baseItem: 'Teri Kering (Dry Anchovies)', yieldPercentage: 85, processingCost: 2000, unit: 'kg' }
  ];

  for (const product of products) {
    try {
      await db.collection('products').add({
        ...product,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid
      });
      results.products++;
    } catch (error) {
      console.error('Error creating product:', error);
    }
  }

  // Suppliers by location
  const suppliers = [
    // Jakarta suppliers
    { name: 'PT Mina Jaya Jakarta', location: 'Jakarta', type: 'Fish Supplier', specialization: 'Mixed Fish', active: true },
    { name: 'Nelayan Muara Jakarta', location: 'Jakarta', type: 'Fish Supplier', specialization: 'Tuna & Mackerel', active: true },
    { name: 'Supplier Ikan Lokal', location: 'Jakarta', type: 'Fish Supplier', specialization: 'Local Varieties', active: true },
    
    // Kaimana suppliers
    { name: 'Nelayan Kaimana Utama', location: 'Kaimana', type: 'Fish Supplier', specialization: 'Dry Anchovies', active: true },
    { name: 'PT Perikanan Kaimana', location: 'Kaimana', type: 'Fish Supplier', specialization: 'All Types', active: true },
    { name: 'Koperasi Nelayan Teri', location: 'Kaimana', type: 'Fish Supplier', specialization: 'Anchovies', active: true },
    
    // Saumlaki suppliers
    { name: 'Nelayan Saumlaki Sejahtera', location: 'Saumlaki', type: 'Fish Supplier', specialization: 'Mixed Fish', active: true },
    { name: 'PT Laut Saumlaki', location: 'Saumlaki', type: 'Fish Supplier', specialization: 'Premium Fish', active: true },
    
    // Support suppliers
    { name: 'PT Garam Nusantara', location: 'Jakarta', type: 'Salt Supplier', specialization: 'Sea Salt', active: true },
    { name: 'PT Es Indonesia', location: 'Jakarta', type: 'Ice Supplier', specialization: 'Ice Blocks', active: true },
    { name: 'Transportasi Laut Jaya', location: 'Jakarta', type: 'Logistics', specialization: 'Sea Transport', active: true }
  ];

  for (const supplier of suppliers) {
    try {
      await db.collection('suppliers').add({
        ...supplier,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid,
        paymentTerms: '30 days',
        bankDetails: 'To be filled'
      });
      results.suppliers++;
    } catch (error) {
      console.error('Error creating supplier:', error);
    }
  }

  return {
    status: 'Master data populated successfully',
    results,
    timestamp: new Date().toISOString()
  };
});

module.exports = { cleanupDatabase: exports.cleanupDatabase, populateMasterData: exports.populateMasterData };
