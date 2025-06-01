var db = require('../config/connection');
const collection = require('../config/collection');
const bcrypt = require('bcrypt');
const ObjectId = require('mongodb').ObjectId;
const Order = require('../models/order');

module.exports = {
  doSignup: async (userData) => {
    try {
      const saltRounds = 10;
      userData.password = await bcrypt.hash(userData.password, saltRounds);
  
      const result = await db.getDB().collection('users').insertOne(userData);
      console.log("User inserted with ID:", result.insertedId);
  
      userData._id = result.insertedId; // Add _id to the user object
      return { status: true, user: userData }; // 👈 THIS is important
    } catch (error) {
      console.error("❌ Error in doSignup:", error);
      return { status: false }; // Return status false on error
    }
  },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let loginStatus = false;
                let response = {};
                let user = await db.getDB().collection('users').findOne({ email: userData.email });
    
                if (user) {
                    const status = await bcrypt.compare(userData.password, user.password);
    
                    if (status) {
                        console.log('✅ Login success');
                        response.user = user;
                        response.status = true;
                        resolve(response); // Send success response
                    } else {
                        console.log('❌ Incorrect password');
                        resolve({ status: false, error: "Incorrect password" });
                    }
                } else {
                    console.log('❌ No account found for this email');
                    resolve({ status: false, error: "Email not registered" });
                }
            } catch (err) {
                console.error("❌ Error during login:", err);
                reject(err);
            }
        });
    },
    addToCart: async (userId, productId) => {
        try {
          const dbInstance = db.getDB();
          const objectUserId = new ObjectId(userId);
          const objectProductId = new ObjectId(productId);
      
          const cart = await dbInstance.collection('cart').findOne({ userId: objectUserId });
      
          if (cart) {
            const productIndex = cart.products.findIndex(
              item => item.productId.equals(objectProductId)
            );
      
            if (productIndex !== -1) {
              // Product already in cart
              await dbInstance.collection('cart').updateOne(
                { userId: objectUserId, 'products.productId': objectProductId },
                { $inc: { 'products.$.quantity': 1 } }
              );
            } else {
              // New product
              await dbInstance.collection('cart').updateOne(
                { userId: objectUserId },
                { $push: { products: { productId: objectProductId, quantity: 1 } } }
              );
            }
          } else {
            // New cart
            await dbInstance.collection('cart').insertOne({
              userId: objectUserId,
              products: [{ productId: objectProductId, quantity: 1 }]
            });
          }
      
          return true;
        } catch (err) {
          console.error("❌ Error adding to cart:", err);
          throw err;
        }
      },
      getCart: async (userId) => {
        try {
            const cartItems = await db.getDB().collection('cart').aggregate([
                { $match: { userId: new ObjectId(userId) } },
                { $unwind: '$products' },
                {
                    $lookup: {
                        from: 'products',  // Ensure this is your product collection name
                        localField: 'products.productId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $project: {
                        quantity: '$products.quantity',
                        product: { $arrayElemAt: ['$productDetails', 0] }
                    }
                }
            ]).toArray();
    
            console.log("🛒 Cart items fetched in DB:", cartItems);  // Log the selected items
            return cartItems;
        } catch (error) {
            console.error("❌ Error fetching cart:", error);
            throw error;
        }
    },
    removeFromCart: async (userId, productId) => {
      try {
        const dbInstance = db.getDB();
        await dbInstance.collection('cart').updateOne(
          { userId: new ObjectId(userId) },
          { $pull: { products: { productId: new ObjectId(productId) } } }
        );
        console.log("🗑️ Item removed from cart:", productId);
      } catch (error) {
        console.error("❌ Error in removeFromCart:", error);
        throw error;
      }
    },
    updateCartQuantity: async (userId, productId, action) => {
      try {
        const dbInstance = db.getDB();
        const objectUserId = new ObjectId(userId);
        const objectProductId = new ObjectId(productId);
    
        const cart = await dbInstance.collection('cart').findOne({ userId: objectUserId });
    
        if (!cart) return;
    
        const product = cart.products.find(p => p.productId.equals(objectProductId));
        if (!product) return;
    
        let newQuantity = product.quantity;
    
        if (action === 'increase') {
          newQuantity++;
        } else if (action === 'decrease') {
          newQuantity--;
        }
    
        if (newQuantity < 1) {
          // Remove the product if quantity drops below 1
          await dbInstance.collection('cart').updateOne(
            { userId: objectUserId },
            { $pull: { products: { productId: objectProductId } } }
          );
        } else {
          await dbInstance.collection('cart').updateOne(
            { userId: objectUserId, 'products.productId': objectProductId },
            { $set: { 'products.$.quantity': newQuantity } }
          );
        }
    
        console.log(`🔁 Quantity ${action}d:`, productId);
      } catch (error) {
        console.error("❌ Error in updateCartQuantity:", error);
        throw error;
      }
    },
    getProductById: async (productId) => {
      return await db.getDB().collection('product').findOne({ _id: new ObjectId(productId) });
    },
    placeOrder: async (orderData) => {
      try {
        const dbInstance = db.getDB();
        const product = orderData.products[0]; // get product object
    
        // ✅ Make sure productId is valid and defined
        if (!product.productId || !ObjectId.isValid(product.productId)) {
          console.warn("⚠️ Invalid productId:", product.productId);
          throw new Error("❌ Product not found.");
        }
    
        // ✅ Optional: Validate product exists in DB
        const productInDb = await dbInstance.collection('products').findOne({ _id: new ObjectId(product.productId) });
        if (!productInDb) {
          console.warn("⚠️ No product found with ID:", product.productId);
          throw new Error("❌ Product not found.");
        }
    
        const order = {
          userId: new ObjectId(orderData.userId),
          products: [{
            productId: new ObjectId(product.productId),
            quantity: parseInt(product.quantity),
            price: parseFloat(product.price)
          }],
          location: orderData.location,
          totalAmount: parseFloat(orderData.totalAmount),
          status: 'Pending',
          date: new Date()
        };
    
        const result = await dbInstance.collection('orders').insertOne(order);
        console.log("✅ Order placed:", result.insertedId);
    
        // 🧹 Remove from cart (optional)
        await dbInstance.collection('cart').updateOne(
          { userId: new ObjectId(orderData.userId) },
          { $pull: { products: { productId: new ObjectId(product.productId) } } }
        );
    
        return result.insertedId;
    
      } catch (err) {
        console.error("❌ Error placing order:", err);
        throw err;
      }
    },
    
    getUserOrders: (userId) => {
      return new Promise(async (resolve, reject) => {
        try {
          const orders = await db.getDB().collection('orders')
            .aggregate([
              { $match: { userId: new ObjectId(userId) } },
    
              { $unwind: "$products" },
    
              {
                $lookup: {
                  from: 'products',
                  localField: 'products.productId',
                  foreignField: '_id',
                  as: 'productDetail'
                }
              },
              { $unwind: "$productDetail" },
    
              {
                $group: {
                  _id: "$_id",
                  status: { $first: "$status" },
                  totalAmount: { $first: "$totalAmount" },
                  date: { $first: "$date" },
                  location: { $first: "$location" }, // Ensure location is included
                  products: {
                    $push: {
                      productId: "$products.productId",
                      quantity: "$products.quantity",
                      name: "$productDetail.name",
                      price: "$productDetail.price",
                      image: "$productDetail.image"  // Ensure the image is included in the products
                    }
                  }
                }
              },
              { $sort: { date: -1 } }
            ]).toArray();
    
          resolve(orders);
        } catch (err) {
          reject(err);
        }
      });
    },
    
    searchProducts: async (query) => {
            try {
              const searchRegex = new RegExp(query, 'i'); // case-insensitive
              const results = await db.getDB().collection('products').find({
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
          
    
    }
