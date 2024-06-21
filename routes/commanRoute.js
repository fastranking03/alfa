import express from "express";
import connect from "../db/connect.js"; // Adjust the path as necessary
import slugify from "slugify";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Query categories from the database
    const [categories] = await connect.query("SELECT * FROM category");
    const [lastProducts] = await connect.query(
      "SELECT * FROM products ORDER BY created_at DESC LIMIT 5"
    );

    const [bestSellers] = await connect.query(
      "SELECT * FROM products WHERE best_seller = 1"
    );

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
        lastProducts,
        bestSellers,
      });
    } else {
      res.render("index", {
        categories: categories,
        lastProducts,
        bestSellers,
      });
    }

    // Render the index view with user and categories data
  } catch (err) {
    // Render an error page or send an error response
    console.error("Error fetching categories:", err);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
});

router.post("/delete-from-wishlist", async (req, res) => {
  const user = req.session.user;

  try {
    if (!user) {
      return res.redirect("/login");
    } else {
      const productId = req.body.product_id;

      const deleteQuery =
        "DELETE FROM users_favorites WHERE product_id = ? AND user_id = ?";
      const [deleteResult] = await connect.query(deleteQuery, [
        productId,
        user.id,
      ]);
      if (deleteResult.affectedRows > 0) {
        // Fetch updated favorites count
        const [[{ favoritesCount }]] = await connect.query(
          "SELECT COUNT(*) AS favoritesCount FROM users_favorites WHERE user_id = ?",
          [user.id]
        );

        // Update session variable with new favorites count
        req.session.wishlistCount = favoritesCount;

        // Respond with success message and updated favorites count
        return res.redirect(`/product-detail/${productId}`);
      }
    }
  } catch (error) {}
});

router.get("/delete-from-wishlist/:favoriteId", async (req, res) => {
  try {
    const userId = req.session.user.id; // Assuming you have user session data
    const favoriteId = req.params.favoriteId;

    // Delete the favorite item from the users_favorites table
    const deleteQuery =
      "DELETE FROM users_favorites WHERE product_id = ? AND user_id = ?";
    const [deleteResult] = await connect.query(deleteQuery, [
      favoriteId,
      userId,
    ]);

    // Check if the deletion was successful
    if (deleteResult.affectedRows > 0) {
      // Fetch updated favorites count
      const [[{ favoritesCount }]] = await connect.query(
        "SELECT COUNT(*) AS favoritesCount FROM users_favorites WHERE user_id = ?",
        [userId]
      );

      // Update session variable with new favorites count
      req.session.wishlistCount = favoritesCount;

      // Respond with success message and updated favorites count
      return res.redirect("/my-wishlist");
    }
  } catch (error) {
    console.error("Error deleting product from favorites:", error);
    res.status(500).json({ error: "Error deleting product from favorites" });
  }
});

