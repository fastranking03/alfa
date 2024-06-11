import express from "express";
import connect from "../db/connect.js";

const router = express.Router();

// Route to display products in a single category
router.get("/:categoryName", async (req, res) => {
  const user = req.session.user;
  const categoryName = req.params.categoryName;
  const querycategoryList = " SELECT * FROM category ";
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

    if (productRows.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found in this category" });
    }

    // res.render('products', { products: productRows });

    res.render("product", {
      user,
      products: productRows,
      categories: categories,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
