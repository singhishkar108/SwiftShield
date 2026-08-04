import ExpressBrute from "express-brute";
import MongooseStore from "express-brute-mongoose";
import mongoose from "mongoose";

// Store brute-force attempt data in MongoDB.
const store = new MongooseStore(mongoose.connection, {
  collectionName: "bruteforce",
});

// Configure brute-force protection middleware.
export const brute = new ExpressBrute(store, {
  freeRetries: 5, // 5 failed attempts.
  minWait: 5 * 60 * 1000, // Lock for 5 minutes after limit is reached.
  maxWait: 60 * 60 * 1000, // Maximum lockout duration of 1 hour.

  // Return a rate-limit response when retries are exhausted.
  failCallback(req, res, next, nextValidRequestDate) {
    res.status(429).json({
      error: "Too many attempts. Try again later.",
      retryAfter: nextValidRequestDate,
    });
  },

  // Log any errors from the MongoDB store.
  handleStoreError(error) {
    console.error("BruteForce store error:", error);
  },
});
