import express from "express";
import connect from "../../db/connect.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

router.get("/add-product", async (req, res) => {
  try {
    const [categories] = await connect.query("SELECT * FROM category");
    const [subcategories] = await connect.query("SELECT * FROM sub_category");
    const weartype = "top";

    res.render("admin/add-product-new", {
      categories,
      subcategories,
      weartype,
    });
  } catch (error) {
    console.error("Error loading add-product page:", error);
    res.status(500).send("Internal Server Error");
  }
});



router.post("/addProducts", async (req, res) => {
  const {
    productType,
    category_id,
    subcategory_id,
    common_product_name,
    common_product_title,
    common_product_description,
  } = req.body;

  const uniqueBatchId = uuidv4();

  const products = req.body.product_mrp.map((mrp, index) => {
    const product = {
      mrp,
      discount: req.body.product_discount[index],
      colour: req.body.product_colour[index],
      image_url: req.body.product_image[index],
    };

    if (productType === "top") {
      product.sizes = {
        xs: req.body.size_xs[index],
        s: req.body.size_s[index],
        m: req.body.size_m[index],
        l: req.body.size_l[index],
        xl: req.body.size_xl[index],
        xxl: req.body.size_xxl[index],
        xxxl: req.body.size_xxxl[index],
        xxxxl: req.body.size_xxxxl[index],
      };
    } else if (productType === "bottom") {
      product.sizes = {
        size_28: req.body.size_28[index],
        size_30: req.body.size_30[index],
        size_32: req.body.size_32[index],
        size_34: req.body.size_34[index],
        size_36: req.body.size_36[index],
        size_38: req.body.size_38[index],
        size_40: req.body.size_40[index],
        size_42: req.body.size_42[index],
        size_44: req.body.size_44[index],
        size_46: req.body.size_46[index],
      };
    }

    return product;
  });

  const insertQuery = `
    INSERT INTO products (
      category_id, subcategory_id, product_name, product_price, 
      discount_on_product, product_title, product_description, wear_type_bottom_or_top, 
      colour, unique_batch_id 
    ) 
    VALUES ?;
  `;

  const values = products.map((product) => [
    category_id,
    subcategory_id,
    common_product_name,
    product.mrp,
    product.discount,
    common_product_title,
    common_product_description,
    productType,
    product.colour,
    uniqueBatchId,
  ]);

  try {
    // Perform insertion of products
    await connect.query(insertQuery, [values]);

    // Retrieve the IDs of the inserted products
     // Retrieve all inserted product IDs
     const [result] = await connect.query('SELECT id FROM products WHERE unique_batch_id = ? LIMIT 1', [uniqueBatchId]);
     const firstProductId = result.length > 0 ? result[0].id : null;
     console.log(firstProductId);
     

    // Prepare to insert inventory data based on productType
    if (productType === "top") {
      // Prepare topwear inventory insertion query
      const topwearInventoryQuery = `
        INSERT INTO topwear_inventory_with_sizes (
          product_id, product_name, xs, s, m, l, xl, xxl, xxxl, xxxxl
        ) VALUES ?
      `;

      // Map productIds and inventory values for topwear
      const topwearInventoryValues = products.map((product, index) => [
        firstProductId + index,
        common_product_name,
        product.sizes?.xs || null,
        product.sizes?.s || null,
        product.sizes?.m || null,
        product.sizes?.l || null,
        product.sizes?.xl || null,
        product.sizes?.xxl || null,
        product.sizes?.xxxl || null,
        product.sizes?.xxxxl || null,
      ]);

      // Insert topwear inventory data
      await connect.query(topwearInventoryQuery, [topwearInventoryValues]);
    } else if (productType === "bottom") {
      // Prepare bottomwear inventory insertion query
      const bottomwearInventoryQuery = `
        INSERT INTO bottomwear_inventory (
          product_id, product_name, size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46
        ) VALUES ?
      `;

      // Map productIds and inventory values for bottomwear
      const bottomwearInventoryValues = products.slice(0, productCount).map((product, index) => [
        firstProductId + index,
        common_product_name,
        product.sizes?.size_28 || null,
        product.sizes?.size_30 || null,
        product.sizes?.size_32 || null,
        product.sizes?.size_34 || null,
        product.sizes?.size_36 || null,
        product.sizes?.size_38 || null,
        product.sizes?.size_40 || null,
        product.sizes?.size_42 || null,
        product.sizes?.size_44 || null,
        product.sizes?.size_46 || null,
      ]);

      // Insert bottomwear inventory data
      await connect.query(bottomwearInventoryQuery, [bottomwearInventoryValues]);
    }

    console.log("Products and inventory data inserted successfully");
    res.redirect("add-product");
  } catch (err) {
    console.error("Error inserting products and inventory data:", err);
    res.status(500).send("Error inserting products and inventory data");
  }
});


// router.post("/addProducts", async (req, res) => {
//   const {
//     productType,
//     category_id,
//     subcategory_id,
//     common_product_name,
//     common_product_title,
//     common_product_description,
//   } = req.body;

//   const uniqueBatchId = uuidv4();

