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

router.get('/blogs',(req,res) =>{
  const user = req.session.user;
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render('blogs',{user,cartCount,wishlistCount});
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
        } else {
          if (wearType === "top" && !size.startsWith("size_")) {
            sizes[size.replace("_", " ")] = value;
          } else if (wearType === "bottom" && size.startsWith("size_")) {
            sizes[size.replace("_", " ")] = value;
          }
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
      wearType,
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

//
router.post("/checkout", async (req, res) => {
  try {
    const user = req.session.user;
    const cartCount = req.cartCount || 0;
    const wishlistCount = req.wishlistCount || 0;
    const userId = req.session.user.id;

    // Retrieve form inputs from req.body
    const { product_id, product_name, category, sub_category, selectedSize } =
      req.body;

    const sql = "SELECT * FROM user_address WHERE user_id = ?";

    // Execute the query with the user ID as a parameter
    const [addresses] = await connect.query(sql, [userId]);

    const [productRows] = await connect.query(
      "SELECT product_price, discount_on_product, product_main_image FROM products WHERE id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const { product_price, discount_on_product, product_main_image } =
      productRows[0];

    // Calculate the price after applying the discount
    const finalPrice_after_discount = (
      product_price *
      (1 - discount_on_product / 100)
    ).toFixed(2);

    const discountAmount = product_price * (discount_on_product / 100);

    // Calculate the VAT amount
    const vatAmount = (finalPrice_after_discount * (20 / 100)).toFixed(2);

    // Define the delivery charge
    const delivery_charge = 10;

    // Calculate the final price after adding VAT and delivery charge
    const finalPriceAfterVAT = (
      parseFloat(finalPrice_after_discount) +
      parseFloat(vatAmount) +
      delivery_charge
    ).toFixed(2);
    // Now you can use these variables as needed, for example, to render the checkout page
    res.render("checkout", {
      addresses,
      cartCount,
      wishlistCount,
      user,
      product_id,
      product_name,
      product_main_image,
      finalPrice_after_discount,
      discountAmount,
      discount_on_product,
      product_price,
      vatAmount,
      delivery_charge,
      finalPriceAfterVAT,
      category,
      sub_category,
      selectedSize,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/cart", async (req, res) => { // Mark the route callback as async
  try {
    const user = req.session.user;
    const cartCount = req.cartCount || 0;
    const wishlistCount = req.wishlistCount || 0;

    const userId = user.id; // Assuming user ID is available in the session

    // Fetch cart items from the database
    const [cartItems] = await connect.query(
      `SELECT c.*, p.* 
      FROM users_cart c
      INNER JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?`,
      [userId]
    );

    res.render("my-cart", { cartCount, wishlistCount, user, cartItems }); // Pass cartItems to the view
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/submit-address", async (req, res) => {
  try {
    const {
      userid,
      name,
      phone,
      alt_phone,
      email,
      address_title,
      address,
      city,
      postcode,
      country,
      checkbox,
      radio1,
    } = req.body;

    // Convert checkbox value to 1 if checked, 0 otherwise
    const sameAsDelivery = checkbox === "on" ? 1 : 0;

    // Your SQL query to insert the data
    const sql = `INSERT INTO user_address (user_id, name, phone, alt_phone , email, address_title, full_address, city, postal_code , country , billing_info_same_as_delivery_address	, billing_type   ) 
                   VALUES (?, ?, ?, ?, ? ,?, ?, ?, ?, ?, ?, ?)`;

    // Execute the query with prepared statement
    await connect.query(sql, [
      userid,
      name,
      phone,
      alt_phone,
      email,
      address_title,
      address,
      city,
      postcode,
      country,
      sameAsDelivery,
      radio1,
    ]);

    // Redirect to the previous page or any other page
    res.redirect("back");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.get("/add-address", (req, res) => {
  const user = req.session.user;
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;

  res.render("add-address", { user, cartCount, wishlistCount });
});

router.get("/my-wishlist", (req, res) => {
  const user = req.session.user;
  res.render("my-wishlist", { user });
});

router.get("/order-confirm", (req, res) => {
  const user = req.session.user;
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render("order-confirm", { user, cartCount, wishlistCount });
});
// Route to handle the form submission and insert data into the orders table

router.post("/order-confirm", async (req, res) => {
  try {
    const user = req.session.user;

    const cartCount = req.cartCount || 0;
    const wishlistCount = req.wishlistCount || 0;

    if (!user || !user.id) {
      return res.status(401).send("User not authenticated");
    }

    const userId = user.id; // Access user ID from the session
    const email = user.email;

    // Get the form data from the request body
    const {
      product_id,
      address_id,
      product_name,
      selected_size,
      category,
      sub_category,
      product_price,
      discount_on_product,
      discount_amount,
      vat,
      delivery,
      total_payable,
    } = req.body;

    // Generate the next order ID
    const [lastOrderRow] = await connect.query(
      "SELECT order_id FROM user_orders ORDER BY order_id DESC LIMIT 1"
    );

    let newOrderId = "ALOI000001";
    if (lastOrderRow.length > 0) {
      const lastOrderId = lastOrderRow[0].order_id;
      const lastOrderNumber = parseInt(lastOrderId.slice(4));
      const nextOrderNumber = lastOrderNumber + 1;
      newOrderId = "ALOI" + nextOrderNumber.toString().padStart(6, "0");
    }

    const [productRows] = await connect.query(
      "SELECT product_main_image FROM products WHERE id = ?",
      [product_id]
    );

    const { product_main_image } = productRows[0];

    // Insert the new order into the database
    const query = `
      INSERT INTO user_orders 
      (order_id, user_id, address_id, product_id, product_name, selected_size, category, sub_category, product_price, discount_on_product, discount_amount, vat, delivery_charges, total_payable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      newOrderId,
      userId,
      address_id,
      product_id,
      product_name,
      selected_size,
      category,
      sub_category,
      product_price,
      discount_on_product,
      discount_amount,
      vat,
      delivery,
      total_payable,
    ];

    await connect.query(query, values);

    const [addressRows] = await connect.query(
      "SELECT * FROM user_address WHERE id = ?",
      [address_id]
    );

    if (addressRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const address = addressRows[0];

    const timestamp = new Date();
    const order_time = timestamp.toLocaleString("en-GB", { timeZone: "UTC" });

    // Redirect to the order confirmation page
    res.render("order-confirm", {
      user,
      cartCount,
      wishlistCount,
      email,
      address,
      product_id,
      product_name,
      selected_size,
      product_price,
      discount_on_product,
      discount_amount,
      vat,
      delivery,
      total_payable,
      product_main_image,
      order_time,
    });
  } catch (error) {
    console.error("Error inserting data into orders table:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/add-to-cart", async (req, res) => {
  const user = req.session.user;

  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;

  if (!user || !user.id) {
    return res.status(401).send("User not authenticated");
  }

  const userId = user.id; // Access user ID from the session
  const email = user.email;

  try {
    const {
      product_id,
      product_name,
      selectedSize,
      finalPrice_after_discount,
      discount_on_product,
      actual_mrp_price,
      category,
      sub_category,
    } = req.body;

    const checkQuery =
      "SELECT * FROM users_cart WHERE user_id = ? AND product_id = ?";
    const [existingProduct] = await connect.query(checkQuery, [
      userId,
      product_id,
    ]);
    if (existingProduct.length > 0) {
      // Send a JSON response indicating that the product already exists in the cart
    } else {
      const insertQuery =
        "INSERT INTO users_cart (user_id, product_id , selected_size) VALUES (?, ? , ?)";
      await connect.query(insertQuery, [userId, product_id, selectedSize]);
    }
 
    res.redirect('/cart' );
    // Process the data, such as saving it to the cart database or session
    // For demonstration purposes, we'll just log the data
    console.log("Product ID:", product_id);
    console.log("Product Name:", product_name);
    console.log("Final Price after Discount:", finalPrice_after_discount);
    console.log("Discount on Product:", discount_on_product);
    console.log("Actual MRP Price:", actual_mrp_price);
    console.log("Category:", category);
    console.log("Sub Category:", sub_category);
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).send("Error adding product to cart");
  }
});

router.get("/about-us", (req, res) => {
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  const user = req.session.user;
  res.render("about-us", { user, cartCount, wishlistCount });
});

router.get("/contact-us", (req, res) => {
  const user = req.session.user;
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render("contact-us", { user, cartCount, wishlistCount });
});
export default router;
