import express from "express";
const router = express.Router();  
import connect from "../db/connect.js";
 
async function addToCart(userId, productId) {
    try {
        // Insert data into the users_cart table
        const insertQuery = 'INSERT INTO users_cart (user_id, product_id) VALUES (?, ?)';
        await connect.query(insertQuery, [userId, productId]);
        return true; // Return true if the product was added successfully
    } catch (error) {
        console.error('Error adding product to cart:', error);
        return false; // Return false if there was an error adding the product to the cart
    }
}


// Assuming you have Express router setup
router.get('/cart/add/:productId', async (req, res) => { 
    try {
        // Get productId from request parameters
        const userId = req.session.user.id;
        const productId = req.params.productId; 

        // Assuming addToCart(productId) returns true if the product was added successfully
        const productAdded = await addToCart(userId, productId);

        if (productAdded) {
            // Send a JSON response indicating success
            res.json({ success: true });
        } else {
            // Send a JSON response indicating failure
            res.json({ success: false });
        }
    } catch (error) {
        // Handle errors
        console.error('Error adding product to cart:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


export default router;