//   const products = req.body.product_mrp.map((mrp, index) => {
//     const product = {
//       mrp,
//       discount: req.body.product_discount[index],
//       colour: req.body.product_colour[index],
//       image_url: req.body.product_image[index],
//     };

//     if (productType === "top") {
//       product.sizes = {
//         xs: req.body.size_xs[index],
//         s: req.body.size_s[index],
//         m: req.body.size_m[index],
//         l: req.body.size_l[index],
//         xl: req.body.size_xl[index],
//         xxl: req.body.size_xxl[index],
//         xxxl: req.body.size_xxxl[index],
//         xxxxl: req.body.size_xxxxl[index],
//       };
//     } else if (productType === "bottom") {
//       product.sizes = {
//         size_28: req.body.size_28[index],
//         size_30: req.body.size_30[index],
//         size_32: req.body.size_32[index],
//         size_34: req.body.size_34[index],
//         size_36: req.body.size_36[index],
//         size_38: req.body.size_38[index],
//         size_40: req.body.size_40[index],
//         size_42: req.body.size_42[index],
//         size_44: req.body.size_44[index],
//         size_46: req.body.size_46[index],
//       };
//     }
 
//     return product;
//   });

//   const insertQuery = `
//     INSERT INTO products (
//       category_id, subcategory_id, product_name, product_price, 
//       discount_on_product, product_title, product_description, wear_type_bottom_or_top, 
//       colour, unique_batch_id 
//     ) 
//     VALUES ?;
//   `;

//   const values = products.map((product) => [
//     category_id,
//     subcategory_id,
//     common_product_name,
//     product.mrp,
//     product.discount,
//     common_product_title,
//     common_product_description,
//     productType,
//     product.colour,
//     uniqueBatchId,
//   ]);


//   try {
//     // Perform insertion of products
//     await connect.query(insertQuery, [values]);

//     // Retrieve the IDs of the inserted products
//     const [result] = await connect.query('SELECT LAST_INSERT_ID() as firstProductId, COUNT(*) as productCount FROM products');
//     const { firstProductId, productCount } = result;

//     // Prepare to insert inventory data based on productType
//     if (productType === "top") {
//       // Prepare topwear inventory insertion query
//       const topwearInventoryQuery = `
//         INSERT INTO topwear_inventory_with_sizes ( product_id, product_name, xs, s, m, l, xl, xxl, xxxl, xxxxl ) VALUES ?
//       `;

//       // Map productIds and inventory values for topwear
//       const topwearInventoryValues = Array.from({ length: productCount }, (_, index) => {
//         const productId = firstProductId + index;
//         return [
//           productId,
//           common_product_name, 
//           products[index].sizes?.xs || null, // Handle potential undefined sizes
//           products[index].sizes?.s || null,
//           products[index].sizes?.m || null,
//           products[index].sizes?.l || null,
//           products[index].sizes?.xl || null,
//           products[index].sizes?.xxl || null,
//           products[index].sizes?.xxxl || null,
//           products[index].sizes?.xxxxl || null,
//         ];
//       });

//       // Insert topwear inventory data
//       await connect.query(topwearInventoryQuery, [topwearInventoryValues]);
//     } else if (productType === "bottom") {
//       // Prepare bottomwear inventory insertion query
//       const bottomwearInventoryQuery = `
//         INSERT INTO bottomwear_inventory ( product_id, product_name, size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46
//         ) VALUES ?
//       `;

//       // Map productIds and inventory values for bottomwear
//       const bottomwearInventoryValues = Array.from({ length: productCount }, (_, index) => {
//         const productId = firstProductId + index;
//         return [
//           productId,
//           common_product_name, 
//           products[index].sizes?.size_28 || null,  
//           products[index].sizes?.size_30 || null,
//           products[index].sizes?.size_32 || null,
//           products[index].sizes?.size_34 || null,
//           products[index].sizes?.size_36 || null,
//           products[index].sizes?.size_38 || null,
//           products[index].sizes?.size_40 || null,
//           products[index].sizes?.size_42 || null,
//           products[index].sizes?.size_44 || null,
//           products[index].sizes?.size_46 || null,
//         ];
//       });

//       // Insert bottomwear inventory data
//       await connect.query(bottomwearInventoryQuery, [bottomwearInventoryValues]);
//     }

//     console.log("Products and inventory data inserted successfully");
//     res.redirect("admin/add-product");
//   } catch (err) {
//     console.error("Error inserting products and inventory data:", err);
//     res.status(500).send("Error inserting products and inventory data");
//   }
// });

router.post("/addProductnewvarients", async (req, res) => {
  const [name, description, title] = req.body();
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

    await connect.query(
      "UPDATE products SET product_name = ?, product_price = ?, discount_on_product = ?, product_title = ?, product_description = ?, category_id = ?, subcategory_id = ?, wear_type_bottom_or_top = ? WHERE id = ?",
      [
        product_name,
        product_price,
        discount_on_product,
        product_title,
        product_description,
        category_id,
        subcategory_id,
        wear_type_bottom_or_top,
        productId,
      ]
    );

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
