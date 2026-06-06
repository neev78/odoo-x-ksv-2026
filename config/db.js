const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Connect to MongoDB with retry logic.
 * On transient network failures the server will retry up to MAX_RETRIES times
 * with an exponential-ish back-off instead of crashing immediately.
 */
const connectDB = async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not set. Please configure your .env file.');
    process.exit(1);
  }

  if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      console.log('⚠️  Using in-memory MongoDB. Data will be lost on restart.');
    } catch (e) {
      console.log('ℹ️  mongodb-memory-server not found, trying local DB.');
    }
  }

  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(uri);
      console.log(`✅  MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.error(`❌  MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error('❌  All connection attempts exhausted. Exiting.');
        process.exit(1);
      }
      const delay = RETRY_DELAY_MS * attempt;
      console.log(`    Retrying in ${delay / 1000}s…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

module.exports = connectDB;
