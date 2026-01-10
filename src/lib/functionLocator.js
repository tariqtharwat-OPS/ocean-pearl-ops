const functionRegions = {
  // Gemini-powered functions in us-central1
  sharkChat: 'us-central1',

  // Financial functions in asia-southeast1
  createFinancialRequest: 'asia-southeast1',
  approveFinancialRequest: 'asia-southeast1',
  rejectFinancialRequest: 'asia-southeast1',
  getFinancialRequests: 'asia-southeast1',

  // Data initialization and cleanup in asia-southeast1
  cleanupDatabase: 'asia-southeast1',
  populateMasterData: 'asia-southeast1',

  // Other functions in their respective regions
  backupFirestore: 'asia-southeast2',
  migrateSchemaV2: 'asia-southeast2',
  migrateUsersV2: 'asia-southeast2',
  revertUsersV1: 'asia-southeast2',
  performGreatWipe: 'asia-southeast2',
  seedProcessingRules: 'asia-southeast2',
  seedProduction: 'asia-southeast2',
  postTransaction: 'asia-southeast1',
  repairSystemWallets: 'asia-southeast1',
  createSystemUser: 'asia-southeast1',
  manageUser: 'asia-southeast1',
  seedTaxonomy: 'asia-southeast1',
  auditTransaction: 'asia-southeast1',
  transactionAggregator: 'asia-southeast1',
  twilioWebhook: 'asia-southeast1',
  injectDay1: 'asia-southeast1',
};

export const getFunctionRegion = (functionName) => {
  return functionRegions[functionName] || 'asia-southeast1'; // Default to asia-southeast1 if not specified
};
