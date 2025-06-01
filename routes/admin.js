const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const productHelper = require('../helpers/product-helpers');
const userHelpers = require('../helpers/users-helpers');

/* Admin logout (still kept for completeness) */
router.get('/logout', (req, res) => {
  req.session.adminLoggedIn = false;
  res.send('✅ Admin logged out');
});

/* Admin dashboard - View Products */
router.get('/', async (req, res) => {
  try {
    const products = await productHelper.getAllProducts();
    res.render('admin/view-products', {
      admin: true,
      products,
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).send('Server error');
  }
});

/* Add product page */
router.get('/add-product', (req, res) => {
  res.render('admin/add-product', { admin: true });
});

/* Add product post */
router.post('/add-product', (req, res) => {
  const userData = req.body;
  productHelper.addProduct(userData, (id) => {
    if (req.files && req.files.image) {
      const image = req.files.image;
      const imagePath = path.join(__dirname, '../public/images/product-images', `${id}.png`);

      fs.mkdirSync(path.dirname(imagePath), { recursive: true });
      image.mv(imagePath, (err) => {
        if (err) {
          console.error('❌ Image upload error:', err);
        } else {
          console.log('✅ Image uploaded successfully');
        }
        res.redirect('/admin');
      });
    } else {
      res.redirect('/admin');
    }
  });
});

/* Delete product */
router.get('/delete-product/:id', async (req, res) => {
  try {
    const proId = req.params.id;
    await productHelper.deletePRoduct(proId);
    res.redirect('/admin');
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).send('Server error');
  }
});

/* Edit product page */
router.get('/edit-product/:id', async (req, res) => {
  try {
    const product = await productHelper.getProductDetails(req.params.id);
    res.render('admin/edit-product', { admin: true, product });
  } catch (error) {
    console.error('❌ Error fetching product for edit:', error);
    res.status(500).send('Server error');
  }
});

/* Edit product post */
router.post('/edit-product/:id', (req, res) => {
  const id = req.params.id;
  productHelper.updateProduct(id, req.body).then(async () => {
    if (req.files && req.files.image) {
      const image = req.files.image;
      const imagePath = path.join(__dirname, '../public/images/product-images', `${id}.png`);

      image.mv(imagePath, async (err) => {
        if (err) {
          console.error('❌ Image upload error:', err);
          return res.redirect('/admin');
        }

        await productHelper.updateProductImage(id, `images/product-images/${id}.png`);
        console.log('✅ Image uploaded and product updated');
        res.redirect('/admin');
      });
    } else {
      res.redirect('/admin');
    }
  }).catch((err) => {
    console.error('❌ Error updating product:', err);
    res.status(500).send('Server error');
  });
});

module.exports = router;
