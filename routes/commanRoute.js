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
    res.render("index", {
      user: user,
      categories: categories,
      cartCount,
      wishlistCount,
    });
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

router.get("/product", async (req, res) => {
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  const user = req.session.user;

  const query = `
    SELECT *
    FROM 
        products p
    JOIN 
        category c ON p.category_id = c.id
    JOIN 
    sub_category sc ON p.subcategory_id = sc.id;
  `;

  try {
    const [results] = await connect.query(query);
    res.render("product", {
      user,
      cartCount,
      wishlistCount,
      products: results,
    });
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/product-detail", (req, res) => {
  
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  const user = req.session.user;
  res.render("product-detail", {  cartCount,
    wishlistCount,user });
});

router.get("/checkout", (req, res) => {
  const user = req.session.user;
  
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;

  res.render("checkout", {cartCount,
    wishlistCount, user });
});

router.get("/cart", (req, res) => {
  const user = req.session.user;
  
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render("cart", {cartCount,
    wishlistCount, user });
});

router.get("/add-address", (req, res) => {
  const user = req.session.user;
  res.render("add-address", { user });
});

export default router;
