const mongoose = require('mongoose');

let transactionsSupported = null;

/**
 * Executes `work(session)` inside a MongoDB multi-document transaction when
 * supported by the cluster (e.g. MongoDB Atlas / replica set).
 * Automatically falls back to `work(null)` on standalone MongoDB instances,
 * where callers use atomic conditional updates + compensating rollbacks.
 */
async function runWithOptionalTransaction(work) {
  if (transactionsSupported === false) {
    return work(null);
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    transactionsSupported = true;
    return result;
  } catch (error) {
    const msg = error?.message || '';
    const isStandaloneError =
      error?.code === 20 ||
      msg.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
      msg.includes('does not support transactions');

    if (isStandaloneError) {
      transactionsSupported = false;
      console.warn('[Database] Standalone MongoDB detected; falling back to atomic compensating updates.');
      return work(null);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { runWithOptionalTransaction };
