const { MongoClient } = require('mongodb');

let db;

// Hardcoded MongoDB Atlas connection string with your credentials
const MONGO_URI = 'mongodb+srv://akhil0708jnv:akhilsanil@cluster0.htemwbz.mongodb.net/shopping_cart?retryWrites=true&w=majority';

const connectDB = async () => {
  try {
    const client = await MongoClient.connect(MONGO_URI);  // Removed deprecated options
    db = client.db('shopping_cart'); // Your database name
    console.log('✅ MongoDB Connected!');
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
};

module.exports = { connectDB, getDB };
