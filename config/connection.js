const { MongoClient, ServerApiVersion } = require('mongodb');

let db;

// ✅ Updated MongoDB URI with SSL required
const MONGO_URI = 'mongodb+srv://akhil0708jnv:akhilsanil@cluster0.htemwbz.mongodb.net/shopping_cart?retryWrites=true&w=majority&ssl=true';

const connectDB = async () => {
  try {
    const client = await MongoClient.connect(MONGO_URI, {
      serverApi: ServerApiVersion.v1, // ✅ Ensures stable API behavior
    });
    db = client.db('shopping_cart');
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
