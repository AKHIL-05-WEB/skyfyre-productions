const collection = require('../config/collection');
const { ObjectId } = require('mongodb');
var db = require('../config/connection');
module.exports = {
    addProduct: (product, callback) => {
        db.getDB().collection('products').insertOne(product).then((data) => {
            const id = data.insertedId;
            const imagePath = `images/product-images/${id}.png`;

            db.getDB().collection('products').updateOne(
                { _id: id },
                { $set: { image: imagePath } }
            ).then(() => {
                callback(id);
            }).catch(err => {
                console.error("❌ Error updating image path:", err);
                callback(id);
            });
        }).catch((err) => {
            console.error("❌ Error inserting product:", err);
            callback(false);
        });
    },

    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let products = await db.getDB().collection('products').find().toArray();
                resolve(products);
            } catch (err) {
                reject(err);
            }
        });
    },

    deletePRoduct: (proId) => {
        return new Promise((resolve, reject) => {
            const objectId = new ObjectId(proId);
            db.getDB().collection('products').deleteOne({ _id: objectId })
                .then((response) => {
                    console.log("Delete response:", response);
                    resolve(response);
                })
                .catch((err) => {
                    console.error("Delete error:", err);
                    reject(err);
                });
        });
    },

    getProductDetails: (proId) => {
        const objectId = new ObjectId(proId);
        return new Promise((resolve, reject) => {
            db.getDB().collection('products').findOne({ _id: objectId })
                .then((product) => {
                    resolve(product);
                }).catch(reject);
        });
    },
    updateProduct: (proId, proDetails) => {
        const objectId = new ObjectId(proId);
        return new Promise((resolve, reject) => {
            db.getDB().collection('products').updateOne(
                { _id: objectId },
                {
                    $set: {
                        name: proDetails.name,
                        description: proDetails.description, // fixed spelling
                        category: proDetails.category,
                        price: proDetails.price
                    }
                }
            ).then((response) => {
                resolve(response);
            }).catch((err) => {
                reject(err);
            });
        });
    },
    updateProductImage: (proId, imagePath) => {
        const objectId = new ObjectId(proId);
        return db.getDB().collection('products').updateOne(
          { _id: objectId },
          { $set: { image: imagePath } }
        );
      },
      getAllOrders: async () => {
        try {
          const orders = await db.getDB().collection('orders').aggregate([
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
