const firebase = require("@firebase/rules-unit-testing");
const fs = require("fs");

const PROJECT_ID = "oceanpearl-ops";
const rules = fs.readFileSync("firestore.rules", "utf8");

const testEnv = firebase.initializeTestEnvironment({ projectId: PROJECT_ID });

describe("Firestore security rules", () => {
  before(async () => {
    await testEnv.withSecurityRules(rules).loadFirestoreRules();
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("should allow users to read their own data", async () => {
    const db = testEnv.unauthenticatedContext().database();
    const userDoc = db.collection("users").doc("testUser");
    await firebase.assertSucceeds(userDoc.get());
  });

  it("should not allow users to read other users' data", async () => {
    const db = testEnv.unauthenticatedContext().database();
    const userDoc = db.collection("users").doc("otherUser");
    await firebase.assertFails(userDoc.get());
  });

  it("should allow authenticated users to create financial requests", async () => {
    const db = testEnv.authenticatedContext("testUser").database();
    const requestDoc = db.collection("financial_requests").doc("testRequest");
    await firebase.assertSucceeds(requestDoc.set({ amount: 100, requesterId: "testUser" }));
  });

  it("should not allow users to create financial requests for others", async () => {
    const db = testEnv.authenticatedContext("testUser").database();
    const requestDoc = db.collection("financial_requests").doc("testRequest");
    await firebase.assertFails(requestDoc.set({ amount: 100, requesterId: "otherUser" }));
  });
});
