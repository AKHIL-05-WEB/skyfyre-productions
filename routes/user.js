var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');
const userHelpers = require('../helpers/users-helpers');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/connection');

const verifyLogin = (req, res, next) => {
  console.log("🔐 Verifying login...");
  if (req.session.loggedIn) {
    console.log("✅ User is logged in");
    next();
  } else {
    console.log("🚫 Not logged in, redirecting to login...");
    res.redirect('/login');
  }
};


/* GET home page. */
router.get('/', function(req, res, next) {
  let user = req.session.user;
  console.log(user);

  productHelper.getAllProducts().then((products) => {
    res.render('user/view-products', { admin: false, products, user });
  });
});

router.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/');
  } else {
    res.render('user/login', { 'loginErr': req.session.loginErr });
    req.session.loginErr = false;
  }
});

router.get('/signup', (req, res) => {
  res.render('user/signup');
});

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      req.session.loginErr = null;  // Clear any previous login error
      res.redirect('/');
    } else {
      req.session.loginErr = true;
      res.redirect('/login');
    }
  });
});

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      console.log("✅ Logged in:", response.user)
      res.redirect('/');
    } else {
      req.session.loginErr = true;
      res.redirect('/login');
    }
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// In your route (e.g., user.js)
router.get('/cart', verifyLogin, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const cartItems = await userHelpers.getCart(userId);
    console.log("🛒 Cart items fetched:", cartItems);

    res.render('user/cart', { cartItems });
  } catch (error) {
    console.error("❌ Error fetching cart items:", error);
    res.redirect('/'); // Redirect to home on error
  }
});

// In your add-to-cart route
router.post('/add-to-cart', verifyLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming user ID is in session
    const productId = req.body.productId;
    await userHelpers.addToCart(userId, productId);

    // After adding to cart, redirect to the cart page
    res.redirect('/');
  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    res.redirect('/'); // Redirect to home on error
  }
});

router.post('/remove-from-cart', async (req, res) => {
  const userId = req.session.user._id;
  const productId = req.body.productId;

  try {
    await userHelpers.removeFromCart(userId, productId);
    res.redirect('/cart');
  } catch (err) {
    console.error("❌ Error removing item from cart:", err);
    res.redirect('/cart');
  }
});

router.post('/update-cart-quantity', async (req, res) => {
  const userId = req.session.user._id;
  const { productId, action } = req.body;

  try {
    await userHelpers.updateCartQuantity(userId, productId, action);
    res.redirect('/cart');
  } catch (err) {
    console.error("❌ Error updating cart quantity:", err);
    res.redirect('/cart');
  }
});

// Add location to the order now process
router.post('/order-now',verifyLogin, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { productId, quantity, price, location } = req.body;

    // Debug log
    console.log("🛒 Order data received:", req.body);

    // Validate required fields
    if (!productId || !quantity || !price || !location) {
      console.error("❌ Missing order data");
      return res.status(400).send("Missing required order data");
    }

    const orderData = {
      userId: new ObjectId(userId),
      products: [{
        productId: new ObjectId(productId),
        quantity: parseInt(quantity),
        price: parseFloat(price)
      }],
      totalAmount: parseFloat(price) * parseInt(quantity),
      location: location.trim(),
      status: 'Pending',
      date: new Date()
    };

    await userHelpers.placeOrder(orderData);
    res.redirect('/user-order');

  } catch (error) {
    console.error("❌ Error in /order-now:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Assuming you are using an Express route to handle user orders
router.get('/user-order', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login'); // Redirect if the user is not logged in
  }

  try {
    const userId = req.session.user._id;
    console.log("Fetching orders for user ID:", userId); // Debug log

    // Fetch orders using the updated function
    const orders = await userHelpers.getUserOrders(userId);
    console.log("Orders fetched:", orders); // Debug log
    
    res.render('user/user-order', { orders }); // Pass the orders to the view
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.render('user/user-order', { orders: [] });
  }
});


router.get('/orders', async (req, res) => {
  try {
    const allOrders = await productHelper.getAllOrders(); // New helper function
    res.render('admin/admin-order',{ admin: true, allOrders });
  } catch (err) {
    console.error("❌ Error loading orders:", err);
    res.status(500).send("Server error");
  }
});
// Add search functionality for products
router.get('/search', async (req, res) => {
  const query = req.query.q;

  try {
    const products = await productHelper.searchProducts(query);
    res.render('user/search-results', { products, query });
  } catch (err) {
    console.error("Search error:", err);
    res.render('user/search-results', { products: [], query, error: "Something went wrong" });
  }
});

// Admin search for products
router.get('/admin-search', async (req, res) => {
  const query = req.query.q;

  try {
    const products = await productHelper.searchProducts(query);
    res.render('admin/admin-search', { products, query });
  } catch (err) {
    console.error("Search error:", err);
    res.render('admin/admin-search', { products: [], query, error: "Something went wrong" });
  }
});

module.exports = router;
