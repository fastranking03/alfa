import express from "express";
import connect from "../../db/connect.js";
import { v4 as uuidv4 } from "uuid";
import upload from '../../uploadConfig.js'; // Adjust path as per your file structure
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
    product_info,
    Shipping_info,
    return_policy,
    product_mrp,
    product_discount,
    product_colour,
    size_xs, size_s, size_m, size_l, size_xl, size_xxl, size_xxxl, size_xxxxl,
    size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46
  } = req.body;

  const uniqueBatchId = uuidv4();


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
      req.files['image1'] ? req.files['image1'][0].filename : null,
      req.files['image2'] ? req.files['image2'][0].filename : null,
      req.files['image3'] ? req.files['image3'][0].filename : null,
      req.files['image4'] ? req.files['image4'][0].filename : null,
      req.files['image5'] ? req.files['image5'][0].filename : null
    ].filter(image => image !== null)
  };

  if (productType === 'top') {
    product.sizes = {
      xs: size_xs,
      s: size_s,
      m: size_m,
      l: size_l,
      xl: size_xl,
      xxl: size_xxl,
      xxxl: size_xxxl,
      xxxxl: size_xxxxl,
    };
  } else if (productType === 'bottom') {
    product.sizes = {
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
  }


  const insertQuery = `
    INSERT INTO products (
      category_id, subcategory_id, product_name, product_price, 
      discount_on_product, product_title, product_description, wear_type_bottom_or_top, 
      colour, unique_batch_id , product_information , shipping_information , return_policy,
      product_main_image 
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ? );
  `;

  const values = [
    category_id,
    subcategory_id,
    common_product_name,
    product_mrp,
    product_discount,
    common_product_title,
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
    await connect.query(insertQuery, values);

    // Retrieve the ID of the inserted product
    const [result] = await connect.query('SELECT id FROM products WHERE unique_batch_id = ? LIMIT 1', [uniqueBatchId]);
    const firstProductId = result.length > 0 ? result[0].id : null;

    // Insert inventory data based on productType
    if (productType === 'top') {
      const topwearInventoryQuery = `
        INSERT INTO topwear_inventory_with_sizes (
          product_id, product_name, xs, s, m, l, xl, xxl, xxxl, xxxxl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const topwearInventoryValues = [
        firstProductId,
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
        firstProductId,
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

    // Insert product images into the product_images table
    const insertImagesQuery = `
        INSERT INTO Product_Images (product_id, image_path) VALUES (?, ?)
      `;
    for (const image of product.images) {
      await connect.query(insertImagesQuery, [firstProductId, image]);
    }

    console.log("Product and inventory data inserted successfully");
    res.redirect(`/product/${firstProductId}`);

  } catch (err) {
    console.error("Error inserting product and inventory data:", err);
    res.status(500).send("Error inserting product and inventory data");
  }
});

router.get('/product/:productId', async (req, res) => {
  const productId = req.params.productId;
  try {

  } catch (error) {

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
