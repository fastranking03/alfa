import express from "express";
const router = express.Router();  
import connect from "../db/connect.js";


router.get('/category/:id', async (req, res) => { 
    const categoryId = req.params.id;
    const user = "SHIVAM";

    try {
        // Query the category information based on the provided categoryId
        const [category] = await connect.query("SELECT * FROM category WHERE id = ?", [categoryId]);
        
        // If category found, proceed to query products related to this category
        if (category.length > 0) {
            const [products] = await connect.query("SELECT * FROM products WHERE category_id = ?", [categoryId]);
            
            const cartCount = req.cartCount || 0;
            const wishlistCount = req.wishlistCount || 0;
        
            // Render the products-view template with products, category, and user
            res.render('products-view', { products: products, category: category[0], user: user , cartCount, wishlistCount});
        } else {
            // Category not found, handle appropriately (redirect, render error page, etc.)
            console.error("Category not found");
            res.redirect("/"); // Redirect to homepage or render an error page
        }
    } catch (err) {
        console.error("Error fetching category or products:", err);
        res.redirect("/"); // Handle the error appropriately
    }
});

 
export default router
