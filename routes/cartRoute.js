import express from "express";
const router = express.Router();
import connect from "../db/connect.js";

async function addToCart(userId, productId) {
  try {
    // Insert data into the users_cart table
    const insertQuery =
      "INSERT INTO users_cart (user_id, product_id) VALUES (?, ?)";
    await connect.query(insertQuery, [userId, productId]);
    return true; // Return true if the product was added successfully
  } catch (error) {
    console.error("Error adding product to cart:", error);
    return false; // Return false if there was an error adding the product to the cart
  }
}

// Assuming you have Express router setup
router.get("/cart/add/:productId", async (req, res) => {
  const user = req.session.user;

  //   const { product_id, selectedSize } = req.body;

  if (!user || !user.id) {
    // return res.status(401).send("User not authenticated");
    let product_id = req.params.productId;
    let selected_size = null;
    let qty = 1;

    req.session.cart = req.session.cart || [];

    const cartItems = req.session.cart || [];

    const cartItem = {
      cart_id: cartItems.length + 1,
      product_id,
      selected_size,
      quantity: qty,
    };

    const itemExists = req.session.cart.some(
      (item) => item.product_id === product_id
    );

    if (itemExists) {
      req.session.cartCount = req.session.cart.length;
      let CartCount = req.session.cartCount;
      return res.json({
        success: false,
        message: "Product already exists in cart",
        CartCount,
      });
    }

    req.session.cart.push(cartItem);
    req.session.cartCount = req.session.cart.length;
    let CartCount = req.session.cartCount;

    res.json({
      success: true,
      message: "Product added to Cart successfully",
      CartCount,
    });
  } else {
    try {
      // Get productId from request parameters
      const userId = req.session.user.id;
      const productId = req.params.productId;

      const checkQuery =
        "SELECT * FROM users_cart WHERE user_id = ? AND product_id = ?";
      const [existingProduct] = await connect.query(checkQuery, [
        userId,
        productId,
      ]);
      if (existingProduct.length > 0) {
        // Send a JSON response indicating that the product already exists in the cart
        res.json({ success: false, message: "Product already exists in cart" });
        return;
      } else if (!(await addToCart(userId, productId))) {
        // If adding the product to favorites fails, send a failure response
        res.json({ success: false, message: "Failed to add product to Cart" });
      } else {
        const [[{ CartCount }]] = await connect.query(
          "SELECT COUNT(*) AS CartCount FROM users_cart WHERE user_id = ?",
          [userId]
        );

        req.session.cartCount = CartCount;
        // If the product is not in favorites and is successfully added, send a success response
        res.json({
          success: true,
          message: "Product added to Cart successfully",
          CartCount,
        });
      }
    } catch (error) {
      // Handle errors
      console.error("Error adding product to cart:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

export default router;
