import express from "express";

import connect from "../db/connect.js";
const router = express.Router();

router.get('/shirts', (req, res) => {
    const user = req.session.user;
    connect.query("SELECT * FROM products WHERE subcategory = 'shirts'", (err, shirts) => {
        if (err) {
            console.error("Error fetching shirts:", err);
            // Handle error, maybe render an error page
        } else {
            return res.render('index', { user: user, products: shirts });
        }
    });
});

export default router
