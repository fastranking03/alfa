import express from 'express';
import pool from '../db/connect.js';  // Adjust the path as necessary
import slugify from 'slugify';

const router = express.Router();

// Route for the home page with categories and user data
router.get('/', async (req, res) => {
  const user = req.session.user;

  try {
    // Query categories from the database
    const [categories] = await pool.query('SELECT * FROM category');

    // Generate slugs for each category
    categories.forEach((category) => {
      category.slug = slugify(category.category_name, { lower: true });
    });

    // Render the index view with user and categories data
    res.render('index', { user: user, categories: categories });
  } catch (err) {
    // If there's an error fetching categories, log the error and redirect
    console.error('Error fetching categories:', err);
    res.redirect('/');
  }
});

// Route for the about page
router.get('/about-us', (req, res) => {
  const user = req.session.user;
  res.render('about-us', { user });
});

// Route for the product page
router.get('/product', (req, res) => {
  const user = req.session.user;
  res.render('product', { user });
});

router.get('/product-detail', (req, res) => {
  const user = req.session.user;
  res.render('product-detail', { user });
});

router.get('/checkout', (req, res) => {
  const user = req.session.user;
  res.render('checkout', { user });
});

router.get('/my-cart', (req, res) => {
  const user = req.session.user;
  res.render('my-cart', { user });
});

router.get('/add-address', (req, res) => {
  const user = req.session.user;
  res.render('add-address', { user });
});

router.get('/my-wishlist', (req, res) => {
  const user = req.session.user;
  res.render('my-wishlist', { user });
});

router.get('/order-confirm',(req,res) =>{
  const user = req.session.user;
  res.render('order-confirm',{user});
})


router.get('/contact-us',(req,res) =>{
  const user = req.session.user;
  res.render('contact-us',{user});
})
export default router;