// Route for the product page
router.post("/place-order", async (req, res) => {
  const user = req.session.user;
  const userId = user ? user.id : null;

  if (!user) {
    return res.redirect("/login"); // Redirect to the login page if the user is not logged in
  }

  const {
    cartItemscheckoutpage,
    total_mrp,
    discount_amount,
    subtotal,
    vat,
    deliveryFee,
    total_payable,
    address_id,
  } = req.body;

  try {
    // Parse cartItemscheckoutpage if passed as JSON string
    const parsedCartItems = JSON.parse(cartItemscheckoutpage);

    // Start a transaction
    await connect.query("START TRANSACTION");

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
    const insertOrderQuery = `
      INSERT INTO orders (order_id, user_id, total_payable, vat, delivery_charges, sub_total, total_mrp, discount_amount, address_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertOrderValues = [
      newOrderId,
      userId,
      parseFloat(total_payable),
      parseFloat(vat),
      parseFloat(deliveryFee),
      parseFloat(subtotal),
      parseFloat(total_mrp),
      parseFloat(discount_amount),
      parseInt(address_id),
    ];

    const [insertOrderResult] = await connect.query(
      insertOrderQuery,
      insertOrderValues
    );

    if (insertOrderResult.affectedRows !== 1) {
      throw new Error("Failed to insert into orders table");
    }

    // Insert order items only if the order insertion is successful
    for (const product of parsedCartItems) {
      const insertOrderItemQuery = `
        INSERT INTO order_items (order_id, product_id, quantity, price, size, colour) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const insertOrderItemValues = [
        newOrderId,
        product.product_id,
        product.quantity,
        parseFloat(product.product_price),
        product.selected_size,
        product.colour,
      ];
      const [insertOrderItemResult] = await connect.query(
        insertOrderItemQuery,
        insertOrderItemValues
      );

      if (insertOrderItemResult.affectedRows !== 1) {
        throw new Error("Failed to insert order item");
      }
    }

    // Commit the transaction after all queries succeed
    await connect.query("COMMIT");

    // Fetch order details and items for confirmation page
    const [orderDetails] = await connect.query(
      `SELECT o.*, a.name, a.email, a.phone, a.pincode, a.full_address 
       FROM orders o
       JOIN user_address a ON o.address_id = a.id
       WHERE o.order_id = ?`,
      [newOrderId]
    );

    const [orderItems] = await connect.query(
      `SELECT oi.*, p.product_name, p.product_title, p.product_description, p.product_main_image
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [newOrderId]
    );

    // Render the order confirmation page with order details
    res.render("order-confirm", {
      orderDetails: orderDetails[0], // Assuming orderDetails is an array and you want the first item
      orderItems,
      user,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    await connect.query("ROLLBACK"); // Rollback the transaction in case of an error
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

    let isInFavorites = false;
    if (req.session.user) {
      const [favoriteRows] = await connect.query(
        "SELECT * FROM users_favorites WHERE user_id = ? AND product_id = ?",
        [user.id, productId]
      );
      isInFavorites = favoriteRows.length > 0;
    } else {
      isInFavorites = false;
    }

    // Render product detail page
    res.render("product-detail", {
      user,
      product,
      product_images,
      sizes,
      wearType,
      variantProducts,
      isInFavorites,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// router.get("/checkout", (req, res) => {
//   const user = req.session.user;
//   res.render("checkout", { user });
// });

router.get("/checkout", async (req, res) => {
  const user = req.session.user;

  if (!user) {
    // User is not logged in, redirect to login page
    req.session.redirectTo = "/cart";
    return res.redirect("/login"); // Redirect to login with a redirect query parameter
  }

  const userId = user.id;
  try {
    // Extract pricing details from request body
    const [cartResultAll] = await connect.query(
      `SELECT c.*, c.id AS cart_id,  p.*, p.wear_type_bottom_or_top
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
        sizes: sizes,
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
      const selectedSize = item.selected_size;
      // Determine the stock for the selected size
      let stock = null;
      if (item.wear_type_bottom_or_top === "top") {
        const selectedSizeLowerCase = selectedSize.toLowerCase();
        stock = item.sizes ? item.sizes[selectedSizeLowerCase] : null;
      } else if (item.wear_type_bottom_or_top === "bottom") {
        const sizeKey = `size_${selectedSize}`;
        const sizeKeyLowerCase = sizeKey.toLowerCase();
        stock = item.sizes ? item.sizes[sizeKeyLowerCase] : null;
      }

      if (stock && stock > 0) {
        // Include in calculations only if stock is available and greater than 0
        totalPrice += price * quantity;
        totalDiscount += ((price * discount) / 100) * quantity;
        inStockItemCount++;
      }
    });

    const vatRate = 0.2; // 20% VAT rate
    const subtotal = (totalPrice - totalDiscount).toFixed(2);
    const GST = (subtotal * vatRate).toFixed(2);
    const deliveryFee = 25;
    const totalCost = (
      parseFloat(totalPrice) +
      parseFloat(GST) +
      deliveryFee -
      parseFloat(totalDiscount)
    ).toFixed(2);

    // Filter items where stock is available
   // Filter items where stock is available for the selected size
const cartItemsInStock = cartItems.filter((item) => {
  const selectedSize = item.selected_size;
  let stock = null;
  if (item.wear_type_bottom_or_top === "top") {
    const selectedSizeLowerCase = selectedSize.toLowerCase();
    stock = item.sizes ? item.sizes[selectedSizeLowerCase] : null;
  } else if (item.wear_type_bottom_or_top === "bottom") {
    const sizeKey = `size_${selectedSize}`;
    const sizeKeyLowerCase = sizeKey.toLowerCase();
    stock = item.sizes ? item.sizes[sizeKeyLowerCase] : null;
  }
  return stock && stock > 0;
});

    // Query to get user addresses
    const addressSql = "SELECT * FROM user_address WHERE user_id = ?";
    const [addresses] = await connect.query(addressSql, [userId]);

    // Count of user addresses
    const addressCount = addresses.length;

    // Render a success page or redirect to order confirmation page
    res.render("checkout", {
      totalPrice: totalPrice.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      vat:GST,
      deliveryFee: deliveryFee.toFixed(2),
      totalCost,
      subtotal,
      addresses,
      addressCount,
      cartItemsInStock,
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    res.render("error", { message: "Failed to process checkout" });
  }
});

