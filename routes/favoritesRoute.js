import express from "express";
const router = express.Router();
import connect from "../db/connect.js";

// Function to add product to favorites
const addToFavorites = async (userId, productId) => {
  try {
    // Insert data into the users_favourites table
    const insertQuery =
      "INSERT INTO users_favorites (user_id, product_id) VALUES (?, ?)";
    await connect.query(insertQuery, [userId, productId]);
    return true; // Return true if the product was added successfully
  } catch (error) {
    console.error("Error adding product to favorites:", error);
    return false; // Return false if there was an error adding the product to favorites
  }
};

router.get("/favorites/add/:productId", async (req, res) => {
  
  const productId = req.params.productId;

  try {
    // Check if user is logged in
    if (!req.session.user || !req.session.user.id) {
      
    req.session.productToWishlist = productId;

      return res.json({
        success: false,
        message: "Login First",
      });
    } 
    
  const userId = req.session.user.id;


 
    // Check if the product already exists in favorites
    const checkQuery =
      "SELECT * FROM users_favorites WHERE user_id = ? AND product_id = ?";
    const [existingFavorite] = await connect.query(checkQuery, [
      userId,
      productId,
    ]);

    // If the product already exists in favorites, remove it
    if (existingFavorite.length > 0) {
      const deleteQuery =
        "DELETE FROM users_favorites WHERE user_id = ? AND product_id = ?";
      await connect.query(deleteQuery, [userId, productId]);
      console.log("Product removed from favorites for this user.");

      // Fetch updated favorites count
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
      // Respond with success message and updated favorites count
      return res.json({
        success: true,
        message: "Product removed from favorites",
        favoritesCount,
      });
    }

    // Attempt to add the product to favorites
    if (!(await addToFavorites(userId, productId))) {
      return res.json({
        success: false,
        message: "Failed to add product to favorites",
      });
    }

    // Fetch updated favorites count
    const [[{ favoritesCount }]] = await connect.query(
      "SELECT COUNT(*) AS favoritesCount FROM users_favorites WHERE user_id = ?",
      [userId]
    );

    // Respond with success message and updated favorites count
    res.json({
      success: true,
      message: "Product added to favorites successfully",
      favoritesCount,
    });
  } catch (error) {
    console.error("Error adding product to favorites:", error);
    res.status(500).json({ error: "Error adding product to favorites" });
  }
});


export default router;

