import express from "express";
import connect from "../db/connect.js"; // Adjust the path as necessary
import slugify from "slugify";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Query categories from the database
    const [categories] = await connect.query("SELECT * FROM category");

    if (req.session.user) {
      // Check if the user is logged in
      const user = req.session.user;
      const userId = user ? user.id : null;

      // Initialize cartCount and wishlistCount
      let cartCount;
      let wishlistCount;

      // If the user is logged in, fetch cart and wishlist counts
      if (userId) {
        const [cartResult] = await connect.query(
          "SELECT COUNT(*) AS cart_count FROM users_cart WHERE user_id = ?",
          [userId]
        );
        const [wishlistResult] = await connect.query(
          "SELECT COUNT(*) AS wishlist_count FROM users_favorites WHERE user_id = ?",
          [userId]
        );

        cartCount = cartResult[0].cart_count;
        wishlistCount = wishlistResult[0].wishlist_count;

        // Update session variables
        req.session.cartCount = cartCount;
        req.session.wishlistCount = wishlistCount;
      }
      res.render("index", {
        user: user,
        categories: categories,
      });
    } else {
      res.render("index", {
        categories: categories,
      });
    }

    // Render the index view with user and categories data
  } catch (err) {
    // Render an error page or send an error response
    console.error("Error fetching categories:", err);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
});

// Route for the product page

