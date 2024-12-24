import express from "express";
import connect from "../../db/connect.js";
const router = express.Router();

router.get("/inventory/bottom-wear", async (req, res) => {
  try {
    // Fetch inventory data with product name from the database
    const query = `
        SELECT 
            p.id AS productid,
            p.product_name AS productname,
            p.product_main_image AS product_image,
            bw.* 
        FROM 
            products p
        LEFT JOIN 
            bottom_wear_inventory_with_sizes bw ON p.id = bw.product_id
        WHERE 
            p.wear_type_bottom_or_top = 'bottom'`;

    const [rows, fields] = await connect.query(query);

    // Render the HTML template with the fetched data
    res.render("admin/inventory", {
      inventory: rows,
      inventory_type: "bottomwear",
    });
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/inventory/top-wear", async (req, res) => {
  try {
    // Fetch inventory data with product name from the database
    const query = `
            SELECT 
                p.id AS productid,
                p.product_name AS productname,
                p.product_main_image AS product_image,
                bw.* 
            FROM 
                products p
            LEFT JOIN 
            topwear_inventory_with_sizes bw ON p.id = bw.product_id
            WHERE 
            p.wear_type_bottom_or_top = 'top'`;

    const [rows, fields] = await connect.query(query);

    // Render the HTML template with the fetched data
    res.render("admin/inventory", {
      inventory: rows,
      inventory_type: "topwear",
    });
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    res.status(500).send("Internal Server Error");
  }
});



router.get("/inventory/:categoryName", async (req, res) => {
  try {
    const categoryName = req.params.categoryName.toLowerCase(); // Convert the category name to lower case

    // Define the table to query based on the category_name
    const categoryQuery = `SELECT * FROM category WHERE LOWER(category_name) = ?`; // Use LOWER() to ignore case sensitivity

    const [categoryDetails] = await connect.query(categoryQuery, [categoryName]);

    if (!categoryDetails.length) {
      return res.status(404).send('Category not found');
    }

    const category_wear_type = categoryDetails[0].wear_type;
    console.log('Wear Type:', category_wear_type); // Log the wear type

    let table_name;
    switch (category_wear_type.toLowerCase()) {
      case 'top':
        table_name = 'topwear_inventory_with_sizes';
        break;
      case 'bottom':
        table_name = 'bottom_wear_inventory_with_sizes';
        break;
      case 'shoes':
        table_name = 'shoes_inventory';
        break;
      case 'wallet':
        table_name = 'wallet_inventory';
        break;
      case 'belt':
        table_name = 'belts_inventory';
        break;
      case 'suit':
        table_name = 'suits_wear_inventory_with_sizes';
        break;
      default:
        return res.status(400).send("Invalid category wear type");
    }

    const inventoryQuery = `SELECT p.id AS productid, p.product_name AS productname, p.product_main_image AS product_image, i.* 
    FROM products p
    LEFT JOIN ${table_name} i ON p.id = i.product_id
    WHERE p.category_id = ? `; // Use the category_id to filter products by category

    const [inventoryRows] = await connect.query(inventoryQuery, [categoryDetails[0].id]); // Use category id from the categoryDetails

    // Render the inventory page with the fetched data
    res.render("admin/manage-inventory", {
      inventory: inventoryRows,
      category_name: categoryName, // Pass the category name to the view
      category_wear_type: category_wear_type, // Pass the wear type to the view if needed
    });
  } catch (error) {
    console.error("Error fetching inventory data:", error.message || error);
    res.status(500).send("Internal Server Error");
  }
});






















router.get("/inventory/update/:productid", async (req, res) => {
  try {
    const productId = req.params.productid;
    const type = req.query.type;
    let productDetails = await connect.query(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    productDetails = productDetails[0];

    if (type !== "bottom" && type !== "top" && type !== "shoes" && type !== "belt") {
      throw new Error("Invalid inventory item type");
    }

    let inventoryItem;

    if (type === "bottom") {
      inventoryItem = await connect.query(
        "SELECT * FROM bottom_wear_inventory_with_sizes WHERE product_id = ?",
        [productId]
      );
      if (inventoryItem && inventoryItem.length > 0) {
        // Access the first (and possibly only) item in the array
        inventoryItem = inventoryItem[0];
      } else {
        // If no rows are returned, initialize with default values
        inventoryItem = {
          size_28: null,
          size_30: null,
          size_32: null,
          size_34: null,
          size_36: null,
          size_38: null,
          size_40: null,
          size_42: null,
          size_44: null,
          size_46: null,
        };
      }
    } else if (type === "top") {
      inventoryItem = await connect.query(
        "SELECT * FROM topwear_inventory_with_sizes WHERE product_id = ?",
        [productId]
      );
      if (inventoryItem && inventoryItem.length > 0) {
        // Access the first (and possibly only) item in the array
        inventoryItem = inventoryItem[0];
      } else {
        inventoryItem = {
          xs: null,
          s: null,
          m: null,
          l: null,
          xl: null,
          xxl: null,
          xxxl: null,
          xxxxl: null,
        };
      }
    } else if (type === "shoes") {
      inventoryItem = await connect.query(
        "SELECT * FROM shoes_inventory WHERE product_id = ?",
        [productId]
      );
      if (inventoryItem && inventoryItem.length > 0) {
        // Access the first (and possibly only) item in the array
        inventoryItem = inventoryItem[0];
      } else {
        inventoryItem = {
          size_6: null,
          size_7: null,
          size_8: null,
          size_9: null,
          size_10: null,
          size_11: null,
          size_12: null,
          size_13: null,
        };
      }
    } else if (type === "belt") {
      inventoryItem = await connect.query(
        "SELECT * FROM belts_inventory WHERE product_id = ?",
        [productId]
      );
      if (inventoryItem && inventoryItem.length > 0) {
        // Access the first (and possibly only) item in the array
        inventoryItem = inventoryItem[0];
      } else {
        inventoryItem = {
          s: null,
          m: null,
          l: null,
          xl: null,
          '2xl': null,
          '3xl': null,
        };
      }
    }


    res.render("admin/update-inventory", {
      inventoryItem,
      productId,
      type,
      productDetails,
    });
  } catch (error) {
    // Handle errors appropriately
    console.error("Error fetching inventory item:", error);
    res.redirect("/error");
  }
});

router.post("/update-inventory", async (req, res) => {
  try {
    const {
      productId,
      product_name,
      type,
      size_28,
      size_30,
      size_32,
      size_34,
      size_36,
      size_38,
      size_40,
      size_42,
      size_44,
      size_46,
      size_xs,
      size_s,
      size_m,
      size_l,
      size_xl,
      size_xxl,
      size_xxxl,
      size_xxxxl,
      size_6,
      size_7,
      size_8,
      size_9,
      size_10,
      size_11,
      size_12,
      size_13,
      belt_size_s,
      belt_size_m,
      belt_size_l,
      belt_size_xl,
      belt_size_2xl,
      belt_size_3xl,
    } = req.body;

    let query, values;

    let productExistsQuery;
    if (type === "bottom") {
      productExistsQuery = "SELECT * FROM bottom_wear_inventory_with_sizes WHERE product_id = ?";
    } else if (type === "top") {
      productExistsQuery = "SELECT * FROM topwear_inventory_with_sizes WHERE product_id = ?";
    } else if (type === "shoes") {
      productExistsQuery = "SELECT * FROM shoes_inventory WHERE product_id = ?";
    }

    const [productExistsResult] = await connect.query(productExistsQuery, [productId]);
    if (productExistsResult.length > 0) {
      // Product exists, update the inventory
      if (type === "bottom") {
        query = `
          UPDATE bottom_wear_inventory_with_sizes
    SET
    size_28 = ?,
      size_30 = ?,
      size_32 = ?,
      size_34 = ?,
      size_36 = ?,
      size_38 = ?,
      size_40 = ?,
      size_42 = ?,
      size_44 = ?,
      size_46 = ?
        WHERE product_id = ? `;

        values = [
          size_28,
          size_30,
          size_32,
          size_34,
          size_36,
          size_38,
          size_40,
          size_42,
          size_44,
          size_46,
          productId,
        ];

        await connect.query(query, values);
      } else if (type === "top") {
        query = `
          UPDATE topwear_inventory_with_sizes
    SET
    xs = ?,
      s = ?,
      m = ?,
      l = ?,
      xl = ?,
      xxl = ?,
      xxxl = ?,
      xxxxl = ?
        WHERE product_id = ? `;

        values = [
          size_xs,
          size_s,
          size_m,
          size_l,
          size_xl,
          size_xxl,
          size_xxxl,
          size_xxxxl,
          productId,
        ];

        await connect.query(query, values);
      } else if (type === "shoes") {
        query = `
          UPDATE shoes_inventory
    SET
      size_6   = ?,
      size_7 = ?,
      size_8 = ?,
      size_9 = ?,
      size_10 = ?,
      size_11 = ?,
      size_12 = ?,
      size_13 = ?
        WHERE product_id = ? `;

        values = [
          size_6,
          size_7,
          size_8,
          size_9,
          size_10,
          size_11,
          size_12,
          size_13,
          productId,
        ];

        await connect.query(query, values);
      } else if (type === "belt") {
        query = `
            UPDATE belts_inventory
              SET
              s   = ?,
              m = ?,
              l = ?,
              xl = ?,
              2xl = ?,
              3xl = ?, 
              WHERE product_id = ? `;

        values = [
          belt_size_s,
          belt_size_m,
          belt_size_l,
          belt_size_xl,
          belt_size_2xl,
          belt_size_3xl,
          productId,
        ];

        await connect.query(query, values);
      }
    } else {
      // Product does not exist, insert new row
      if (type === "bottom") {
        query = "INSERT INTO bottom_wear_inventory_with_sizes SET ?";
        values = {
          product_id: productId,
          product_name: product_name,
          size_28: size_28,
          size_30: size_30,
          size_32: size_32,
          size_34: size_34,
          size_36: size_36,
          size_38: size_38,
          size_40: size_40,
          size_42: size_42,
          size_44: size_44,
          size_46: size_46,
        };

        await connect.query(query, values);
      } else if (type === "top") {
        query = "INSERT INTO topwear_inventory_with_sizes SET ?";
        values = {
          product_id: productId,
          product_name: product_name,
          xs: size_xs,
          s: size_s,
          m: size_m,
          l: size_l,
          xl: size_xl,
          xxl: size_xxl,
          xxxl: size_xxxl,
          xxxxl: size_xxxxl,
        };

        await connect.query(query, values);
      } else if (type === "shoes") {
        query = "INSERT INTO shoes_inventory SET ?";
        values = {
          product_id: productId,
          product_name: product_name,
          size_6: size_6,
          size_7: size_7,
          size_8: size_8,
          size_9: size_9,
          size_10: size_10,
          size_11: size_11,
          size_12: size_12,
          size_13: size_13,
        };
        await connect.query(query, values);
      } else if (type === "belt") {
        query = "INSERT INTO belts_inventory SET ?";
        values = {
          product_id: productId,
          product_name: product_name,
          s: belt_size_s,
          m: belt_size_m,
          l: belt_size_l,
          xl: belt_size_xl,
          '2xl': belt_size_2xl,
          '3xl': belt_size_3xl,
        };
        await connect.query(query, values);
      }
    }

    // Redirect to the appropriate inventory page based on the type
    if (type === "bottom") {
      res.redirect("/admin/inventory/bottom-wear");
    } else if (type === "top") {
      res.redirect("/admin/inventory/top-wear");
    } else if (type === "shoes") {
      res.redirect("/admin/inventory/shoes");
    }
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.redirect("/error");
  }
});


export default router;
