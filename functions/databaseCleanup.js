const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.cleanupDatabase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const collections = await admin.firestore().listCollections();
  for (const collection of collections) {
    if (collection.id !== "users") {
      const query = admin.firestore().collection(collection.id);
      const snapshot = await query.get();
      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  }

  return { message: "Database cleaned successfully." };
});
