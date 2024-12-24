import express from "express";
import connect from "../db/connect.js";

const router = express.Router();

// Route to display products in a single category
// router.get("/:categoryName", async (req, res) => {
//  // const categoryName = req.params.categoryName;
//   const categoryName = req.params.categoryName.toLowerCase();

//   const querycategoryList = `
//   SELECT c.*, COUNT(p.id) AS product_count
//   FROM category c
//   LEFT JOIN products p ON c.id = p.category_id 
//   GROUP BY c.id;
// `;
//   try {
//     const [categories] = await connect.query(querycategoryList);
//     // First, find the category ID based on the category name
//     const [categoryRows] = await connect.query(
//       "SELECT * FROM category WHERE category_name = ?",
//       [categoryName]
//     );
//     if (categoryRows.length === 0) {
//       return res.status(404).json({ message: "Category not found" });
//     }

//     const categoryId = categoryRows[0].id;
//     const wearType = categoryRows[0].wear_type;

//     // Then, select all products with the found category ID
//     const [productRows] = await connect.query(
//       "SELECT * FROM products WHERE category_id = ?",
//       [categoryId]
//     );

//     const colorlist = `
//       SELECT * FROM colors;
//       `;
//     const [color_list] = await connect.query(colorlist);

//     let total_product_count = productRows.length;

//     if (productRows.length === 0) {
//       res.render("product", {
//         products: productRows,
//         categories: categories,
//         product_count: total_product_count,
//         color_list: color_list,
//         wearType: wearType,
//       });
//     }

//     // res.render('products', { products: productRows });

//     res.render("product", {
//       products: productRows,
//       categories: categories,
//       product_count: total_product_count,
//       color_list: color_list,
//       wearType: wearType,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

router.get("/:categoryName", async (req, res) => {
  const categoryName = req.params.categoryName.toLowerCase();

  const querycategoryList = `
  SELECT c.*, COUNT(p.id) AS product_count
  FROM category c
  LEFT JOIN products p ON c.id = p.category_id 
  GROUP BY c.id;
  `;
  
  try {
    // Get list of categories
    const [categories] = await connect.query(querycategoryList);

    // Find the category by name
    const [categoryRows] = await connect.query(
      "SELECT * FROM category WHERE category_name = ?",
      [categoryName]
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;
    const wearType = categoryRows[0].wear_type;

    // Query to fetch products based on category ID and retrieve sizes accordingly
    const queryProductByCategory = `
      SELECT p.*,
      CASE
        WHEN p.wear_type_bottom_or_top = 'top' THEN 
          GROUP_CONCAT(
            CONCAT_WS(':', 
              IF(tw.xs > 0, 'xs', NULL), IF(tw.s > 0, 's', NULL),
              IF(tw.m > 0, 'm', NULL), IF(tw.l > 0, 'l', NULL),
              IF(tw.xl > 0, 'xl', NULL), IF(tw.xxl > 0, 'xxl', NULL),
              IF(tw.xxxl > 0, 'xxxl', NULL), IF(tw.xxxxl > 0, 'xxxxl', NULL)
            ) SEPARATOR ',')
        WHEN p.wear_type_bottom_or_top = 'bottom' THEN 
          GROUP_CONCAT(
            CONCAT_WS(':', 
              IF(bw.size_28 > 0, '28', NULL), IF(bw.size_30 > 0, '30', NULL),
              IF(bw.size_32 > 0, '32', NULL), IF(bw.size_34 > 0, '34', NULL),
              IF(bw.size_36 > 0, '36', NULL), IF(bw.size_38 > 0, '38', NULL),
              IF(bw.size_40 > 0, '40', NULL), IF(bw.size_42 > 0, '42', NULL),
              IF(bw.size_44 > 0, '44', NULL), IF(bw.size_46 > 0, '46', NULL)
            ) SEPARATOR ',')
        WHEN p.wear_type_bottom_or_top = 'suit' THEN 
          GROUP_CONCAT(
            CONCAT_WS(':', 
              IF(sw.size_34 > 0, '34', NULL), IF(sw.size_36 > 0, '36', NULL),
              IF(sw.size_38 > 0, '38', NULL), IF(sw.size_40 > 0, '40', NULL),
              IF(sw.size_42 > 0, '42', NULL), IF(sw.size_44 > 0, '44', NULL),
              IF(sw.size_46 > 0, '46', NULL), IF(sw.size_48 > 0, '48', NULL),
              IF(sw.size_50 > 0, '50', NULL), IF(sw.size_52 > 0, '52', NULL),
              IF(sw.size_54 > 0, '54', NULL)
            ) SEPARATOR ',')
      END AS sizes
      FROM products p
      LEFT JOIN topwear_inventory_with_sizes tw ON p.id = tw.product_id AND p.wear_type_bottom_or_top = 'top'
      LEFT JOIN bottom_wear_inventory_with_sizes bw ON p.id = bw.product_id AND p.wear_type_bottom_or_top = 'bottom'
      LEFT JOIN suits_wear_inventory_with_sizes sw ON p.id = sw.product_id AND p.wear_type_bottom_or_top = 'suit'
      WHERE p.category_id = ? AND p.wear_type_bottom_or_top IN ('top', 'bottom', 'suit')
      GROUP BY p.id;
    `;

    // Fetch products based on category
    const [productRows] = await connect.query(queryProductByCategory, [categoryId]);

    const colorlist = `
      SELECT * FROM colors;
    `;
    const [color_list] = await connect.query(colorlist);

    let total_product_count = productRows.length;

    // Render the products page with the filtered products and category details
    res.render("product", {
      products: productRows,
      categories: categories,
      product_count: total_product_count,
      color_list: color_list,
      wearType: wearType,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;
