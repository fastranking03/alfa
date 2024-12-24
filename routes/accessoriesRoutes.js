import express from "express";
import connect from "../db/connect.js";

const router = express.Router();

// Route to display products in a single category


// router.get("/:categoryName", async (req, res) => {
//     const categoryName = req.params.categoryName;
//     const querycategoryList = `
//   SELECT c.*, COUNT(p.id) AS product_count
//   FROM category c
//   LEFT JOIN products p ON c.id = p.category_id 
//   GROUP BY c.id;
// `;
//     try {
//         const [categories] = await connect.query(querycategoryList);
//         // First, find the category ID based on the category name
//         const [categoryRows] = await connect.query(
//             "SELECT id FROM category WHERE category_name = ?",
//             [categoryName]
//         );
//         if (categoryRows.length === 0) {
//             return res.status(404).json({ message: "Category not found" });
//         }

//         const categoryId = categoryRows[0].id;

//         // Then, select all products with the found category ID
//         const [productRows] = await connect.query(
//             "SELECT * FROM products WHERE category_id = ?",
//             [categoryId]
//         );

//         const colorlist = `
//       SELECT * FROM colors;
//       `;
//         const [color_list] = await connect.query(colorlist);

//         let total_product_count = productRows.length;

//         if (productRows.length === 0) {
//             res.render("accessories", {
//                 products: productRows,
//                 categories: categories,
//                 product_count: total_product_count,
//                 category_name: categoryName,
//             });
//         }

//         // res.render('products', { products: productRows });

//         res.render("accessories", {
//             products: productRows,
//             categories: categories,
//             product_count: total_product_count,
//             color_list: color_list,
//             category_name: categoryName,
//         });
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });

router.get("/:categoryName", async (req, res) => {
    const categoryName = req.params.categoryName;

    const queryCategoryList = `
    SELECT c.*, COUNT(p.id) AS product_count
    FROM category c
    LEFT JOIN products p ON c.id = p.category_id 
    GROUP BY c.id;
  `;

    const queryColorList = `
    SELECT * FROM colors;
  `;

  //   const queryProduct = `
  //   SELECT p.*,
  //     CASE
  //     WHEN p.wear_type_bottom_or_top = 'shoes' THEN GROUP_CONCAT(CONCAT_WS(':', '6', sh.size_6, '7', sh.size_7, '8', sh.size_8, '9', sh.size_9, '10', sh.size_10, '11', sh.size_11, '12', sh.size_12, '13', sh.size_13) SEPARATOR ', ')
  //     WHEN p.wear_type_bottom_or_top = 'belt' THEN GROUP_CONCAT(CONCAT_WS(':', 's', bt.s, 'm', bt.m, 'l', bt.l, 'xl', bt.xl, '2xl', bt.2xl, '3xl', bt.2xl ) SEPARATOR ', ')
  //     WHEN p.wear_type_bottom_or_top = 'wallet' THEN GROUP_CONCAT(CONCAT_WS(':', 's', wl.s, 'm', wl.m, 'l', wl.l) SEPARATOR ', ')
  //   END AS sizes
  //   FROM products p
  //   LEFT JOIN shoes_inventory sh ON p.id = sh.product_id AND p.wear_type_bottom_or_top = 'shoes'
  //   LEFT JOIN belts_inventory bt ON p.id = bt.product_id AND p.wear_type_bottom_or_top = 'belt'
  //   LEFT JOIN wallet_inventory wl ON p.id = wl.product_id AND p.wear_type_bottom_or_top = 'wallet'
  //   WHERE p.category_id = ? AND p.wear_type_bottom_or_top IN ('shoes', 'belt', 'wallet')
  //   GROUP BY p.id;
  // `;

  
  const queryProduct1 = `
  SELECT p.*,
      CASE
      WHEN p.wear_type_bottom_or_top = 'shoes' THEN 
          GROUP_CONCAT(
          CONCAT_WS(':', 
              IF(sh.size_6 > 0, '6', NULL), 
              IF(sh.size_7 > 0, '7', NULL),
              IF(sh.size_8 > 0, '8', NULL), 
              IF(sh.size_9 > 0, '9', NULL),
              IF(sh.size_10 > 0, '10', NULL), 
              IF(sh.size_11 > 0, '11', NULL),
              IF(sh.size_12 > 0, '12', NULL), 
              IF(sh.size_13 > 0, '13', NULL)
          ) SEPARATOR ', ')
      WHEN p.wear_type_bottom_or_top = 'belt' THEN 
          GROUP_CONCAT(
          CONCAT_WS(':', 
              IF(bt.s > 0, 's', NULL), 
              IF(bt.m > 0, 'm', NULL),
              IF(bt.l > 0, 'l', NULL), 
              IF(bt.xl > 0, 'xl', NULL),
              IF(bt.2xl > 0, '2xl', NULL), 
              IF(bt.3xl > 0, '3xl', NULL)
          ) SEPARATOR ', ')
      WHEN p.wear_type_bottom_or_top = 'wallet' THEN 
          GROUP_CONCAT(
          CONCAT_WS(':', 
              IF(wl.s > 0, 's', NULL), 
              IF(wl.m > 0, 'm', NULL),
              IF(wl.l > 0, 'l', NULL)
          ) SEPARATOR ', ')
      END AS sizes
  FROM products p
  LEFT JOIN shoes_inventory sh ON p.id = sh.product_id AND p.wear_type_bottom_or_top = 'shoes'
  LEFT JOIN belts_inventory bt ON p.id = bt.product_id AND p.wear_type_bottom_or_top = 'belt'
  LEFT JOIN wallet_inventory wl ON p.id = wl.product_id AND p.wear_type_bottom_or_top = 'wallet'
  WHERE p.category_id = ? AND p.wear_type_bottom_or_top IN ('shoes', 'belt', 'wallet')  
  GROUP BY p.id;
  `;
    try {
        const [categories] = await connect.query(queryCategoryList);

        const [categoryRows] = await connect.query(
            "SELECT id FROM category WHERE category_name = ?",
            [categoryName]
        );

        if (categoryRows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        const categoryId = categoryRows[0].id;

        const [productRows] = await connect.query(queryProduct1, [categoryId]);

        const [color_list] = await connect.query(queryColorList);

        let total_product_count = productRows.length;

        res.render("accessories", {
            products: productRows,
            categories: categories,
            product_count: total_product_count,
            color_list: color_list,
            category_name: categoryName,
        });
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).send("Internal Server Error");
    }
});

export default router;
