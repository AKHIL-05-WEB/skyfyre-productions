const db = require('../config/connection');

module.exports = {
  addProduct: async (product, callback) => {
    try {
      const dbInstance = db.getDB();  // get DB *here*, inside function
      const data = await dbInstance.collection('products').insertOne(product);
      const id = data.insertedId;
      const imagePath = `images/product-images/${id}.png`;

      await dbInstance.collection('products').updateOne(
        { _id: id },
        { $set: { image: imagePath } }
      );
      callback(id);
    } catch (err) {
      console.error("❌ Error in addProduct:", err);
      callback(false);
    }
  },

  getAllProducts: async () => {
    try {
      const dbInstance = db.getDB();
      const products = await dbInstance.collection('products').find().toArray();
      return products;
    } catch (err) {
      throw err;
    }
  },

  deleteProduct: async (proId) => {
    try {
      const dbInstance = db.getDB();
      const objectId = new ObjectId(proId);
      const response = await dbInstance.collection('products').deleteOne({ _id: objectId });
      return response;
    } catch (err) {
      throw err;
    }
  },

  getProductDetails: async (proId) => {
    try {
      const dbInstance = db.getDB();
      const objectId = new ObjectId(proId);
      const product = await dbInstance.collection('products').findOne({ _id: objectId });
      return product;
    } catch (err) {
      throw err;
    }
  },

  updateProduct: async (proId, proDetails) => {
    try {
      const dbInstance = db.getDB();
      const objectId = new ObjectId(proId);
      const response = await dbInstance.collection('products').updateOne(
        { _id: objectId },
        {
          $set: {
            name: proDetails.name,
            description: proDetails.description,
            category: proDetails.category,
            price: proDetails.price
          }
        }
      );
      return response;
    } catch (err) {
      throw err;
    }
  },

  updateProductImage: async (proId, imagePath) => {
    const dbInstance = db.getDB();
    const objectId = new ObjectId(proId);
    return dbInstance.collection('products').updateOne(
      { _id: objectId },
      { $set: { image: imagePath } }
    );
  },

  getAllOrders: async () => {
    try {
      const dbInstance = db.getDB();
      const orders = await dbInstance.collection('orders').aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $unwind: '$products' },
        {
          $lookup: {
            from: 'products',
            localField: 'products.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: "$_id",
            user: { $first: "$user" },
            location: { $first: "$location" },
            date: { $first: "$date" },
            status: { $first: "$status" },
            totalAmount: { $first: "$totalAmount" },
            products: {
              $push: {
                name: "$product.name",
                price: "$product.price",
                quantity: "$products.quantity",
                image: "$product.image"
              }
            }
          }
        },
        { $sort: { date: -1 } }
      ]).toArray();

      return orders;
    } catch (err) {
      console.error("❌ Error getting all orders:", err);
      throw err;
    }
  },

  searchProducts: async (query) => {
    try {
      const dbInstance = db.getDB();
      const searchRegex = new RegExp(query, 'i'); // case-insensitive
      const results = await dbInstance.collection('products').find({
        $or: [
          { name: { $regex: searchRegex } },
          { category: { $regex: searchRegex } }
        ]
      }).toArray();
      return results;
    } catch (err) {
      throw err;
    }
  }
};