router.post("/place-order", async (req, res) => {
  const user = req.session.user;
  const userId = user ? user.id : null;
  if (!user) {
    return res.redirect("/login"); // Redirect to the login page if the user is not logged in
  }
  const { products, subtotal, gst, deliveryFee, totalCost, address_id } =
    req.body;

  try {
    // Generate new order ID
    const [lastOrderRow] = await connect.query(
      "SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1"
    );
    let newOrderId = "ALOI000001";
    if (lastOrderRow.length > 0) {
      const lastOrderId = lastOrderRow[0].order_id;
      const lastOrderNumber = parseInt(lastOrderId.slice(4));
      const nextOrderNumber = lastOrderNumber + 1;
      newOrderId = "ALOI" + nextOrderNumber.toString().padStart(6, "0");
    }

    // Insert new order
    await connect.query(
      "INSERT INTO orders (order_id, user_id, total_payable, vat,  delivery_charges, amount_without_vat , address_id) VALUES (?, ?, ?, ?, ?, ? , ?)",
      [newOrderId, userId, totalCost, gst, deliveryFee, subtotal, address_id]
    );

    // Insert order items
    for (const product of products) {
      await connect.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)",
        [
          newOrderId,
          product.productId,
          product.quantity,
          product.price,
          product.size,
        ]
      );
    }

    const [orderDetails] = await connect.query(
      `SELECT o.*, a.name, a.email, a.phone, a.address_title , a.full_address 
       FROM orders o
       JOIN user_address a ON o.address_id = a.id
       WHERE o.order_id = ?`,
      [newOrderId]
    );

    // const [orderItems] = await connection.query(
    //   "SELECT * FROM order_items WHERE order_id = ?",
    //   [newOrderId]
    // );

    const [orderItems] = await connect.query(
      `SELECT oi.*, p.product_name, p.product_title , p.product_description, p.product_main_image
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [newOrderId]
    );

    const adresssql = "SELECT * FROM user_address WHERE user_id = ?";

    // Execute the query with the user ID as a parameter
    const [addresses] = await connect.query(adresssql, [userId]);

    // Render the order confirmation page with order details
    res.render("order-confirm", {
      orderDetails: orderDetails[0],
      orderItems,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to place order");
  }
});

router.get("/product", async (req, res) => {
  const user = req.session.user;
  const queryProduct = `
  SELECT  * 
  FROM products ; 
`;

  const querycategoryList = `
SELECT c.*, COUNT(p.id) AS product_count
FROM category c
LEFT JOIN products p ON c.id = p.category_id 
GROUP BY c.id;
`;
  try {
    const [results] = await connect.query(queryProduct);
    const [categories] = await connect.query(querycategoryList);

    res.render("product", {
      user,
      products: results,
      categories: categories,
    });
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/blogs", async (req, res) => {
  try {
    const user = req.session.user;

    // Fetch blogs from the database
    const [blogs] = await connect.query("SELECT * FROM blogs");

    // Render the blogs page and pass the user and blogs data to the template
    res.render("blogs", { user, blogs });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
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
    const user = req.session.user;
    const productId = req.params.id;

    // Fetch wear type of the product
    const [productRows] = await connect.query(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    if (productRows.length === 0) {
      return res.status(404).send("Product not found");
    }
    const wearType = productRows[0].wear_type_bottom_or_top;
    const product_varient_name = productRows[0].varient_name;

    const queryVariantProducts = `
    SELECT * 
    FROM products 
    WHERE varient_name = ?;
`;

    const [variantProducts] = await connect.query(queryVariantProducts, [
      product_varient_name,
    ]);

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
      user,
      product,
      product_images,
      sizes,
      wearType,
      variantProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/checkout", (req, res) => {
  const user = req.session.user;
  res.render("checkout", { user });
});

//
router.post("/checkout", async (req, res) => {
  try {
    const user = req.session.user;
    // const cartCount = req.cartCount || 0;
    // const wishlistCount = req.wishlistCount || 0;
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

router.get("/cart", async (req, res) => {
  try {
    const user = req.session.user;

    if (!user || !user.id) {
      // User is not logged in, retrieve cart items from the session
      const cartItems = req.session.cart || [];

      const promises = cartItems.map((cartItem) =>
        connect
          .query(`SELECT * FROM products WHERE id = ?`, [cartItem.product_id])
          .then(([product]) => ({
            ...cartItem,
            product_name: product[0].product_name,
            product_main_image: product[0].product_main_image,
            product_price: product[0].product_price,
            discount_on_product: product[0].discount_on_product,
          }))
      );

      const resolvedCartItems = await Promise.all(promises);
      let addresses;
      res.render("my-cart", { user, cartItems: resolvedCartItems, addresses });
    } else {
      const userId = user.id;

      const [cartResult] = await connect.query(
        "SELECT COUNT(*) AS cart_count FROM users_cart WHERE user_id = ?",
        [userId]
      );
      const [wishlistResult] = await connect.query(
        "SELECT COUNT(*) AS wishlist_count FROM users_favorites WHERE user_id = ?",
        [userId]
      );

      const sql = "SELECT * FROM user_address WHERE user_id = ?";

      // Execute the query with the user ID as a parameter
      const [addresses] = await connect.query(sql, [userId]);

      const cartCount = cartResult[0].cart_count;
      const wishlistCount = wishlistResult[0].wishlist_count;

      req.session.cartCount = cartCount;
      req.session.wishlistCount = wishlistCount;

      const [cartResultAll] = await connect.query(
        `SELECT c.*, p.*, p.wear_type_bottom_or_top
        FROM users_cart c
        INNER JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?`,
        [userId]
      );

      const cartItemPromises = cartResultAll.map(async (cartItem) => {
        let sizes = {};
        if (cartItem.wear_type_bottom_or_top === "top") {
          const [sizeRows] = await connect.query(
            `SELECT xs, s, m, l, xl, xxl, xxxl, xxxxl 
             FROM topwear_inventory_with_sizes 
             WHERE product_id = ?`,
            [cartItem.product_id]
          );
          sizes = sizeRows[0];
        } else if (cartItem.wear_type_bottom_or_top === "bottom") {
          const [sizeRows] = await connect.query(
            `SELECT size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46 
             FROM bottom_wear_inventory_with_sizes 
             WHERE product_id = ?`,
            [cartItem.product_id]
          );
          sizes = sizeRows[0];
        }
        return {
          ...cartItem,
          sizes: sizes
        };
      });

      const cartItems = await Promise.all(cartItemPromises);

      // Calculate totals for items in stock
      let totalPrice = 0;
      let totalDiscount = 0;
      let inStockItemCount = 0;

      cartItems.forEach((item) => {
        const price = parseFloat(item.product_price);
        const discount = parseFloat(item.discount_on_product) || 0;
        const quantity = parseInt(item.quantity);
        // Check stock availability
        const stock = item.sizes ;
        if (stock  ) { // Ensure the stock is available
          totalPrice += price * quantity;
          totalDiscount += (price * discount) / 100;
          inStockItemCount++;
        }
      });

      const GST = totalPrice * 0.2;
      const deliveryFee = 25;
      const totalCost = totalPrice + GST + deliveryFee - totalDiscount;

      res.render("my-cart", {
        user,
        cartItems,
        addresses,
        totalPrice,
        totalDiscount,
        GST,
        deliveryFee,
        totalCost,
      });
    }
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/update-quantity", async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user.id;

  try {
    // Update quantity in the database
    const updateQuery = `
          UPDATE users_cart
          SET quantity = ?
          WHERE user_id = ? AND product_id = ?
      `;
    await connect.query(updateQuery, [quantity, userId, productId]);

  //  *******************************************
  const [cartResultAll] = await connect.query(
    `SELECT c.*, p.*, p.wear_type_bottom_or_top
    FROM users_cart c
    INNER JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?`,
    [userId]
  );

  const cartItemPromises = cartResultAll.map(async (cartItem) => {
    let sizes = {};
    if (cartItem.wear_type_bottom_or_top === "top") {
      const [sizeRows] = await connect.query(
        `SELECT xs, s, m, l, xl, xxl, xxxl, xxxxl 
         FROM topwear_inventory_with_sizes 
         WHERE product_id = ?`,
        [cartItem.product_id]
      );
      sizes = sizeRows[0];
    } else if (cartItem.wear_type_bottom_or_top === "bottom") {
      const [sizeRows] = await connect.query(
        `SELECT size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46 
         FROM bottom_wear_inventory_with_sizes 
         WHERE product_id = ?`,
        [cartItem.product_id]
      );
      sizes = sizeRows[0];
    }
    return {
      ...cartItem,
      sizes: sizes
    };
  });

  const cartItems = await Promise.all(cartItemPromises);

  // Calculate totals for items in stock
  let totalPrice = 0;
  let totalDiscount = 0;
  let inStockItemCount = 0;

  cartItems.forEach((item) => {
    const price = parseFloat(item.product_price);
    const discount = parseFloat(item.discount_on_product) || 0;
    const quantity = parseInt(item.quantity);
    // Check stock availability
    const stock = item.sizes ;
    if (stock  ) { // Ensure the stock is available
      totalPrice += price * quantity;
      totalDiscount += (price * discount) / 100;
      inStockItemCount++;
    }
  });

  const GST = totalPrice * 0.2;
  const deliveryFee = 25;
  const totalCost = totalPrice + GST + deliveryFee - totalDiscount;

    // *******************************************

     
    
    console.log(
      `Quantity updated successfully for product ${productId} to ${quantity}`
    );

    // Send response with updated totals
    res.status(200).json({
      message: "Quantity updated successfully",
      totalPrice: totalPrice,
      totalDiscount: totalDiscount,
      GST: GST,
      deliveryFee: deliveryFee,
      totalCost: totalCost,
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    res.status(500).json({ error: "Failed to update quantity" });
  }
});
//

router.post("/update-product-size", async (req, res) => {
  try {
    const { productId, newSize, oldSize } = req.body;
    const user = req.session.user;

    // console.log(newSize);
    // console.log(oldSize);

    if (!user || !user.id) {
      // User is not logged in, update size in session cart
      const cartItems = req.session.cart || [];
      const cartItem = cartItems.find((item) => item.product_id === productId);
      if (cartItem) {
        cartItem.selected_size = newSize;
      }
      req.session.cart = cartItems;
    } else {
      // User is logged in, update size in the database
      await connect.query(
        "UPDATE users_cart SET selected_size = ? WHERE user_id = ? AND product_id = ?",
        [newSize, user.id, productId]
      );
    }

    res
      .status(200)
      .send({ message: "Size updated successfully", old_size: oldSize });
  } catch (error) {
    console.error("Error updating size:", error);
    res.status(500).send("Internal Server Error");
  }
});

//

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

  res.render("add-address", { user });
});

// router.get("/my-wishlist", (req, res) => {
//   const user = req.session.user;
//   res.render("my-wishlist", { user });
// });
router.get("/my-wishlist", async (req, res) => {
  const user = req.session.user;

  if (!user) {
    // Redirect to login page if user is not logged in
    return res.redirect("/login");
  } else {
    try {
      // Query to get the user's favorite products
      const getUserFavoritesQuery = `
        SELECT uf.*, p.*
        FROM users_favorites uf
        INNER JOIN products p ON uf.product_id = p.id
        WHERE uf.user_id = ?
      `;
      const [wishlistItems] = await connect.query(getUserFavoritesQuery, [user.id]);

      // Fetch sizes for each product
      const wishlistItemPromises = wishlistItems.map(async (item) => {
        let sizes = {};
        if (item.wear_type_bottom_or_top === 'top') {
          const [sizeRows] = await connect.query(
            `SELECT xs, s, m, l, xl, xxl, xxxl, xxxxl 
             FROM topwear_inventory_with_sizes 
             WHERE product_id = ?`,
            [item.product_id]
          );
          sizes = sizeRows[0];
        } else if (item.wear_type_bottom_or_top === 'bottom') {
          const [sizeRows] = await connect.query(
            `SELECT size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46 
             FROM bottom_wear_inventory_with_sizes 
             WHERE product_id = ?`,
            [item.product_id]
          );
          sizes = sizeRows[0];
        }
        return {
          ...item,
          sizes: sizes
        };
      });

      const resolvedWishlistItems = await Promise.all(wishlistItemPromises);

      // Render the my-wishlist page with the user's favorite products
      return res.render("my-wishlist", { user, wishlistItems: resolvedWishlistItems });
    } catch (error) {
      console.error("Error fetching wishlist items:", error);
      return res.render("error", { message: "Error fetching wishlist items" });
    }
  }
});


router.get("/order-confirm", (req, res) => {
  const user = req.session.user;
  res.render("order-confirm", { user });
});
// Route to handle the form submission and insert data into the orders table

router.post("/order-confirm", async (req, res) => {
  try {
    const user = req.session.user;

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

  const { product_id, selectedSize, product_quantity } = req.body;
  var selected_size = selectedSize;
  var quantity = product_quantity;
  const cartItem = { product_id, selected_size, quantity };

  if (!user || !user.id) {
    // return res.status(401).send("User not authenticated");

    req.session.cart = req.session.cart || [];

    req.session.cart.push(cartItem);
    req.session.cartCount = req.session.cart.length;

    res.redirect("/cart");
  } else {
    const userId = user.id; // Access user ID from the session
    const email = user.email;

    try {
      const {
        product_id,
        product_name,
        selectedSize,
        product_quantity,
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
          "INSERT INTO users_cart (user_id, product_id , selected_size , quantity) VALUES (?, ? , ? , ?)";
        await connect.query(insertQuery, [
          userId,
          product_id,
          selectedSize,
          product_quantity,
        ]);
      }
      res.redirect("/cart");
    } catch (error) {
      console.error("Error adding product to cart:", error);
      res.status(500).send("Error adding product to cart");
    }
  }
});

router.get("/delete-product/:product_id", async (req, res) => {
  try {
    const productId = req.params.product_id; // Accessing product ID from the request params
    const userId = req.session.user.id; // Assuming you have the user's ID in the session

    // Query to delete the product from the cart
    const deleteProductQuery = `
      DELETE FROM users_cart 
      WHERE user_id = ? AND product_id = ?
    `;

    // Execute the query
    await connect.query(deleteProductQuery, [userId, productId]);

    // Redirect back to the cart page after deletion
    res.redirect("/cart");
  } catch (error) {
    console.error("Error deleting product:", error);
    // Send an error status (500) without any response body
    res.sendStatus(500);
  }
});

router.get("/about-us", (req, res) => {
  const user = req.session.user;
  res.render("about-us", { user });
});

router.get("/blog-detail/:slug_name", async (req, res) => {
  try {
    const user = req.session.user;
    const slugName = req.params.slug_name;

    const [rows] = await connect.query(
      "SELECT * FROM blogs WHERE slug_name = ?",
      [slugName]
    );
    const blog = rows[0]; // Get the first item from the result set

    if (!blog) {
      return res.status(404).send("Blog not found");
    }

    res.render("blog-detail", { user, blog });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.get("/my-orders", async (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.redirect("/login");
  }

  try {
    // Fetch orders for the logged-in user in ascending order
    const [orders] = await connect.query(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY order_id ASC",
      [user.id]
    );

    // Fetch order items for each order
    const orderDetailsPromises = orders.map(async (order) => {
      const [orderItems] = await connect.query(
        `SELECT oi.*, p.product_name, p.product_main_image
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = orderItems;
      return order;
    });

    const ordersWithDetails = await Promise.all(orderDetailsPromises);

    res.render("order-history", { user, orders: ordersWithDetails });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to retrieve orders");
  }
});

router.get("/order-detail", (req, res) => {
  const user = req.session.user;
  res.render("order-detail", { user });
});
//
router.get("/contact-us", (req, res) => {
  const user = req.session.user;
  res.render("contact-us", { user });
});

export default router;
