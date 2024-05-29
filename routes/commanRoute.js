import express from 'express';
import pool from '../db/connect.js';  // Adjust the path as necessary
import slugify from 'slugify';

const router = express.Router();

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

router.get('/about', (req, res) => {
  const user = req.session.user;
  res.render('about', { user });
});

export default router;
