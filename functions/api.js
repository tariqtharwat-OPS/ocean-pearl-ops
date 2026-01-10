const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

exports.getFinancialRequests = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { locationId, requesterId } = data;
  let query = db.collection("financial_requests");

  if (locationId) {
    query = query.where("locationId", "==", locationId);
  } else if (requesterId) {
    query = query.where("requesterId", "==", requesterId);
  } else {
    // No filter, return all requests (for admins)
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
