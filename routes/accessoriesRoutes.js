import express from "express";
import connect from "../db/connect.js";

const router = express.Router();

// Route to display products in a single category


router.get("/:categoryName", async (req, res) => {
    const categoryName = req.params.categoryName;
    const querycategoryList = `
  SELECT c.*, COUNT(p.id) AS product_count
  FROM category c
  LEFT JOIN products p ON c.id = p.category_id 
  GROUP BY c.id;
`;
    try {
        const [categories] = await connect.query(querycategoryList);
        // First, find the category ID based on the category name
        const [categoryRows] = await connect.query(
            "SELECT id FROM category WHERE category_name = ?",
            [categoryName]
        );
        if (categoryRows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        const categoryId = categoryRows[0].id;

        // Then, select all products with the found category ID
        const [productRows] = await connect.query(
            "SELECT * FROM products WHERE category_id = ?",
            [categoryId]
        );

        const colorlist = `
      SELECT * FROM colors;
      `;
        const [color_list] = await connect.query(colorlist);

        let total_product_count = productRows.length;

        if (productRows.length === 0) {
            res.render("accessories", {
                products: productRows,
                categories: categories,
                product_count: total_product_count,
                category_name: categoryName,
            });
        }

        // res.render('products', { products: productRows });

        res.render("accessories", {
            products: productRows,
            categories: categories,
            product_count: total_product_count,
            color_list: color_list,
            category_name: categoryName,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


export default router;
