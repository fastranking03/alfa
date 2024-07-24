import express from "express";
import connect from "../../db/connect.js";
import { v4 as uuidv4 } from "uuid";
import upload from '../../uploadConfig.js'; // Adjust path as per your file structure

import slugify from "slugify";

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

router.get("/testing-image", (req, res) => {

  return res.render("admin/image_testing");

});

router.get("/add-product/:category_name", async (req, res) => {
  const categoryName = req.params.category_name;

  try {
    if (!connect) {
      return res.status(500).send("Database connection not established");
    }

    // Query the category based on category_name
    const [categoryResult] = await connect.query("SELECT * FROM category WHERE category_name = ?", [categoryName]);

    // Handle case where category is not found
    if (categoryResult.length === 0) {
      return res.status(404).send("Category not found");
    }

    // Extract category details
    const category = categoryResult[0];
    const weartype = category.wear_type;

    // Log the retrieved data for debugging purposes
    console.log({ weartype });

    // Render the add-product-new page with the retrieved data
    res.render("admin/add-product-new", {
      category,
      weartype,
      selectedCategory: categoryName
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error loading add-product page:", error);
    res.status(500).send("Internal Server Error: Unable to load add-product page");
  }
});


router.post("/addProducts", upload.fields([
  { name: 'product_main_image', maxCount: 1 },
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'image5', maxCount: 1 }
]), async (req, res) => {
  const {
    productType,
    category_id,
    subcategory_id,
    common_product_name,
    common_product_title,
    common_product_description,
    uuid,
    product_info,
    Shipping_info,
    return_policy,
    product_mrp,
    product_discount,
    product_colour,
    size_xs, size_s, size_m, size_l, size_xl, size_xxl, size_xxxl, size_xxxxl,
    size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46,
    size_06_uk, size_07_uk, size_08_uk, size_09_uk, size_10_uk, size_11_uk, size_12_uk, size_13_uk
  } = req.body;


  const uniqueBatchId = uuid || uuidv4();

  const product = {
    category_id,
    subcategory_id,
    product_name: common_product_name,
    product_price: product_mrp,
    discount_on_product: product_discount,
    product_title: common_product_title,
    product_description: common_product_description,
    wear_type_bottom_or_top: productType,
    colour: product_colour,
    unique_batch_id: uniqueBatchId,
    product_information: product_info,
    shipping_information: Shipping_info,
    return_policy: return_policy,
    product_main_image: req.files['product_main_image'] ? req.files['product_main_image'][0].filename : null,

    images: [
      req.files['product_main_image'] ? req.files['product_main_image'][0].filename : null,
      req.files['image1'] ? req.files['image1'][0].filename : null,
      req.files['image2'] ? req.files['image2'][0].filename : null,
      req.files['image3'] ? req.files['image3'][0].filename : null,
      req.files['image4'] ? req.files['image4'][0].filename : null,
      req.files['image5'] ? req.files['image5'][0].filename : null
    ].filter(image => image !== null)
  };


  const tile_slug = slugify(common_product_title, { lower: true, strict: true });

  const insertQuery = `
    INSERT INTO products (
      category_id, subcategory_id, product_name, product_price, 
      discount_on_product, product_title , product_title_slug , product_description, wear_type_bottom_or_top,
      colour, unique_batch_id , product_information , shipping_information , return_policy,
      product_main_image 
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ? );
  `;

  const values = [
    category_id,
    subcategory_id,
    common_product_name,
    product_mrp,
    product_discount,
    common_product_title,
    tile_slug,
    common_product_description,
    productType,
    product_colour,
    uniqueBatchId,
    product_info,
    Shipping_info,
    return_policy,
    product.product_main_image
  ];

  try {
    // Perform insertion of product
    const [insertResult] = await connect.query(insertQuery, values);

    // Retrieve the last inserted ID
    const lastInsertedId = insertResult.insertId;

    // Insert inventory data based on productType
    if (productType === 'top') {
      const topwearInventoryQuery = `
        INSERT INTO topwear_inventory_with_sizes (
          product_id, product_name, xs, s, m, l, xl, xxl, xxxl, xxxxl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const topwearInventoryValues = [
        lastInsertedId,
        common_product_name,
        size_xs,
        size_s,
        size_m,
        size_l,
        size_xl,
        size_xxl,
        size_xxxl,
        size_xxxxl,
      ];

      await connect.query(topwearInventoryQuery, topwearInventoryValues);
    } else if (productType === 'bottom') {
      const bottomwearInventoryQuery = `
        INSERT INTO bottomwear_inventory (
          product_id, product_name, size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const bottomwearInventoryValues = [
        lastInsertedId,
        common_product_name,
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
      ];

      await connect.query(bottomwearInventoryQuery, bottomwearInventoryValues);
    }
    else if (productType === 'shoes') {
      const shoes_inventory = `
    INSERT INTO shoes_inventory (
      product_id, product_name, size_6, size_7, size_8, size_9, size_10, size_11, size_12, size_13, created_at , updaetd_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() , NOW())
  `;

      const shoes_inventory_Values = [
        lastInsertedId,
        common_product_name,
        size_06_uk, size_07_uk, size_08_uk, size_09_uk, size_10_uk, size_11_uk, size_12_uk, size_13_uk
      ];

      await connect.query(shoes_inventory, shoes_inventory_Values);
    }
    else if (productType === 'belt') {
      const belts_inventory = `
    INSERT INTO belts_inventory (
      product_id, product_name, size_28, size_30, size_32, size_34, size_36, size_38, size_40, created_at , updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() , NOW())
  `;

      const belts_inventory_Values = [
        lastInsertedId,
        common_product_name,
        size_28,
        size_30,
        size_32,
        size_34,
        size_36,
        size_38,
        size_40,
      ];

      await connect.query(belts_inventory, belts_inventory_Values);
    }
    else if (productType === 'wallet') {
      const belts_inventory = `
    INSERT INTO wallet_inventory (
      product_id, product_name, s , m ,l , created_at , updated_at
    ) VALUES ( ?, ?, ?, ?, ?, NOW() , NOW() )
  `;

      const belts_inventory_Values = [
        lastInsertedId,
        common_product_name,
        size_s,
        size_m,
        size_l,
      ];

      await connect.query(belts_inventory, belts_inventory_Values);
    }



    // Insert product images into the product_images table
    const insertImagesQuery = `
        INSERT INTO Product_Images (product_id, image_path) VALUES (?, ?)
      `;
    for (const image of product.images) {
      await connect.query(insertImagesQuery, [lastInsertedId, image]);
    }

    console.log("Product and inventory data inserted successfully");
    res.redirect(`product/${lastInsertedId}`);

  } catch (err) {
    console.error("Error inserting product and inventory data:", err);
    res.status(500).send("Error inserting product and inventory data");
  }
});

router.get('/product/:productId', async (req, res) => {
  const productId = req.params.productId;
  try {
    // Fetch all related products with the same unique_batch_id
    const [productResult] = await connect.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (productResult.length === 0) {
      return res.status(404).send("Product not found");
    }
    const product = productResult[0];
    const batchId = product.unique_batch_id;
    const weartype = product.wear_type_bottom_or_top;
    const [relatedProductsResult] = await connect.query('SELECT * FROM products WHERE unique_batch_id = ?', [batchId]);

    const inventoryDetailsAndImages = await Promise.all(
      relatedProductsResult.map(async (relatedProduct) => {
        let inventory;
        if (relatedProduct.wear_type_bottom_or_top === 'top') {
          const [topwearInventory] = await connect.query('SELECT * FROM topwear_inventory_with_sizes WHERE product_id = ?', [relatedProduct.id]);
          inventory = topwearInventory.length > 0 ? topwearInventory[0] : null;
        } else if (relatedProduct.wear_type_bottom_or_top === 'bottom') {
          const [bottomwearInventory] = await connect.query('SELECT * FROM bottomwear_inventory WHERE product_id = ?', [relatedProduct.id]);
          inventory = bottomwearInventory.length > 0 ? bottomwearInventory[0] : null;
        } else if (relatedProduct.wear_type_bottom_or_top === 'shoes') {
          const [shoesInventory] = await connect.query('SELECT * FROM shoes_inventory WHERE product_id = ?', [relatedProduct.id]);
          inventory = shoesInventory.length > 0 ? shoesInventory[0] : null;
        } else if (relatedProduct.wear_type_bottom_or_top === 'belt') {
          const [beltInventory] = await connect.query('SELECT * FROM belts_inventory WHERE product_id = ?', [relatedProduct.id]);
          inventory = beltInventory.length > 0 ? beltInventory[0] : null;
        } else if (relatedProduct.wear_type_bottom_or_top === 'wallet') {
          const [walletInventory] = await connect.query('SELECT * FROM wallet_inventory WHERE product_id = ?', [relatedProduct.id]);
          inventory = walletInventory.length > 0 ? walletInventory[0] : null;
        }

        // Fetch images for the related product
        const [images] = await connect.query('SELECT image_path FROM Product_Images WHERE product_id = ?', [relatedProduct.id]);

        return {
          ...relatedProduct,
          inventory,
          images
        };
      })
    );

    res.render('admin/product-details', {
      product,
      relatedProducts: inventoryDetailsAndImages,
      weartype

    });

  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).send("Error fetching product details");
  }
});

router.post('/product-update', upload.any(), async (req, res) => {
  const { related_product_id, product_type } = req.body;
  let updateInventoryQuery;
  let inventoryValues;

  try {
    if (product_type === "top") {
      updateInventoryQuery = `
        UPDATE topwear_inventory_with_sizes
        SET
            xs = ?, s = ?, m = ?, l = ?, xl = ?, xxl = ?, xxxl = ?, xxxxl = ?
        WHERE product_id = ?;
      `;
      inventoryValues = [
        req.body.xs, req.body.s, req.body.m, req.body.l, req.body.xl,
        req.body.xxl, req.body.xxxl, req.body.xxxxl, related_product_id
      ];
    } else if (product_type === "bottom") {
      updateInventoryQuery = `
        UPDATE bottom_wear_inventory_with_sizes
        SET size_28 = ?, size_30 = ?, size_32 = ?, size_34 = ?, size_36 = ?, 
            size_38 = ?, size_40 = ?, size_42 = ?, size_44 = ?, size_46 = ?
        WHERE product_id = ?;
      `;
      inventoryValues = [
        req.body.size_28, req.body.size_30, req.body.size_32, req.body.size_34, req.body.size_36,
        req.body.size_38, req.body.size_40, req.body.size_42, req.body.size_44, req.body.size_46, related_product_id
      ];
    } else if (product_type === "shoes") {
      updateInventoryQuery = `
        UPDATE shoes_inventory
        SET size_6 = ?, size_7 = ?, size_8 = ?, size_9 = ?, size_10 = ?, 
            size_11 = ?, size_12 = ?, size_13 = ? 
        WHERE product_id = ?;
      `;
      inventoryValues = [
        req.body.size_06_uk, req.body.size_07_uk, req.body.size_08_uk, req.body.size_09_uk, req.body.size_10_uk,
        req.body.size_11_uk, req.body.size_12_uk, req.body.size_13_uk, related_product_id
      ];
    } else if (product_type === "belt") {
      updateInventoryQuery = `
        UPDATE belts_inventory
        SET s = ?, m = ?, l = ?, xl = ?, 2xl = ?,
            3xl = ? 
        WHERE product_id = ?;
      `;
      inventoryValues = [
        req.body.size_s, req.body.size_m, req.body.size_l, req.body.size_xl, req.body.size_2xl, req.body.size_3xl,
        related_product_id
      ];
    } else if (product_type === "wallet") {
      updateInventoryQuery = `
        UPDATE wallet_inventory
        SET s = ?, m = ?, l = ? 
        WHERE product_id = ?;
      `;
      inventoryValues = [
        req.body.size_s, req.body.size_m, req.body.size_l, related_product_id
      ];
    }

    await connect.query(updateInventoryQuery, inventoryValues);

    res.redirect(`product/${related_product_id}`);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).send('Internal Server Error');
  }
});

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