router.get("/remove-address/:id", async (req, res) => {
  const addressId = req.params.id;
  try {
    const deleteQuery = "DELETE FROM user_address WHERE id = ?";
    await connect.query(deleteQuery, [addressId]);
    res.redirect("back"); // Redirect back to the address page or a confirmation page
  } catch (error) {
    console.error("Error removing address:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/edit-address/:id", async (req, res) => {
  const addressId = req.params.id;
  try {
    const selectQuery = "SELECT * FROM user_address WHERE id = ?";
    const [address] = await connect.query(selectQuery, [addressId]);
    res.render("add-address", { address: address[0] }); // Assuming you have an edit-address view
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/cart", async (req, res) => {
  try {
    const user = req.session.user;

    if (!user || !user.id) {
      // Guest user scenario
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
            wear_type_bottom_or_top: product[0].wear_type_bottom_or_top,
          }))
      );

      const resolvedCartItems = await Promise.all(promises);

      const cartItemPromises = resolvedCartItems.map(async (cartItem) => {
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
          sizes: sizes,
        };
      });

      const cartItemsWithSizes = await Promise.all(cartItemPromises);

      let totalPrice = 0;
      let totalDiscount = 0;
      let inStockItemCount = 0;

      cartItemsWithSizes.forEach((item) => {
        const price = parseFloat(item.product_price);
        const discount = parseFloat(item.discount_on_product) || 0;
        const quantity = parseInt(item.quantity);
        // Calculate totals for items in cart
        totalPrice += price * quantity;
        totalDiscount += ((price * discount) / 100) * quantity;
        inStockItemCount++; // For guest user, treat all items as in stock
      });

      const subtotal = totalPrice - totalDiscount;
      const GST = subtotal * 0.2;
      const deliveryFee = 25;
      const totalCost = totalPrice + GST + deliveryFee - totalDiscount;
      res.render("my-cart", {
        user,
        cartItems: cartItemsWithSizes,
        totalPrice,
        subtotal,
        totalDiscount,
        GST,
        deliveryFee,
        totalCost,
        cartItemsInStock: cartItemsWithSizes, // For guest user, all items are considered in stock
      });
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
        `SELECT c.*, c.id AS cart_id,  p.*, p.wear_type_bottom_or_top
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
          sizes: sizes,
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
        const selectedSize = item.selected_size;
        // Determine the stock for the selected size
        let stock = null;
        if (item.wear_type_bottom_or_top === "top") {
          const selectedSizeLowerCase = selectedSize.toLowerCase();
          stock = item.sizes ? item.sizes[selectedSizeLowerCase] : null;
        } else if (item.wear_type_bottom_or_top === "bottom") {
          const sizeKey = `size_${selectedSize}`;
          const sizeKeyLowerCase = sizeKey.toLowerCase();
          stock = item.sizes ? item.sizes[sizeKeyLowerCase] : null;
        }

        if (stock && stock > 0) {
          // Include in calculations only if stock is available and greater than 0
          totalPrice += price * quantity;
          totalDiscount += ((price * discount) / 100) * quantity;
          inStockItemCount++;
        }
      });

      const vatRate = 0.2; // 20% VAT rate
      const subtotal = (totalPrice - totalDiscount).toFixed(2);
      const GST = (subtotal * vatRate).toFixed(2);
      const deliveryFee = 25;
      const totalCost = (
        parseFloat(totalPrice) +
        parseFloat(GST) +
        deliveryFee -
        parseFloat(totalDiscount)
      ).toFixed(2);

      // Filter items where stock is available
      const cartItemsInStock = cartItems.filter((item) => {
        const stock = item.sizes;
        return stock && Object.values(stock).some((value) => value > 0);
      });

      res.render("my-cart", {
        user,
        cartItems,
        addresses,
        totalPrice,
        totalDiscount,
        subtotal,
        GST,
        deliveryFee,
        totalCost,
        cartItemsInStock,
      });
    }
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/update-quantity", async (req, res) => {
  const { productId, quantity , cartId  } = req.body;

  try {
    if (req.session.user && req.session.user.id) {
      // User is logged in, update quantity in the database
      const userId = req.session.user.id;
      const updateQuery = `
        UPDATE users_cart
        SET quantity = ?
        WHERE user_id = ? AND product_id = ? AND id = ?
      `;
      await connect.query(updateQuery, [quantity, userId, productId , cartId]);

      const [cartResultAll] = await connect.query(
        `SELECT c.*, c.id AS cart_id,  p.*, p.wear_type_bottom_or_top
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
          sizes: sizes,
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
        const selectedSize = item.selected_size;
        // Determine the stock for the selected size
        let stock = null;
        if (item.wear_type_bottom_or_top === "top") { 
          
          const selectedSizeLowerCase = selectedSize.toLowerCase();
          stock = item.sizes ? item.sizes[selectedSizeLowerCase] : null;
        } else if (item.wear_type_bottom_or_top === "bottom") {
          const sizeKey = `size_${selectedSize}`;
          const sizeKeyLowerCase = sizeKey.toLowerCase();
          stock = item.sizes ? item.sizes[sizeKeyLowerCase] : null;
        }

        if (stock && stock > 0) {
          // Include in calculations only if stock is available and greater than 0
          totalPrice += price * quantity;
          totalDiscount += ((price * discount) / 100) * quantity;
          inStockItemCount++;
        }
      });

      const vatRate = 0.2; // 20% VAT rate
      const subtotal = (totalPrice - totalDiscount).toFixed(2);
      const GST = (subtotal * vatRate).toFixed(2);
      const deliveryFee = 25;
      const totalCost = (
        parseFloat(totalPrice) +
        parseFloat(GST) +
        deliveryFee -
        parseFloat(totalDiscount)
      ).toFixed(2);

 
      // Send response with updated totals
      return res.status(200).json({
        message: "Quantity updated successfully",
        totalPrice: totalPrice,
        totalDiscount: totalDiscount,
        subtotal,
        GST: GST,
        deliveryFee: deliveryFee,
        totalCost: totalCost,
      });
    } else {
      // Guest user, update quantity in session cart
      const cartItems = req.session.cart || [];

      // Log productId and quantity received
      console.log("Received productId:", productId);
      console.log("Received quantity:", quantity);

      // Fetch product details for each item in the session cart
      const promises = cartItems.map((cartItem) =>
        connect
          .query("SELECT * FROM products WHERE id = ?", [cartItem.product_id])
          .then(([product]) => ({
            ...cartItem,
            product_name: product[0].product_name,
            product_main_image: product[0].product_main_image,
            product_price: parseFloat(product[0].product_price), // Ensure price is float
            discount_on_product:
              parseFloat(product[0].discount_on_product) || 0, // Ensure discount is float or default to 0
            wear_type_bottom_or_top: product[0].wear_type_bottom_or_top,
          }))
      );

      // Execute all promises concurrently
      const updatedCartItems = await Promise.all(promises);

      // Update quantity for the specified product in session cart
      const updatedCart = updatedCartItems.map((item) => {
        if (item.product_id === productId) {
          // Convert quantity to integer
          item.quantity = parseInt(quantity);
        }
        return item;
      });

      // Update session cart with modified quantities
      req.session.cart = updatedCart;

      console.log(cartItems);
      // Calculate totals after quantity update
      let totalPrice = 0;
      let totalDiscount = 0;

      updatedCart.forEach((item) => {
        const price = parseFloat(item.product_price);
        const discount = parseFloat(item.discount_on_product) || 0;
        const itemQuantity = parseInt(item.quantity); // Ensure quantity is integer
        totalPrice += price * itemQuantity;
        totalDiscount += (price * discount * itemQuantity) / 100;
      });

      console.log("Updated session cart:", updatedCart);

      // Calculate other totals with maximum two decimal places
      const subtotal = parseFloat((totalPrice - totalDiscount).toFixed(2));

      const GST = parseFloat((subtotal * 0.2).toFixed(2));
      const deliveryFee = parseFloat((25.0).toFixed(2)); // Fixed delivery fee
      const totalCost = parseFloat(
        (totalPrice + GST + deliveryFee - totalDiscount).toFixed(2)
      );

      // Send response with updated cart or totals
      return res.status(200).json({
        message: "Quantity updated successfully in session",
        totalPrice: totalPrice,
        totalDiscount: totalDiscount,
        subtotal,
        GST: GST,
        deliveryFee: deliveryFee,
        totalCost: totalCost,
      });
    }
  } catch (error) {
    console.error("Error updating quantity:", error);
    res.status(500).json({ error: "Failed to update quantity" });
  }
});

