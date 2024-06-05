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

// router.get("/product-detail/:id", async (req, res) => {
//   try {
//     const cartCount = req.cartCount || 0;
//     const wishlistCount = req.wishlistCount || 0;
//     const user = req.session.user;
//     const productId = req.params.id;
//     const [productRows] = await connect.query(
//       "SELECT wear_type_bottom_or_top FROM products WHERE id = ?",
//       [productId]
//     );
//     if (productRows.length === 0) {
//       return 0; // Product not found
//     }

//     const wearType = productRows[0].wear_type_bottom_or_top;
//     let sizeQuery;
//     if (wearType === "top") {
//       sizeQuery = `
//         SELECT 
//           xs, s, m, l, xl, xxl, xxxl, xxxxl
//         FROM 
//           topwear_inventory 
//         WHERE 
//           product_id = ?`;
//       [sizeRows] = await connection.query(sizeQuery, [productId]);
//     } else if (wearType === "bottom") {
//       sizeQuery = `
//         SELECT 
//           size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46
//         FROM 
//           bottomwear_inventory 
//         WHERE 
//           product_id = ?`;
//       [sizeRows] = await connection.query(sizeQuery, [productId]);
//     }

//     if (sizeRows.length === 0) {
//       return { sizes: null }; // Product ID not found in inventory
//     }

//     const sizes = {};
//     for (const [size, value] of Object.entries(sizeRows[0])) {
//       if (value) {
//         sizes[size.replace("_", " ")] = value;
//       }
//     }

//     const [rows] = await connect.query(
//       `SELECT 
//           p.*,
//           c.id AS category_id,
//           c.category_name,
//           s.id AS subcategory_id,
//           s.sub_category_name
//        FROM products p
//        INNER JOIN category c ON p.category_id = c.id 
//        INNER JOIN sub_category s ON p.subcategory_id = s.id 
//        WHERE p.id = ?`,
//       [productId]
//     );

//     if (rows.length === 0) {
//       return res.status(404).send("Product not found");
//     }

//     const product = rows[0];

//     const [product_images] = await connect.query(
//       "SELECT * FROM Product_Images WHERE product_id = ?",
//       [productId]
//     );

//     res.render("product-detail", {
//       cartCount,
//       wishlistCount,
//       user,
//       product,
//       product_images,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// });

router.get("/product-detail/:id", async (req, res) => {
  try {
    const cartCount = req.cartCount || 0;
    const wishlistCount = req.wishlistCount || 0;
    const user = req.session.user;
    const productId = req.params.id;

    // Fetch wear type of the product
    const [productRows] = await connect.query(
      "SELECT wear_type_bottom_or_top FROM products WHERE id = ?",
      [productId]
    );
    if (productRows.length === 0) {
      return res.status(404).send("Product not found");
    }
    const wearType = productRows[0].wear_type_bottom_or_top;

    // Fetch sizes based on wear type
    let sizeQuery, sizeRows;
    if (wearType === "top") {
      sizeQuery = `SELECT xs, s, m, l, xl, xxl, xxxl, xxxxl FROM topwear_inventory_with_sizes WHERE product_id = ?`;
    } else if (wearType === "bottom") {
      sizeQuery = `SELECT size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46 FROM bottom_wear_inventory_with_sizes WHERE product_id = ?`;
    }
    if (sizeQuery) {
      [sizeRows] = await connect.query(sizeQuery, [productId]);
    }
    const sizes = {};
    if (sizeRows && sizeRows.length > 0) {
      for (const [size, value] of Object.entries(sizeRows[0])) {
        if (value) {
          sizes[size.replace("_", " ")] = value;
        }
      }
    }

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

    // Render product detail page
    res.render("product-detail", {
      cartCount,
      wishlistCount,
      user,
      product,
      product_images,
      sizes,
    });
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


router.get('/cart', (req, res) => {
  const user = req.session.user;
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render("cart", { cartCount, wishlistCount, user });
});

router.get("/add-address", (req, res) => {
  const user = req.session.user;
  res.render("add-address", { user });
});

router.get('/my-wishlist', (req, res) => {
  const user = req.session.user;
  res.render('my-wishlist', { user });
});

router.get('/order-confirm',(req,res) =>{
  const user = req.session.user;
  res.render('order-confirm',{user});
})

router.get('/about-us', (req, res) => {
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  const user = req.session.user;
  res.render('about-us', { user,cartCount,wishlistCount });
});

router.get('/contact-us',(req,res) =>{
  const user = req.session.user;
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render('contact-us',{user,cartCount,wishlistCount});
})
export default router;
