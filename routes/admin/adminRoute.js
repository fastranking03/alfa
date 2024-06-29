import express from 'express';
import connect from '../../db/connect.js'; // Adjust path as per your file structure
import upload from '../../uploadConfig.js'; // Adjust path as per your file structure
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Function to delete all files in a directory
const deleteFilesInDirectory = (directory) => {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach(file => {
      const filePath = path.join(directory, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    });
  } else {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Route to update "About Us" content
router.post("/update-about-us", upload.fields([
  { name: 'mission_image', maxCount: 1 },
  { name: 'expertise1_image', maxCount: 1 },
  { name: 'expertise2_image', maxCount: 1 },
  { name: 'expertise3_image', maxCount: 1 },
  { name: 'ceo_image', maxCount: 1 },
]), async (req, res) => {
  try {
    // Extract form data
    const {
      mission_title,
      mission_description,
      expertise1_title,
      expertise1_description,
      expertise2_title,
      expertise2_description,
      expertise3_title,
      expertise3_description,
      ceo_title,
      ceo_description
    } = req.body;

    // Get current images from the database
    const [currentData] = await connect.query('SELECT mission_image, expertise1_image, expertise2_image, expertise3_image, ceo_image FROM about_us_content WHERE id = 1');

    // Initialize variables to hold updated filenames
    let mission_image_update = currentData[0].mission_image;
    let expertise1_image_update = currentData[0].expertise1_image;
    let expertise2_image_update = currentData[0].expertise2_image;
    let expertise3_image_update = currentData[0].expertise3_image;
    let ceo_image_update = currentData[0].ceo_image;

    // Check if files were uploaded and update variables accordingly
    if (req.files['mission_image'] && req.files['mission_image'][0]) {
      mission_image_update = req.files['mission_image'][0].filename;
    }
    if (req.files['expertise1_image'] && req.files['expertise1_image'][0]) {
      expertise1_image_update = req.files['expertise1_image'][0].filename;
    }
    if (req.files['expertise2_image'] && req.files['expertise2_image'][0]) {
      expertise2_image_update = req.files['expertise2_image'][0].filename;
    }
    if (req.files['expertise3_image'] && req.files['expertise3_image'][0]) {
      expertise3_image_update = req.files['expertise3_image'][0].filename;
    }
    if (req.files['ceo_image'] && req.files['ceo_image'][0]) {
      ceo_image_update = req.files['ceo_image'][0].filename;
    }

    // Update query
    const updateQuery = `
      UPDATE about_us_content SET 
        our_mission_title = ?, our_mission_description = ?, 
        expertise1_title = ?, expertise1_description = ?, 
        expertise2_title = ?, expertise2_description = ?, 
        expertise3_title = ?, expertise3_description = ?, 
        ceo_title = ?, ceo_description = ?, 
        mission_image = ?, expertise1_image = ?, expertise2_image = ?, expertise3_image = ?, ceo_image = ? 
      WHERE id = 1;
    `;

    const values = [
      mission_title,
      mission_description,
      expertise1_title,
      expertise1_description,
      expertise2_title,
      expertise2_description,
      expertise3_title,
      expertise3_description,
      ceo_title,
      ceo_description,
      mission_image_update,
      expertise1_image_update,
      expertise2_image_update,
      expertise3_image_update,
      ceo_image_update
    ];
    
    await connect.query(updateQuery, values);
    console.log("About Us data updated successfully");
    res.redirect("/admin/about-content");
  } catch (error) {
    console.error("Error updating About Us data:", error);
    res.status(500).send("Error updating About Us data");
  }
});

router.get("/products", async (req, res) => {
  try {
    // Query all products from the database along with their category and subcategory information
    const query = `
            SELECT 
                products.*, 
                category.category_name AS category_name, 
                sub_category.sub_category_name AS subcategory_name 
            FROM 
                products 
            LEFT JOIN 
                category ON products.category_id = category.id 
            LEFT JOIN 
            sub_category ON products.subcategory_id = sub_category.id`;

    // Execute the query
    const [rows, fields] = await connect.query(query);

    // Render the view with the fetched products
    res.render("admin/products", { products: rows });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/users-list", async (req, res) => {
  try {
    const [users] = await connect.query("SELECT * FROM user_registration");
    res.render("admin/users-list", { users });
  } catch (error) { }
});

// Function to fetch user wishlist from the database along with product details
const fetchFavourites = async (userId) => {
  try {
    // Perform a database query to fetch user wishlist based on userId
    const FavouritesQuery = `
      SELECT 
      users_favorites.*, 
      products.*, 
      category.* ,
      sub_category.*
    FROM 
      users_favorites 
      INNER JOIN products ON users_favorites.product_id = products.id
      INNER JOIN category ON products.category_id = category.id
      INNER JOIN sub_category ON products.subcategory_id = sub_category.id
    WHERE 
      users_favorites.user_id = ?
      `;
    const [Favourites] = await connect.query(FavouritesQuery, [userId]);
    return Favourites;
  } catch (error) {
    // Handle errors
    console.error("Error fetching user wishlist:", error);
    return [];
  }
};

// Function to fetch user cart data from the database along with product details
const fetchUserCartData = async (userId) => {
  try {
    // Perform a database query to fetch user cart data based on userId
    const cartQuery = `
        SELECT users_cart.* ,
        products.*, 
        category.* ,
        sub_category.*
        FROM 
        users_cart 
        INNER JOIN products ON users_cart.product_id = products.id
        INNER JOIN category ON products.category_id = category.id
        INNER JOIN sub_category ON products.subcategory_id = sub_category.id

        WHERE users_cart.user_id = ?
      `;
    const [cartData] = await connect.query(cartQuery, [userId]);
    return cartData;
  } catch (error) {
    // Handle errors
    console.error("Error fetching user cart data:", error);
    return [];
  }
};

// Assuming you have Express router setup
router.get("/user-detailed-view/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const userDataQuery = "SELECT * FROM user_registration WHERE id = ?";
    const [userData] = await connect.query(userDataQuery, [userId]);

    // Fetch user wishlist and add to cart data from the database
    const Favourites = await fetchFavourites(userId);
    const userCartData = await fetchUserCartData(userId);

    // Render the appropriate view with user detailed information, wishlist, and cart data
    res.render("admin/user-detailed-view", {
      userId: userId,
      userData: userData[0],
      userFavourites: Favourites,
      cartData: userCartData,
    });
  } catch (error) {
    // Handle errors
    console.error("Error fetching user data:", error);
    res.status(500).send("An error occurred while fetching user data");
  }
});


// Static Routes
router.get('/orders', async (req, res) => {
  try {
    const [order_list] = await connect.query(`
       SELECT 
        o.*, 
        ua.name, 
        ua.email ,
        ua.phone, 
        ua.pincode, 
        ua.created_at,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) AS item_count
        FROM orders o 
        JOIN user_address ua ON o.address_id = ua.id
    `);

    return res.render('admin/orders', { orders: order_list });
  } catch (error) {
    console.error("Error loading orders:", error);
    return res.status(500).send("Internal Server Error");
  }
});


router.get('/order-details', (req, res) => {
  res.render("admin/order-details");
});

router.get("/order-details/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const [orderReows] = await connect.query(
      "SELECT * FROM orders WHERE order_id = ? ",
      [orderId]
    );

    const [orderRows] = await connect.query(
      `SELECT o.*, ua.name AS user_name,ua.full_address AS address, ua.locality AS locality, ua.country AS country, ua.state AS state,ua.city AS city,  ua.email AS email , ua.phone AS user_phone, ua.pincode AS user_pincode, ua.created_at AS address_created_at
       FROM orders o
       JOIN user_address ua ON o.address_id = ua.id
       WHERE o.order_id = ?`,
      [orderId]
    );


    if (orderRows.length > 0) {
      const order = orderRows[0];

      // Fetch items for the order
      const [orderItems] = await connect.query(
        `SELECT oi.*, p.product_name, p.product_main_image
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );

      const formattedDateTime = new Date(order.created_at).toLocaleString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Render the order details page
      res.render("admin/order-details", { order, orderItems, formattedDateTime });
    } else {
      res.status(404).send("Order not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
router.get('/', (req, res) => {
  res.render("admin/index");
});


router.get('/add-new-varient', (req, res) => {
  res.render("admin/add-new-varient");
});


router.get('/varients', async (req, res) => {
  try {
    const [variants] = await connect.query('SELECT * FROM varients');
    res.render('admin/varient', { variants });
  } catch (err) {
    console.error('Error fetching variants:', err);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/add-product-in/:variant_name', async (req, res) => {
  const { variant_name } = req.params;

  try {
    const [products_in_varient] = await connect.query(
      'SELECT * FROM products WHERE varient_name = ?',
      [variant_name]
    );

    const [all_products] = await connect.query(
      'SELECT * FROM products'
    );

    res.render('admin/add-products-in-varient', { products_in_varient, variant_name, all_products });
  } catch (err) {
    console.error('Error fetching products for variant:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/add-product-in-varient', async (req, res) => {
  try {
    const { selectedProducts, variantName } = req.body;
    console.log(selectedProducts);
    console.log(variantName);

    // Handle selectedProducts array which contains IDs of products to be updated in variant
    if (!selectedProducts || !Array.isArray(selectedProducts)) {
      return res.status(400).send('Invalid selected products data');
    }

    // Example of updating products with the specified variantName in your database
    const promises = selectedProducts.map(productId => {
      // Perform your database operations to update each product's variant
      return connect.query(
        'UPDATE products SET varient_name = ? WHERE  id = ?',
        [variantName, productId]
      );
    });

    await Promise.all(promises);

    res.redirect('/admin/varients'); // Redirect back to the variants page or wherever you need to go
  } catch (err) {
    console.error('Error updating products in variant:', err);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add-varient', async (req, res) => {
  try {
    const { varient_name } = req.body;

    // Validate input (ensure varient_name is not empty)
    if (!varient_name) {
      return res.status(400).send('Variant name is required');
    }

    // Perform database insertion
    const insertQuery = 'INSERT INTO varients (varient_name) VALUES (?)';
    const [insertResult] = await connect.query(insertQuery, [varient_name]);

    // Check if insertion was successful
    if (insertResult && insertResult.affectedRows > 0) {
      console.log(`New variant '${varient_name}' added successfully`);
      res.redirect('/admin/varients'); // Redirect to variants page or wherever appropriate
    } else {
      throw new Error('Failed to add new variant');
    }
  } catch (error) {
    console.error('Error adding new variant:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/staff-users', (req,res) =>{
   return res.render("admin/staff-users");
})


router.get('/add-staff', (req,res) =>{
  return res.render("admin/add-staff");
})


export default router;
