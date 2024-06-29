import express from "express";
import pool from "../../db/connect.js";
const router = express.Router();
import multer from "multer";

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'product_images/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

router.get("/add-test", async (req, res) => {
    try {
        const [categories] = await pool.query("SELECT * FROM category");
        const [subcategories] = await pool.query("SELECT * FROM sub_category");

        res.render("admin/add-test", { categories, subcategories });
    } catch (error) {
        console.error("Error loading add-product page:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/add-test', upload.fields([
    { name: 'product_main_image[]', maxCount: 1 },
    { name: 'image1[]', maxCount: 1 },
    { name: 'image2[]', maxCount: 1 },
    { name: 'image3[]', maxCount: 1 },
    { name: 'image4[]', maxCount: 1 },
    { name: 'image5[]', maxCount: 1 }
]), async (req, res) => {
    try {
        const { wear_type_bottom_or_top, category_id, product_name, product_title, product_price, discount_on_product, product_description, product_information, shipping_information, return_policy, colour } = req.body;
        
        const connection = await pool.getConnection();

        await connection.beginTransaction();

        // Get the main image path
        const productMainImage = req.files['product_main_image[]'] ? req.files['product_main_image[]'][0].path : null;

        if (!productMainImage) {
            throw new Error('Main product image is required.');
        }

        // Insert product information
        const [productResult] = await connection.query(
            'INSERT INTO products (wear_type_bottom_or_top, category_id, product_name, product_title, product_price, discount_on_product, product_description, product_information, shipping_information, return_policy, colour, product_main_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [wear_type_bottom_or_top, category_id, product_name, product_title, product_price, discount_on_product, product_description, product_information, shipping_information, return_policy, colour, productMainImage]
        );

        const productId = productResult.insertId;

        // Insert sizes into the appropriate table
        if (wear_type_bottom_or_top === 'Top') {
            await connection.query(
                'INSERT INTO topwear_inventory_with_sizes (product_id, xs, s, m, l, xl, xxl, xxxl, xxxxl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [productId, req.body.size_xs, req.body.size_s, req.body.size_m, req.body.size_l, req.body.size_xl, req.body.size_xxl, req.body.size_xxxl, req.body.size_xxxxl]
            );
        } else if (wear_type_bottom_or_top === 'Bottom') {
            await connection.query(
                'INSERT INTO bottom_wear_inventory_with_sizes (product_id, size_28, size_30, size_32, size_34, size_36, size_38, size_40, size_42, size_44, size_46) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [productId, req.body.size_28, req.body.size_30, req.body.size_32, req.body.size_34, req.body.size_36, req.body.size_38, req.body.size_40, req.body.size_42, req.body.size_44, req.body.size_46]
            );
        }

        // Prepare image paths
        const imagePaths = [
            req.files['image1[]'] ? req.files['image1[]'][0].path : "",
            req.files['image2[]'] ? req.files['image2[]'][0].path : "",
            req.files['image3[]'] ? req.files['image3[]'][0].path : "",
            req.files['image4[]'] ? req.files['image4[]'][0].path : "",
            req.files['image5[]'] ? req.files['image5[]'][0].path : ""
        ];
        // Insert images
        await connection.query(
            'INSERT INTO Product_Images (product_id, image1, image2, image3, image4, image5) VALUES (?, ?, ?, ?, ?, ?)',
            [productId, ...imagePaths]
        );

        await connection.commit();
        connection.release();

        res.status(200).send('Product added successfully');
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).send('Internal Server Error');
    }
});

 
router.get("/add-new-test", (req,res) =>{
    return res.render("admin/add-new-test")
})

router.post('/add-new-test', upload.array('product_main_image', 5), (req, res) => {
    try {
        // Process form data and uploaded files
        const products = req.body.product_name.map((name, index) => ([
            name,
            req.body.product_price[index],
            req.body.discount_on_product[index],
            req.body.product_description[index],
            req.files[index].filename
        ]));

        // Insert products into MySQL database
        const sql = 'INSERT INTO test_product (product_name, product_price,discount_on_product, product_description, product_main_image) VALUES ?';
        pool.query(sql, [products], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error adding products');
            }
            console.log('Number of records inserted: ' + result);
            return res.render('Products added successfully');
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding products');
    }
});
 
export default router;
