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

router.get("/inventory/update/:productid", async (req, res) => {
  try {
    const productId = req.params.productid;
    const type = req.query.type;
    let productDetails = await connect.query(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    productDetails = productDetails[0];

    if (type !== "bottom" && type !== "top") {
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
    }

    // Render the update page with the fetched item data

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
    } = req.body;

    let query, values;

    let productExistsQuery;
    if (type === "bottom") {
      productExistsQuery = "SELECT * FROM bottom_wear_inventory_with_sizes WHERE product_id = ?";
    } else if (type === "top") {
      productExistsQuery = "SELECT * FROM topwear_inventory_with_sizes WHERE product_id = ?";
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
          WHERE product_id = ?`;

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
          WHERE product_id = ?`;

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
      }
    }

    // Redirect to the appropriate inventory page based on the type
    if (type === "bottom") {
      res.redirect("/admin/inventory/bottom-wear");
    } else if (type === "top") {
      res.redirect("/admin/inventory/top-wear");
    }
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.redirect("/error");
  }
});


export default router;
