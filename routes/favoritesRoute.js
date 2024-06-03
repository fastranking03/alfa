import express from "express";
const router = express.Router();  
import connect from "../db/connect.js";
 


// Function to add product to favorites
const addToFavorites = async (userId, productId) => {
    try {
        // Insert data into the users_favourites table
        const insertQuery = 'INSERT INTO users_favorites (user_id, product_id) VALUES (?, ?)';
        await connect.query(insertQuery, [userId, productId]);
        return true; // Return true if the product was added successfully
    } catch (error) {
        console.error('Error adding product to favorites:', error);
        return false; // Return false if there was an error adding the product to favorites
    }
};

router.get('/favorites/add/:productId', async (req, res) => {
    try {
        const userId = req.session.user.id; // Assuming you have user session data
        const productId = req.params.productId;

         // Check if the product already exists in favorites
        const checkQuery = 'SELECT * FROM users_favorites WHERE user_id = ? AND product_id = ?';
        const [existingFavorite] = await connect.query(checkQuery, [userId, productId]);
        
        // If the product already exists in favorites, send a failure response
        if (existingFavorite.length > 0) {
            console.log('Product already exists in favorites for this user.');
            res.json({ success: false, message: "Product already exists in favorites" });
            return;
        } else if (!(await addToFavorites(userId, productId))) {
            // If adding the product to favorites fails, send a failure response
            res.json({ success: false, message: "Failed to add product to favorites" });
        } else {
            // If the product is not in favorites and is successfully added, send a success response
            res.json({ success: true, message: "Product added to favorites successfully" });
        }
    } catch (error) {
        console.error("Error adding product to favorites:", error);
        res.status(500).json({ error: "Error adding product to favorites" });
    }
}); 
 

export default router
