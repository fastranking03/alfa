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

  const queryProduct = `
  SELECT  * 
  FROM products ; 
`;

  const querycategoryList = " SELECT * FROM category ";

  try {
    const [results] = await connect.query(queryProduct);
    const [categories] = await connect.query(querycategoryList);

    res.render("product", {
      user,
      cartCount,
      wishlistCount,
      products: results,
      categories: categories,
    });
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/product-detail/:id", async (req, res) => {
  try {
    const cartCount = req.cartCount || 0;
    const wishlistCount = req.wishlistCount || 0;
    const user = req.session.user;
    const productId = req.params.id;

    const [rows] = await connect.query(
      `SELECT 
          p.*,
          c.id AS category_id,
          c.category_name,
          s.id AS subcategory_id,
          s.sub_category_name
       FROM products p
       INNER JOIN category c ON p.category_id = c.id 
       INNER JOIN sub_category s ON p.subcategory_id = s.id 
       WHERE p.id = ?`,
      [productId]
    );

    if (rows.length === 0) {
      return res.status(404).send("Product not found");
    }

    const product = rows[0];

    const [product_images] = await connect.query(
      "SELECT * FROM Product_Images WHERE product_id = ?",
      [productId]
    );

    res.render("product-detail", { cartCount, wishlistCount, user, product ,product_images });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/checkout", (req, res) => {
  const user = req.session.user;

  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;

  res.render("checkout", { cartCount, wishlistCount, user });
});

router.get("/cart", (req, res) => {
  const user = req.session.user;

  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render("cart", { cartCount, wishlistCount, user });
});

router.get("/add-address", (req, res) => {
  const user = req.session.user;
  res.render("add-address", { user });
});

export default router;
