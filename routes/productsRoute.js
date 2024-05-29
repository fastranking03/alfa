import express from "express";
const router = express.Router();  
import connect from "../db/connect.js";

// router.get('/category/:id', (req, res) => { 
//     const categoryId = req.params.id;
//     const user = "SHIVAM";
    
//     // Query the category information based on the provided categoryId
//     connect.query("SELECT * FROM category WHERE id = ?", [categoryId], (err, category) => {
//         if (err) {
//             console.error("Error fetching category:", err);
//             res.redirect("/"); // Handle the error appropriately
//         } else {
//             // If category found, proceed to query products related to this category
//             if (category.length > 0) {
//                 connect.query("SELECT * FROM products WHERE category_id = ?", [categoryId], (err, products) => {
//                     if (err) {
//                         console.error("Error fetching products for category:", err);
//                         res.redirect("/"); // Handle the error appropriately
//                     } else {
//                         // Render the products-view template with products, category, and user
//                         res.render('products-view', { products: products, category: category[0], user: user });
//                     }
//                 });
//             } else {
//                 // Category not found, handle appropriately (redirect, render error page, etc.)
//                 console.error("Category not found");
//                 res.redirect("/"); // Redirect to homepage or render an error page
//             }
//         }
//     });
// });

router.get('/category/:slug', (req, res) => { 
    const categorySlug = req.params.slug;
    const user = "SHIVAM";
    
    // Query the category information based on the provided category slug
    connect.query("SELECT * FROM category WHERE category_name = ?", [categorySlug], (err, category) => {
        if (err) {
            console.error("Error fetching category:", err);
            res.redirect("/"); // Handle the error appropriately
        } else {
            // If category found, proceed to query products related to this category
            if (category.length > 0) {
                const categoryId = category[0].id;
                connect.query("SELECT * FROM products WHERE category_id = ?", [categoryId], (err, products) => {
                    if (err) {
                        console.error("Error fetching products for category:", err);
                        res.redirect("/"); // Handle the error appropriately
                    } else {
                        // Render the products-view template with products, category, and user
                        res.render('products-view', { products: products, category: category[0], user: user });
                    }
                });
            } else {
                // Category not found, handle appropriately (redirect, render error page, etc.)
                console.error("Category not found");
                res.redirect("/"); // Redirect to homepage or render an error page
            }
        }
    });
});

export default router
