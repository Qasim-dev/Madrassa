import mongoose from 'mongoose';

function isTransactionUnsupported(err) {
  const msg = String(err?.message || '');
  return (
    err?.code === 20 ||
    err?.codeName === 'IllegalOperation' ||
    /transaction numbers are only allowed/i.test(msg) ||
    /replica set/i.test(msg) ||
    /Transactions are not supported/i.test(msg)
  );
}

/**
 * Run work inside a MongoDB multi-document transaction when supported.
 * On standalone (no replica set), falls back to the same work without a session
 * so local/dev still functions; production should use a replica set.
 *
 * @template T
 * @param {(session: import('mongoose').ClientSession | null) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withMongoTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession().catch(() => {});
  }
}

/** Options object for mongoose queries when a session may be null. */
export function sessionOpts(session) {
  return session ? { session } : {};
}
