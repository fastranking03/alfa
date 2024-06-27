import express from "express";
import upload from "../../uploadConfig.js";
import pool from "../../db/connect.js"; // Renamed 'connect' to 'pool' for clarity

const router = express.Router();

// Fetch all categories
 

router.get("/category", async (req, res) => {
  try {
    const [categories] = await pool.query("SELECT * FROM category");
    console.log(categories)
    res.render("admin/category", { categories });
  } catch (err) {
    res.status(500).send("Error fetching category: " + err.message);
  }
});

// Render add category form
router.get("/add-category", (req, res) => {
  res.render("admin/add-category");
});

// Submit new category
router.post("/new-category-submit", upload.single("category_image"), async (req, res) => {
  const { category_name, status } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!image) {
    return res.status(400).send("Image upload failed.");
  }

  const query = "INSERT INTO category (category_name, status, category_image) VALUES (?, ?, ?)";
  try {
    await pool.query(query, [category_name, status, image]);
    res.redirect("/admin/category");
  } catch (err) {
    console.error("Error inserting new category:", err);
    res.redirect("/admin/new-category");
  }
});

// Render edit category form
router.get("/edit-category/:id", async (req, res) => {
  const categoryId = req.params.id;
  const query = "SELECT * FROM category WHERE id = ?";
  
  try {
    const [categories] = await pool.query(query, [categoryId]);
    if (categories.length === 0) {
      return res.status(404).send("Category not found");
    }
    res.render("admin/edit-category", { category: categories[0] });
  } catch (err) {
    console.error("Error fetching category:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Submit updated category
router.post("/update-category-submit", upload.single("category_image"), async (req, res) => {
  const { id, category_name, status } = req.body;
  const category_image = req.file ? req.file.filename : null;

  let query;
  let queryParams;

  if (category_image) {
    query = "UPDATE category SET category_name = ?, category_image = ?, status = ? WHERE id = ?";
    queryParams = [category_name, category_image, status, id];
  } else {
    query = "UPDATE category SET category_name = ?, status = ? WHERE id = ?";
    queryParams = [category_name, status, id];
  }

  try {
    await pool.query(query, queryParams);
    res.redirect("/admin/category");
  } catch (err) {
    console.error("Error updating category:", err);
    res.redirect("/admin/category");
  }
  
});

// Delete category
router.get("/delete-category/:id", async (req, res) => {
  const categoryId = req.params.id;
  const query = "DELETE FROM category WHERE id = ?";

  try {
    await pool.query(query, [categoryId]);
    res.redirect("/admin/category");
  } catch (err) {
    console.error("Error deleting category:", err);
    res.redirect("/admin/category");
  }
});

export default router;