router.post("/update-product-size", async (req, res) => {
  try {
    const { productId, cartId, newSize, oldSize } = req.body;

    console.log("productId:", productId);
    console.log("cartId:", cartId);
    console.log("newSize:", newSize);
    console.log("oldSize:", oldSize);

    const user = req.session.user;

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
        "UPDATE users_cart SET selected_size = ? WHERE user_id = ? AND id = ?",
        [newSize, user.id, cartId]
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
  const {
    userid,
    address_id_exist,
    name,
    phone,
    email,
    pincode,
    address,
    locality,
    city,
    state,
    address_type,
    checkbox,
  } = req.body;

  const sameAsDelivery = checkbox === "on" ? 1 : 0;

  try {
    if (address_id_exist) {
      // Update existing address
      const updateSql = `
        UPDATE user_address 
        SET name = ?, phone = ?, email = ?, pincode = ?, full_address = ?,  locality = ?, city = ?, state =? ,  billing_info_same_as_delivery_address = ?, address_type = ?
        WHERE id = ?
      `;
      await connect.query(updateSql, [
        name,
        phone,
        email,
        pincode,
        address,
        locality,
        city,
        state,
        sameAsDelivery,
        address_type,
        address_id_exist,
      ]);
    } else {
      // Your SQL query to insert the data
      const sql = `INSERT INTO user_address (user_id, name, phone, email, pincode , full_address, locality , city, state ,  billing_info_same_as_delivery_address	,address_type ) 
                   VALUES (?, ?, ?,  ? ,?, ?, ?, ?, ?, ?, ?)`;

      // Execute the query with prepared statement
      await connect.query(sql, [
        userid,
        name,
        phone,
        email,
        pincode,
        address,
        locality,
        city,
        state,
        sameAsDelivery,
        address_type,
      ]);
    }
    // Redirect to the previous page or any other page
    res.redirect("/checkout");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.get("/add-address", (req, res) => {
  const user = req.session.user;
  const address = {};
  res.render("add-address", { user, address });
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
      const [wishlistItems] = await connect.query(getUserFavoritesQuery, [
        user.id,
      ]);

      // Fetch sizes for each product
      const wishlistItemPromises = wishlistItems.map(async (item) => {
        let sizes = {};
        if (item.wear_type_bottom_or_top === "top") {
          const [sizeRows] = await connect.query(
            `SELECT xs, s, m, l, xl, xxl, xxxl, xxxxl 
             FROM topwear_inventory_with_sizes 
             WHERE product_id = ?`,
            [item.product_id]
          );
          sizes = sizeRows[0];
        } else if (item.wear_type_bottom_or_top === "bottom") {
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
          sizes: sizes,
        };
      });

      const resolvedWishlistItems = await Promise.all(wishlistItemPromises);

      const [wishlistResult] = await connect.query(
        "SELECT COUNT(*) AS wishlist_count FROM users_favorites WHERE user_id = ?",
        [user.id]
      );

      const wishlistCount = wishlistResult[0].wishlist_count;

      req.session.wishlistCount = wishlistCount;

      // Render the my-wishlist page with the user's favorite products
      return res.render("my-wishlist", {
        user,
        wishlistItems: resolvedWishlistItems,
      });
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
      cartItemscheckoutpage,
      address_id,
      subtotal,
      discount_amount,
      vat,
      delivery_charges,
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
  const qty = parseInt(quantity);

  if (!user || !user.id) {
    // return res.status(401).send("User not authenticated");

    const cartItems = req.session.cart || [];

    const Itemincart = cartItems.find((item) => item.product_id === product_id);
    if (Itemincart) {
      Itemincart.selected_size = selectedSize;
    } else {
      // Add new item to session cart if it doesn't exist
      const cartItem = {
        cart_id: cartItems.length + 1,
        product_id,
        selected_size,
        quantity: qty,
      };
      req.session.cart.push(cartItem);
    }

    req.session.cart = cartItems;

    console.log("cartItems", cartItems);

    req.session.cartCount = req.session.cart.length;

    console.log("cartItem", req.session.cartCount);

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
        "SELECT * FROM users_cart WHERE user_id = ? AND product_id = ? AND selected_size = ?";
      const [existingProduct] = await connect.query(checkQuery, [
        userId,
        product_id,
        selectedSize,
      ]);
      if (existingProduct.length > 0) {
        if (existingProduct[0].quantity !== product_quantity) {
          const updateQuantityQuery = `
            UPDATE users_cart SET quantity = ? WHERE user_id = ? AND product_id = ? AND selected_size = ?
          `;
          await connect.query(updateQuantityQuery, [
            product_quantity,
            userId,
            product_id,
            selectedSize,
          ]);
          return res.redirect("/cart");
        }
      } else {
        const insertQuery =
          "INSERT INTO users_cart (user_id, product_id , selected_size , quantity) VALUES (?, ? , ? , ?)";
        await connect.query(insertQuery, [
          userId,
          product_id,
          selectedSize,
          product_quantity,
        ]);

        return res.redirect("/cart");
      }
    } catch (error) {
      console.error("Error adding product to cart:", error);
      res.status(500).send("Error adding product to cart");
    }
  }
});

router.get("/delete-product/:cart_id", async (req, res) => {
  try {
    const cartId = req.params.cart_id; // Accessing product ID from the request params
    const userId = req.session.user.id; // Assuming you have the user's ID in the session

    // Query to delete the product from the cart
    const deleteProductQuery = `
      DELETE FROM users_cart 
      WHERE user_id = ? AND id = ?
    `;

    // Execute the query
    await connect.query(deleteProductQuery, [userId, cartId]);

    // Redirect back to the cart page after deletion
    return res.redirect("/cart");
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

router.get("/order-detail/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const user = req.session.user;
  const userId = user.id;

  try {
    const [orderRows] = await connect.query(
      "SELECT * FROM orders WHERE order_id = ? AND user_id = ?",
      [orderId, userId]
    );

    if (orderRows.length > 0) {
      const order = orderRows[0];

      // Fetch items for the order
      const [orderItems] = await connect.query(
        `SELECT oi.*, p.product_name, p.product_main_image
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );

      // Attach items to the order
      // order.items = orderItems;

      // Render the order details page
      res.render("order-detail", { order, orderItems });
    } else {
      res.status(404).send("Order not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.post("/move-to-cart", async (req, res) => {
  const user = req.session.user;
  const userId = user.id;
  const { product_id, selectedSize, quantity } = req.body;

  try {
    // Step 1: Add the product to the cart table
    const addToCartQuery = `
      INSERT INTO users_cart (user_id, product_id, selected_size , quantity)
      VALUES (?, ?, ?, ?)
    `;
    const addToCartResult = await connect.query(addToCartQuery, [
      userId,
      product_id,
      selectedSize,
      quantity,
    ]);

    // Step 2: Delete the product from the users_favorites table
    const deleteFromFavoritesQuery = `
      DELETE FROM users_favorites
      WHERE user_id = ? AND product_id = ?
    `;
    const deleteFromFavoritesResult = await connect.query(
      deleteFromFavoritesQuery,
      [userId, product_id]
    );

    res.redirect("/cart");
  } catch (error) {
    // If an error occurs during database operations, handle it
    console.error("Error moving product to cart:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Move item to wishlist route
router.get("/move-to-wishlist/:cart_id", async (req, res) => {
  const user = req.session.user;
  const cartId = req.params.cart_id;

  if (!user) {
    return res.redirect("/login"); // Redirect to login if user is not authenticated
  }

  const userId = user.id;

  try {
    // Start a transaction
    await connect.query("START TRANSACTION");

    // Get the cart item details
    const [cartItemResult] = await connect.query(
      "SELECT * FROM users_cart WHERE id = ? AND user_id = ?",
      [cartId, userId]
    );

    if (cartItemResult.length === 0) {
      await connect.query("ROLLBACK");
      return res.redirect("/cart");
    }

    const cartItem = cartItemResult[0];
    const { product_id } = cartItem;

    // Check if the item already exists in the wishlist
    const [wishlistResult] = await connect.query(
      "SELECT * FROM users_favorites WHERE user_id = ? AND product_id = ?",
      [userId, product_id]
    );

    if (wishlistResult.length === 0) {
      // Add the item to the wishlist if it doesn't exist
      await connect.query(
        "INSERT INTO users_favorites (user_id, product_id) VALUES (?, ?)",
        [userId, product_id]
      );
    }

    // Remove the item from the cart
    await connect.query("DELETE FROM users_cart WHERE id = ? AND user_id = ?", [
      cartId,
      userId,
    ]);

    const [[cartCountResult]] = await connect.query(
      "SELECT COUNT(*) AS cart_count FROM users_cart WHERE user_id = ?",
      [userId]
    );
    const [[wishlistCountResult]] = await connect.query(
      "SELECT COUNT(*) AS wishlist_count FROM users_favorites WHERE user_id = ?",
      [userId]
    );

    req.session.cartCount = cartCountResult.cart_count;
    req.session.wishlistCount = wishlistCountResult.wishlist_count;

    // Commit the transaction
    await connect.query("COMMIT");

    // Redirect to the wishlist page or cart page
    res.redirect("/my-wishlist");
  } catch (error) {
    console.error("Error moving item to wishlist:", error);
    await connect.query("ROLLBACK");
    res.status(500).send("Failed to move item to wishlist");
  }
});

router.post("/add-to-wishlist", async (req, res) => {
  const user = req.session.user; // Assuming user is authenticated and session is used
  const { product_id } = req.body;

  if (!user) {
    req.session.productToWishlist = product_id;
    return res.redirect("/login"); // Redirect to the login page if the user is not logged in
  }
  const userId = user.id; // Assuming user id is stored in session

  // Extract productId from request body

  try {
    // Query to insert productId into userfav table
    const addToWishlistQuery = `
      INSERT INTO users_favorites (user_id, product_id)
      VALUES (?, ?)
    `;
    await connect.query(addToWishlistQuery, [userId, product_id]);

    // Redirect to my-wishlist page upon successful addition
    res.redirect("/my-wishlist");
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).send({ error: "Failed to add product to wishlist." });
  }
});

//
router.get("/contact-us", (req, res) => {
  const user = req.session.user;
  res.render("contact-us", { user });
});

router.post("/save-profile", async (req, res) => {
  const { user_id, name, email, phone, alt_phone } = req.body;

  try {
    // Update the user's profile information in the database
    await connect.query(
      `UPDATE user_registration SET name = ?, email = ?, phone_no = ?, alt_phone_no = ? WHERE id = ?`,
      [name, email, phone, alt_phone, user_id]
    );

    // Redirect to the profile page with a success message
    res.redirect("/my-profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
