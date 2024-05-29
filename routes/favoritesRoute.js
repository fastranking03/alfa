import express from "express";
const router = express.Router();  
import connect from "../db/connect.js";
 

router.get('/favorites/add/:productId', (req, res) => {
    const userId = req.session.user.id;
    const productId = req.params.productId;

    const query = "INSERT INTO users_favorites (user_id, product_id) VALUES (?, ?)";
    connect.query(query, [userId, productId], (err, result) => {
        if (err) {
            console.error("Error adding product to favorites:", err);
            res.redirect('/'); // Handle the error appropriately
        } else {
            res.redirect('/'); // Redirect to the favorites page or wherever appropriate
        }
    });
});


export default router
