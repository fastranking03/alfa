import express from "express";
import connect from "../../db/connect.js";
const router = express.Router();

router.get("/add-product", async (req, res) => {
  try {
    const [categories] = await connect.query("SELECT * FROM category");
    const [subcategories] = await connect.query("SELECT * FROM sub_category");

    res.render("admin/add-product", { categories, subcategories });
  } catch (error) {
    console.error("Error loading add-product page:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/add-product", async (req, res) => {
  try {
    const {
      category_id,
      subcategory_id,
      product_name,
      product_price,
      discount_on_product,
      product_title,
      product_description,
      wear_type_bottom_or_top,
    } = req.body;

    const query = `
        INSERT INTO products (
            category_id,
            subcategory_id,
            product_name,
            product_price,
            discount_on_product, 
            product_title,
            product_description,
            wear_type_bottom_or_top
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ? )
    `;

    const values = [
      category_id,
      subcategory_id,
      product_name,
      product_price,
      discount_on_product,
      product_title,
      product_description,
      wear_type_bottom_or_top,
    ];

    await connect.query(query, values);

    // Redirect to /admin after successful insertion
    res.redirect("/admin");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Edit product route
router.get("/edit/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const [product] = await connect.query(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    const [categories] = await connect.query("SELECT * FROM category");
    const [subcategories] = await connect.query("SELECT * FROM sub_category");

    res.render("admin/edit-product", {
      product: product[0],
      categories,
      subcategories,
      productId,
    });
  } catch (error) {
    console.error("Error fetching product for edit:", error);
    res.redirect("/error");
  }
});
router.post("/edit-product-submit", async (req, res) => {
  try {
    // Extract form data
    const {
      productId,
      product_name,
      product_price,
      discount_on_product,
      product_title,
      product_description,
      category_id,
      subcategory_id,
      wear_type_bottom_or_top,
    } = req.body;

    await connect.query("UPDATE products SET product_name = ?, product_price = ?, discount_on_product = ?, product_title = ?, product_description = ?, category_id = ?, subcategory_id = ?, wear_type_bottom_or_top = ? WHERE id = ?", [product_name, product_price, discount_on_product, product_title, product_description, category_id, subcategory_id, wear_type_bottom_or_top, productId]);

    // Redirect to a success page or display a success message
    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating product:", error);
    // Redirect to an error page or display an error message
    res.redirect("/admin/error");
  }
});

// Delete product route
router.get("/delete/:id", (req, res) => {
  const productId = req.params.id;
  // Perform deletion of product based on productId
  // Redirect to the products list page or display a success message
  res.redirect("/products"); // Assuming '/products' is the route for listing all products
});

export default router;
