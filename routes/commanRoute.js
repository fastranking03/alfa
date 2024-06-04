import express from "express";
import connect from "../db/connect.js"; // Adjust the path as necessary
import slugify from "slugify";

const router = express.Router();

router.get("/", async (req, res) => {
  const user = req.session.user;

  try {
    // Query categories from the database
    const [categories] = await connect.query("SELECT * FROM category");

      // Retrieve cart and wishlist counts from the request object
      const cartCount = req.cartCount || 0;
      const wishlistCount = req.wishlistCount || 0;
  

    // Render the index view with user and categories data
    res.render("index", { user: user, categories: categories  , cartCount, wishlistCount });
  } catch (err) {
    // If there's an error fetching categories, log the error and redirect
    console.error("Error fetching categories:", err);
    res.redirect("/");
  }
});

router.get("/about", (req, res) => {
  const user = req.session.user;
  res.render("about", { user });
});

// Route for the product page
router.get('/product', (req, res) => {

  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;

  const user = req.session.user;
  res.render('product', { user , cartCount, wishlistCount });
});

router.get('/product-detail', (req, res) => {
  const user = req.session.user;
  res.render('product-detail', { user });
});

export default router;
